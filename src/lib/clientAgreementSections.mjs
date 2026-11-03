const version = a => Number(a.agreement_version) || 1;
const newestFirst = (a,b) => version(b)-version(a) || (Date.parse(b.created_date)||0)-(Date.parse(a.created_date)||0);

// Only explicit replacement groups establish that records are versions of the
// same agreement. Ungrouped services remain separate, even at the same property.
export function clientAgreementSections(agreements) {
  const groups = new Map();
  for (const a of agreements || []) {
    if (!a.id || a.archived) continue;
    const key = a.agreement_group_id ? 'group:'+a.agreement_group_id : 'record:'+a.id;
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(a);
  }
  const current=[],history=[];
  for (const records of groups.values()) {
    const sorted=[...records].sort(newestFirst);
    const signed=sorted.filter(a=>a.signing_status==='Signed');
    const primary=signed[0] || sorted[0];
    const visible=new Set([primary.id]);
    // Operational service controls must stay visible until a replacement is
    // activated. Also keep a newer draft/sent revision available for editing.
    for (const a of sorted) if (['Active','Paused'].includes(a.status)) visible.add(a.id);
    const newest=sorted[0];
    if (version(newest)>version(primary) && ['Draft','Sent','Viewed'].includes(newest.signing_status)) visible.add(newest.id);
    current.push(primary);
    for (const a of sorted) if (a.id!==primary.id) (visible.has(a.id)?current:history).push(a);
  }
  return {current,history};
}

export function clientAgreementLabel(a, historical=false) {
  if (historical) return a.signing_status==='Signed'?'Previous signed version':a.signing_status==='Declined'?'Declined unsigned version':'Older unsigned version';
  if (a.status==='Active') return 'Active service agreement';
  if (a.status==='Paused') return 'Paused service agreement';
  return a.signing_status==='Signed'?'Current agreement':'Latest agreement';
}
