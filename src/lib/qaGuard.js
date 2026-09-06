// QA test-data guard (deliberately minimal — not a QA subsystem).
// ONE dedicated property is used for synthetic testing and is named with the
// "QA TEST" prefix (e.g. "QA TEST PROPERTY — DO NOT USE FOR CUSTOMERS").
// Operational queues and counts use these helpers to keep its synthetic
// records out of real work views. The wizard property picker intentionally
// still shows it — staff use it on purpose for testing.

export const QA_NAME_PREFIX_RE = /^QA TEST/i;

export const isQaPropertyName = (name) => QA_NAME_PREFIX_RE.test(String(name || ""));

export const isQaProperty = (property) => !!property && isQaPropertyName(property.name);

export function qaPropertyIds(properties) {
  return new Set((properties || []).filter(isQaProperty).map((p) => p.id));
}

// Filter visits that belong to a QA property out of a visit list.
export function excludeQaVisits(visits, properties) {
  const ids = qaPropertyIds(properties);
  return (visits || []).filter((v) => !ids.has(v.property_id));
}