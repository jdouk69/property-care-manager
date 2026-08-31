// Resolve the appropriate Applied Customer Intake for a client+property, without
// ever crossing clients or properties. If the client has multiple properties and
// the selected one does not match an Applied intake's property_id, returns null
// (no derivation) to avoid cross-property leakage. Mirrors the safe approach used
// for emergency-field prefilling on the Service Agreement draft.

export function resolveAppliedIntakeForPrefill(intakes, selectedPropertyId, clientPropertyCount) {
  const applied = (intakes || []).filter((i) => !i.archived && i.status === "Applied");
  if (applied.length === 0) return null;
  const byNewest = (a, b) => (b.created_date || "").localeCompare(a.created_date || "");
  if (selectedPropertyId) {
    const matching = applied.filter((i) => i.property_id === selectedPropertyId);
    if (matching.length) return matching.sort(byNewest)[0];
    // Older Applied intakes may not have property_id linked yet; only safe to
    // use when the client has a single property (no ambiguity).
    if (clientPropertyCount === 1) return applied.sort(byNewest)[0];
    return null;
  }
  if (clientPropertyCount === 1) return applied.sort(byNewest)[0];
  return null;
}