// A newer unsigned draft must not hide the document a customer already signed.
// Multiple independent services are left for the user to choose in the list.
export function clientAgreementTarget(agreements, propertyId) {
  const candidates = (agreements || []).filter(a => a.id && !a.archived && (!propertyId || a.property_id === propertyId));
  const groups = new Set(candidates.map(a => a.agreement_group_id || (a.property_id && a.service_package_id ? `${a.property_id}:${a.service_package_id}` : a.id)));
  if (groups.size !== 1) return null;
  const signed = candidates.filter(a => a.signing_status === 'Signed');
  const current = signed.length ? signed : candidates;
  return [...current].sort((a,b) => (Number(b.agreement_version) || 1) - (Number(a.agreement_version) || 1) || (Date.parse(b.created_date) || 0) - (Date.parse(a.created_date) || 0))[0] || null;
}
