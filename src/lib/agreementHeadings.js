// Presentation only. Never renumber stored clauses or mutate frozen snapshots.
export function formatAgreementHeading(section = {}, index = 0) {
  const heading = String(section.heading || 'Untitled section').trim();
  if (/^\d+[.)]\s*/.test(heading)) return heading;
  if (['property-service-scope', 'owner-emergency-authorization'].includes(section.id)) return heading;
  const original = /^section-(\d+)$/.exec(section.id || '');
  return `${original ? original[1] : index + 1}. ${heading}`;
}
