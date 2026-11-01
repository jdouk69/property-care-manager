import { invoiceAmounts } from './invoiceVat.js';
export async function priceLinkedInvoice(base44, record) {
  if (!Array.isArray(record.charge_ids) || !record.charge_ids.length) return null;
  if (record.line_items?.length !== record.charge_ids.length) throw new Error('Invoice lines cannot be safely matched to their charges.');
  const charges = await Promise.all(record.charge_ids.map(id => base44.asServiceRole.entities.BillingCharge.get(id)));
  if (charges.some(ch => ch.client_id !== record.client_id || ch.archived)) throw new Error('Invoice charges need review.');
  const ids = [...new Set(charges.map(ch => ch.property_service_agreement_id).filter(Boolean))];
  const agreements = await Promise.all(ids.map(id => base44.asServiceRole.entities.PropertyServiceAgreement.get(id)));
  const business = ((await base44.asServiceRole.entities.BusinessSettings.list('-created_date', 1)) || [])[0] || {};
  const rate = Number(business.vat_rate) > 0 ? Number(business.vat_rate) : 24;
  const amounts = invoiceAmounts(charges, agreements, rate);
  return { subtotal: amounts.subtotal, vat: amounts.vat, total: amounts.total,
    line_items: record.line_items.map((line,i) => ({...line, ...amounts.lines[i]})) };
}
