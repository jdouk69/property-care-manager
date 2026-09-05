import { base44 } from "@/api/base44Client";

// Shared Dictate Inspection service — reusable across every inspection /
// checklist type (Property Visits, Inspections, and future types). It receives
// the CURRENTLY OPEN inspection's checklist, that checklist's OWN status
// vocabulary, and the inspection's context label — nothing is hard-coded to a
// visit type or template. It transcribes the worker's speech and returns
// PROPOSED updates only; the caller reviews and approves before anything is
// applied to the checklist.
export async function dictationProposalsFromAudio({ checklist, statuses, contextLabel, audioBlob }) {
  const file = new File([audioBlob], `dictation-${Date.now()}.webm`, { type: audioBlob.type || "audio/webm" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
  const text = (typeof transcript === "string" ? transcript : transcript?.text || "").trim();
  if (!text) return { transcript: "", proposals: [] };

  const itemsText = checklist.map((it, i) => `${i}: ${it.name}`).join("\n");
  const res = await base44.integrations.Core.InvokeLLM({
    prompt:
      "A property-care worker dictated observations while filling in ONE open inspection.\n\n" +
      `INSPECTION CONTEXT: ${contextLabel}. All observations belong to this inspection only — never infer, switch, or add any other property or inspection from what is spoken. ` +
      "If the worker mentions a different property or inspection name in the transcript, treat it only as transcript text — do NOT switch the property or inspection.\n\n" +
      `CHECKLIST (item_index: item name):\n${itemsText}\n\n` +
      `ALLOWED STATUSES: ${statuses.join(", ")}\n\n` +
      `TRANSCRIPT: "${text}"\n\n` +
      "Map the transcript ONLY to checklist items the worker explicitly mentions. " +
      "For each mentioned item choose exactly one status from the allowed list that best matches the worker's words " +
      "(fine/OK → the status meaning fine, a problem → the status meaning needs attention, urgent → the most severe status, " +
      "could not check → that status, not applicable → that status). " +
      'Set "notes" to the relevant part of the transcript (the worker\'s own words, kept short).\n' +
      "Set needs_review to true when the observation is ambiguous — you cannot confidently match it to exactly ONE checklist item or ONE status. Do NOT guess in that case.\n" +
      "Do NOT invent checklist items. Do NOT include items the worker did not mention. " +
      "Do NOT mark an unmentioned item as fine/OK. If nothing matches, return an empty updates list.",
    response_json_schema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item_index: { type: "number" },
              status: { type: "string", enum: statuses },
              notes: { type: "string" },
              needs_review: { type: "boolean" },
            },
            required: ["item_index", "status", "notes"],
          },
        },
      },
      required: ["updates"],
    },
  });

  const updates = Array.isArray(res?.updates) ? res.updates : [];
  const proposals = updates
    .filter(
      (u) =>
        Number.isInteger(u.item_index) &&
        u.item_index >= 0 &&
        u.item_index < checklist.length &&
        statuses.includes(u.status)
    )
    .map((u) => ({
      item_index: u.item_index,
      status: u.status,
      notes: (u.notes || "").trim(),
      needs_review: !!u.needs_review,
    }));

  return { transcript: text, proposals };
}