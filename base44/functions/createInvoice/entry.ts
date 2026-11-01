// Concurrency-safe invoice creation. The invoice number (INV-<year>-NNN) is
// THE single permanent payment reference customers use with their payment —
// it appears on the PDF and in the email, and no second reference is issued.
//
// Numbering scans every existing invoice (any status, archived included) so a
// number is never reused. Because two staff members could create invoices at
// the same moment, each creation is verified after the write: if another
// invoice now holds the same number, ours is moved to the next free number
// and re-verified (bounded retries). Invoice stays a Draft — nothing is sent
// and nothing is marked paid here.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { nextInvoiceNumber } from '../../shared/invoiceNumbering.js';
import { priceLinkedInvoice } from '../../shared/invoiceChargePricing.js';
import { validateInvoiceDraft } from '../../shared/invoiceValidation.js';

async function listInvoices(base44) {
  return (await base44.asServiceRole.entities.Invoice.list("-created_date", 1000)) || [];
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden — admin only" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    if (body.action === 'recalculateDraft') {
      const old = await base44.asServiceRole.entities.Invoice.get(body.invoice_id);
      if (old.status !== 'Draft' || old.finalized_at || old.sent_at || Number(old.amount_paid) > 0 || (old.payments || []).length) {
        return Response.json({ error: 'Only an unissued, unpaid draft can be recalculated.' }, {status:409});
      }
      if (old.total !== body.expected_total) return Response.json({error:'Invoice changed. Refresh and review it again.'},{status:409});
      const pricing = await priceLinkedInvoice(base44, old);
      if (!pricing) return Response.json({error:'This invoice has no linked charges to recalculate.'},{status:400});
      const validationError = validateInvoiceDraft({...old,...pricing});
      if (validationError) return Response.json({error:validationError},{status:400});
      const history = [...(old.vat_correction_history || []), {at:new Date().toISOString(), by:user.id || user.email,
        reason:'Recalculated from linked charges and frozen agreement VAT terms', before:{line_items:old.line_items,vat:old.vat,total:old.total}, after:pricing}];
      const fresh = await base44.asServiceRole.entities.Invoice.get(old.id);
      if (fresh.status !== 'Draft' || fresh.finalized_at || fresh.sent_at || fresh.updated_date !== old.updated_date) return Response.json({error:'Invoice changed. Refresh and review it again.'},{status:409});
      const record = await base44.asServiceRole.entities.Invoice.update(old.id,{...pricing,services:pricing.line_items.map(line=>`${line.description} - €${line.amount.toFixed(2)}`).join('\n'),vat_correction_history:history});
      return Response.json({ok:true,record});
    }
    const record = body.record || {};
    if(record.charge_ids?.length){const existing=(await listInvoices(base44)).find(i=>!i.archived&&i.status!=='Cancelled'&&i.charge_ids?.some(id=>record.charge_ids.includes(id)));if(existing){if(existing.charge_ids.length===record.charge_ids.length&&existing.charge_ids.every(id=>record.charge_ids.includes(id)))return Response.json({ok:true,record:existing,number:existing.invoice_number,already_exists:true});return Response.json({error:'Some charges already belong to another invoice.'},{status:409});}}
    const pricing = await priceLinkedInvoice(base44, record);
    if (pricing) Object.assign(record, pricing);
    if (!Array.isArray(record.line_items) || record.line_items.length === 0) {
      return Response.json({ error: "An invoice needs at least one line item" }, { status: 400 });
    }
    if (!record.client_id) {
      return Response.json({ error: "A client is required" }, { status: 400 });
    }
    // Reject invalid billing dates and non-finite / invalid monetary amounts
    // before any invoice record is written.
    const validationError = validateInvoiceDraft(record);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }
    // Lifecycle is fixed here: always created as an unpaid Draft.
    record.status = "Draft";
    record.amount_paid = Number(record.amount_paid) || 0;
    const year = Number(String(record.invoice_date || "").slice(0, 4)) || new Date().getFullYear();

    let created = null;
    let requestedNumber = String(record.invoice_number || "").trim();
    let finalNumber = requestedNumber;

    for (let attempt = 0; attempt < 5; attempt++) {
      const invoices = await listInvoices(base44);
      const others = invoices.filter((i) => !created || i.id !== created.id);
      const taken = new Set(others.map((i) => String(i.invoice_number || "")).filter(Boolean));
      let number = String(record.invoice_number || "").trim();
      if (!number || taken.has(number)) {
        number = nextInvoiceNumber(invoices, year);
      }
      if (!created) {
        record.invoice_number = number;
        created = await base44.asServiceRole.entities.Invoice.create(record);
      } else {
        created = await base44.asServiceRole.entities.Invoice.update(created.id, { invoice_number: number });
      }
      finalNumber = number;
      // Post-write verification: exactly one invoice may hold this number.
      const dupes = (await listInvoices(base44)).filter((i) => i.invoice_number === number);
      if (dupes.length === 1) {
        return Response.json({
          ok: true,
          record: created,
          number: finalNumber,
          adjusted: !!requestedNumber && finalNumber !== requestedNumber,
        });
      }
      // Collision — release our claim and take the next free number.
      record.invoice_number = "";
    }
    return Response.json({ error: "Could not allocate a unique invoice number — please try again" }, { status: 500 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}