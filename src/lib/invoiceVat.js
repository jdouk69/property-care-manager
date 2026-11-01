// Frozen agreement terms take precedence over mutable catalogue defaults.
export const money = n => Math.round((Number(n) || 0) * 100) / 100;
export function agreementVat(agreement, fallbackRate = 24) {
  const fees = agreement?.sent_snapshot?.fees || {};
  const wording = String(fees.vat_wording || '').trim();
  const setting = fees.vat_setting;
  const parsed = wording.match(/current rate \(([0-9.]+)%\)/i);
  const rawRate = fees.vat_rate ?? (parsed ? Number(parsed[1]) : fallbackRate);
  const rate = Number(rawRate);
  if (!Number.isFinite(rate) || rate < 0) throw new Error('The agreement VAT rate needs review.');
  if (setting === 'Included' || wording === 'Price includes applicable VAT.') return { treatment: 'Included', rate };
  if (setting === 'Exempt' || wording === 'VAT is not applicable to this service.') return { treatment: 'Exempt', rate: 0 };
  if (wording && !/Applicable VAT will be added to the stated price at the current rate/.test(wording)) throw new Error('The signed agreement VAT wording needs review.');
  return { treatment: 'Exclusive', rate };
}
export function chargeVat(charge, agreement, fallbackRate = 24) {
  if (agreement?.sent_snapshot?.fees) return agreementVat(agreement, fallbackRate);
  if (charge?.vat_treatment) {
    if (!['Included', 'Exempt', 'Exclusive'].includes(charge.vat_treatment)) throw new Error('The charge VAT treatment needs review.');
    const rate = Number(charge.vat_rate ?? fallbackRate);
    if (!Number.isFinite(rate) || rate < 0) throw new Error('The charge VAT rate needs review.');
    return { treatment: charge.vat_treatment, rate: charge.vat_treatment === 'Exempt' ? 0 : rate };
  }
  // Preserve the existing pre-VAT convention for legacy non-agreement charges.
  return { treatment: 'Exclusive', rate: Number(fallbackRate) };
}
export function invoiceAmounts(charges, agreements = [], fallbackRate = 24) {
  const byId = new Map(agreements.map(a => [a.id, a]));
  const lines = charges.map(ch => {
    const ag = byId.get(ch.property_service_agreement_id);
    if (ch.property_service_agreement_id && !ag && !ch.vat_treatment) throw new Error('The linked agreement must be loaded before calculating VAT.');
    const { treatment, rate } = chargeVat(ch, ag, fallbackRate);
    const amount = Number(ch.amount);
    if (!Number.isFinite(amount) || amount < 0) throw new Error('A valid charge amount is required.');
    const gross = money(amount);
    const net = treatment === 'Included' ? money(gross / (1 + rate / 100)) : gross;
    const vat = treatment === 'Included' ? money(gross - net) : treatment === 'Exempt' ? 0 : money(net * rate / 100);
    return { amount: net, vat, total: money(net + vat), vat_treatment: treatment, vat_rate: rate };
  });
  return { lines, subtotal: money(lines.reduce((s,l)=>s+l.amount,0)), vat: money(lines.reduce((s,l)=>s+l.vat,0)), total: money(lines.reduce((s,l)=>s+l.total,0)) };
}
