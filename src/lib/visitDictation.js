import { base44 } from "@/api/base44Client";

export const DICTATION_STATUSES = ["Normal", "Important", "Emergency", "Unable to Check", "N/A"];

// Optional Dictate Visit shortcut: dictation audio → transcript → PROPOSED
// checklist updates. Nothing is applied here — the caller must review and
// approve the proposals before they touch the checklist. Unmentioned items
// are never returned, so they can never be overwritten.
export async function dictationProposalsFromAudio(checklist, audioBlob) {
  const file = new File([audioBlob], `dictation-${Date.now()}.webm`, { type: audioBlob.type || "audio/webm" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
  const text = (typeof transcript === "string" ? transcript : transcript?.text || "").trim();
  if (!text) return { transcript: "", proposals: [] };

  const itemsText = checklist.map((it, i) => `${i}: ${it.name}`).join("\n");
  const res = await base44.integrations.Core.InvokeLLM({
    prompt:
      "A property-care worker dictated observations while doing a property visit. " +
      "Below is the visit checklist (item_index: item name) followed by the transcript of the worker's spoken observations.\n\n" +
      `CHECKLIST:\n${itemsText}\n\nTRANSCRIPT:\n"${text}"\n\n` +
      "Map the transcript ONLY to checklist items the worker explicitly mentions. " +
      "For each mentioned item choose exactly one status:\n" +
      '- "Normal" — checked and fine\n' +
      '- "Important" — needs attention but not urgent\n' +
      '- "Emergency" — urgent problem\n' +
      '- "Unable to Check" — could not be checked (include the reason in notes)\n' +
      '- "N/A" — not applicable\n' +
      'Also set "notes" to the relevant part of the transcript (the worker\'s own words, kept short).\n' +
      "Do NOT invent items. Do NOT include items the worker did not mention. " +
      "If nothing in the transcript matches a checklist item, return an empty updates list.",
    response_json_schema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item_index: { type: "number" },
              status: { type: "string", enum: DICTATION_STATUSES },
              notes: { type: "string" },
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
        DICTATION_STATUSES.includes(u.status)
    )
    .map((u) => ({ item_index: u.item_index, status: u.status, notes: (u.notes || "").trim() }));

  return { transcript: text, proposals };
}