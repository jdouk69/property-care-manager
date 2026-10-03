// Server-side anniversary billing creation — charge + linked Draft invoice,
// concurrency-safe. Used by the scheduled generateRecurringCharges workflow and
// by agreementActivate (first-period billing at activation).
//
// Uniqueness (server-enforced, safe under concurrent runs):
// - One charge per agreement + service period: matched by source_key
//   (agreement:<id>:<period_start>); after every write the key is re-queried
//   and any concurrent duplicate is removed (the earliest wins).
// - One active invoice per charge: matched by charge_ids; duplicates removed
//   the same way (unpaid Drafts — nothing is ever lost).
// - Invoice numbers reuse the existing shared numbering (INV-<year>-NNN) with
//   the same post-write collision verification as createInvoice.
//
// Draft invoices are NEVER emailed and never finalize themselves — Finalize
// and Send remain staff actions in the Invoices page.

import { nextInvoiceNumber, isActiveInvoice } from './invoiceNumbering.js';
import { addDays } from './servicePeriods.js';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const listChargesByKey = async (base44, sourceKey) => {
  try {
    return (await base44.asServiceRole.entities.BillingCharge.filter({ source_key: sourceKey }, '-created_date', 10)) || [];
  } catch (e) {
    return [];
  }
};

const listInvoices = async (base44) => {
  try {
    return (await base44.asServiceRole.entities.Invoice.list('-created_date', 1000)) || [];
  } catch (e) {
    return [];
  }
};

const invoicesContainingCharge = (invoices, chargeId) =>
  (invoices || []).filter((i) => isActiveInvoice(i) && Array.isArray(i.charge_ids) && i.charge_ids.includes(chargeId));

/**
 * Create the period's BillingCharge unless one already exists for the same
 * source_key. Concurrent duplicates are removed after the write (earliest wins).
 * @returns {{ charge: Object, created: boolean }}
 */
export async function ensureChargeForPeriod(base44, fields) {
  const sourceKey = String(fields.source_key || '');
  if (!sourceKey) throw new Error('Charge source_key is required');

  const existing = await listChargesByKey(base44, sourceKey);
  if (existing.length) return { charge: existing[existing.length - 1], created: false }; // earliest wins

  let charge = null;
  try {
    charge = await base44.asServiceRole.entities.BillingCharge.create(fields);
  } catch (e) {
    const again = await listChargesByKey(base44, sourceKey);
    if (again.length) return { charge: again[again.length - 1], created: false };
    throw e;
  }

  // Post-write uniqueness: a concurrent run may have created the same period.
  const all = await listChargesByKey(base44, sourceKey);
  if (all.length > 1) {
    const keep = all[all.length - 1]; // '-created_date' desc → last = earliest
    for (const dup of all) {
      if (dup.id !== keep.id) await base44.asServiceRole.entities.BillingCharge.delete(dup.id).catch(() => {});
    }
    return { charge: keep, created: keep.id === charge.id };
  }
  return { charge, created: true };
}

/**
 * Create the linked Draft invoice for a new charge unless an active invoice
 * already contains it. Net-14 due date, VAT from BusinessSettings, frozen at
 * creation — same rules the staff review flow uses. Never emailed.
 * @returns {{ invoice: Object|null, created: boolean }}
 */
export async function ensureDraftInvoiceForCharge(base44, charge, agreement) {
  const invoices = await listInvoices(base44);
  const existing = invoicesContainingCharge(invoices, charge.id)[0];
  if (existing) return { invoice: existing, created: false };

  const settings = ((await base44.asServiceRole.entities.BusinessSettings.list('-created_date', 1).catch(() => [])) || [])[0] || {};
  const rate = Number(settings.vat_rate);
  const vatRate = Number.isFinite(rate) && rate > 0 ? rate : 24;
  const subtotal = round2(Number(charge.amount) || 0);
  const vat = round2((subtotal * vatRate) / 100);
  const total = round2(subtotal + vat);
  const description = charge.description || 'Service';
  const invoiceDate = String(charge.billing_date || '').slice(0, 10);
  const year = Number(invoiceDate.slice(0, 4)) || new Date().getFullYear();

  const record = {
    invoice_number: '',
    client_id: charge.client_id || (agreement && agreement.client_id) || '',
    property_id: charge.property_id || (agreement && agreement.property_id) || '',
    property_service_agreement_id: (agreement && agreement.id) || charge.property_service_agreement_id || '',
    billing_period: String(charge.billing_period || '').slice(0, 7),
    line_items: [{ description, amount: subtotal }],
    charge_ids: [charge.id],
    invoice_date: invoiceDate,
    due_date: addDays(invoiceDate, 14),
    services: `${description} - €${subtotal.toFixed(2)}`,
    vat,
    total,
    amount_paid: 0,
    status: 'Draft', // stays a Draft — nothing is sent automatically
    notes: '',
  };

  let created = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await listInvoices(base44);
    const others = current.filter((i) => !created || i.id !== created.id);
    const number = nextInvoiceNumber(others, year);
    record.invoice_number = number;
    created = !created
      ? await base44.asServiceRole.entities.Invoice.create(record)
      : await base44.asServiceRole.entities.Invoice.update(created.id, { invoice_number: number });
    const dupes = (await listInvoices(base44)).filter((i) => i.invoice_number === number);
    if (dupes.length === 1) break;
    record.invoice_number = ''; // collision — take the next free number
  }

  // Post-write uniqueness: a concurrent run may have invoiced the same charge.
  const after = invoicesContainingCharge(await listInvoices(base44), charge.id);
  if (after.length > 1) {
    const keep = after[after.length - 1]; // earliest wins
    for (const dup of after) {
      if (dup.id !== keep.id) await base44.asServiceRole.entities.Invoice.delete(dup.id).catch(() => {});
    }
    return { invoice: keep, created: keep.id === (created && created.id) };
  }
  return { invoice: created, created: true };
}