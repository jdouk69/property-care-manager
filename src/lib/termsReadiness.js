// Explain the actual setup state; approval is never changed here.
export function termsTemplateIssue(template, linkedId, isTest = false) {
  if (!template) return linkedId ? "The linked terms template could not be found." : "Choose a terms template to preview this agreement.";
  if (template.archived === true) return "The selected terms template is archived.";
  if (isTest) return "";
  if (template.active !== true && template.legal_approved !== true) return "The selected terms are inactive and have not been approved for customer use.";
  if (template.active !== true) return "The selected terms are inactive.";
  if (template.legal_approved !== true) return "The selected terms have not been approved for customer use.";
  return "";
}
export function hasEligibleTerms(templates = []) {
  return templates.some(t => !t.archived && t.active === true && t.legal_approved === true);
}
