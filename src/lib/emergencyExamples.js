// Suggestions are applied only on an explicit staff action; never customer consent.
export const EMERGENCY_EXAMPLES = {
  contact: {
    label: "Contact owner before any paid work",
    authorization: "Contact me for approval before arranging any paid emergency work. No spending is authorized without my approval. Notify the appropriate emergency services if there is immediate danger.",
    unreachable: "Try my phone and preferred messaging method, then my emergency contact if one is provided. If neither can be reached, do not authorize paid work without my approval. Notify the appropriate emergency services if there is immediate danger.",
  },
  limited: {
    label: "Allow essential emergency work up to an agreed limit",
    authorization: "I authorize Property Care Crete to arrange essential temporary emergency work to protect people or prevent further property damage, up to the agreed limit per incident, including VAT and call-out fees. Attempt to contact me first whenever practical. Provide photographs, a summary and receipts afterward. Further repairs or spending above the limit require my approval.",
    unreachable: "Try my phone and preferred messaging method, then my emergency contact if one is provided. If neither can be reached, arrange only essential temporary measures within the agreed limit. Further repairs or spending above the limit require my approval.",
  },
};

export function emergencyExamplePatch(choice, currentLimit, translate = (text) => text, frozen = false) {
  const example = EMERGENCY_EXAMPLES[choice];
  if (frozen || !example) return null;
  return {
    emergency_authorization: translate(example.authorization),
    emergency_unreachable_instructions: translate(example.unreachable),
    emergency_max_amount: choice === "contact" ? 0 : Number(currentLimit) === 0 ? "" : currentLimit,
    emergency_authorization_confirmed: false,
  };
}
