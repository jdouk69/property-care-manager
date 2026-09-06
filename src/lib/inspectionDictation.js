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

// Dictation for structured FORMS (Report Issue, Maintenance, Tasks, Owner-Rep
// Reports, …). The caller passes the currently open form's visible field
// schema (with allowed values), the form's current values, and the app
// context. Speech is interpreted ONLY against those fields; the result is a
// reviewable draft — nothing is applied here.
export async function dictationFormProposalsFromAudio({ fields, values, contextLabel, audioBlob }) {
  const file = new File([audioBlob], `dictation-${Date.now()}.webm`, { type: audioBlob.type || "audio/webm" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
  const text = (typeof transcript === "string" ? transcript : transcript?.text || "").trim();
  if (!text) return { transcript: "", proposals: [] };

  const fieldLines = fields
    .map((f) => `${f.key} (${f.kind}) — label: "${f.label}"${f.kind === "enum" ? ` — allowed values: ${(f.options || []).join(", ")}` : ""}`)
    .join("\n");
  const currentValues = fields
    .map((f) => `${f.key}: ${values?.[f.key] === undefined || values?.[f.key] === null || values?.[f.key] === "" ? "(empty)" : values[f.key]}`)
    .join("\n");

  const res = await base44.integrations.Core.InvokeLLM({
    prompt:
      "A property-care worker dictated while filling in ONE open staff form.\n\n" +
      `FORM CONTEXT: ${contextLabel}. The property/record is already chosen by the app — never infer, switch, or create it; a spoken property name is transcript text only.\n\n` +
      `FORM FIELDS (field_key (kind) — label — allowed values):\n${fieldLines}\n\n` +
      `CURRENT VALUES:\n${currentValues}\n\n` +
      `TRANSCRIPT: "${text}"\n\n` +
      "Map the speech ONLY to the listed fields. Never invent fields. " +
      "For enum fields the value must be EXACTLY one of the allowed values — if the speech does not match an allowed value, set needs_review true or omit it. " +
      "Free-text fields take the worker's own words, kept concise. " +
      "If relevant information has no matching field, put it in the most fitting free-text field (notes/description) if one exists — do not invent fields. " +
      "Set needs_review true when you cannot confidently map something. Do NOT guess.\n" +
      "If nothing matches, return an empty updates list.",
    response_json_schema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field_key: { type: "string" },
              value: { type: "string" },
              needs_review: { type: "boolean" },
            },
            required: ["field_key", "value"],
          },
        },
      },
      required: ["updates"],
    },
  });

  // Harden the LLM output: only known field keys, only real enum values,
  // one proposal per field, no invented values.
  const byKey = {};
  fields.forEach((f) => { byKey[f.key] = f; });
  const seen = new Set();
  const proposals = [];
  for (const u of (Array.isArray(res?.updates) ? res.updates : [])) {
    const f = byKey[u.field_key];
    if (!f || seen.has(u.field_key)) continue;
    let value = (u.value ?? "").toString().trim();
    if (!value) continue;
    if (f.kind === "enum") {
      const match = (f.options || []).find((o) => o.toLowerCase() === value.toLowerCase());
      if (!match) continue; // never invent enum values
      value = match;
    }
    seen.add(u.field_key);
    proposals.push({ key: f.key, value, needs_review: !!u.needs_review });
  }

  return { transcript: text, proposals };
}

// Item-level dictation (Guided Checklist): the checklist item is ALREADY
// known — passed in by the caller from the card staff is currently looking at.
// The AI NEVER performs checklist-item matching; it may propose only ONE of
// the allowed existing statuses plus an observation note in the worker's own
// words. The result is a PROPOSAL — the dialog reviews it and staff approves
// before anything is applied (the caller APPENDS approved notes to existing
// notes, never silently overwriting). Reuses the exact same recorder /
// transcription / AI pipeline as all other dictation surfaces; no new
// infrastructure, statuses, or fields.
export async function dictationItemProposalFromAudio({ itemName, statuses, contextLabel, audioBlob }) {
  const file = new File([audioBlob], `dictation-${Date.now()}.webm`, { type: audioBlob.type || "audio/webm" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
  const text = (typeof transcript === "string" ? transcript : transcript?.text || "").trim();
  if (!text) return { transcript: "", proposal: null };

  const res = await base44.integrations.Core.InvokeLLM({
    prompt:
      "A property-care worker dictated an observation about ONE known checklist item.\n\n" +
      `INSPECTION CONTEXT: ${contextLabel}. The property and visit are already chosen by the app — never infer, switch, or add any other property, visit, or checklist item; a spoken name is transcript text only.\n\n` +
      `CHECKLIST ITEM (already known — do NOT match, search for, or invent items): "${itemName}"\n\n` +
      `ALLOWED STATUSES: ${statuses.join(", ")}\n\n` +
      `TRANSCRIPT: "${text}"\n\n` +
      "Choose exactly one status from the allowed list that best matches the worker's words " +
      "(fine/OK/no problem → the status meaning fine, a problem or concern → the status meaning needs attention, " +
      "urgent or serious → the most severe status, could not check or access → that status, not applicable → that status). " +
      'Set "notes" to the worker\'s own words describing the observation, kept short and factual. ' +
      "Keep wording within visual property-care / home-watch observation scope — never introduce professional inspection, engineering, certification, or code-compliance language. " +
      "Do not invent facts the worker did not say. " +
      "Set needs_review to true when the speech does not clearly relate to this item or you cannot confidently choose one status. Do NOT guess in that case.",
    response_json_schema: {
      type: "object",
      properties: {
        update: {
          type: "object",
          properties: {
            status: { type: "string", enum: statuses },
            notes: { type: "string" },
            needs_review: { type: "boolean" },
          },
          required: ["status", "notes"],
        },
      },
      required: ["update"],
    },
  });

  const u = res?.update;
  if (!u || !statuses.includes(u.status)) return { transcript: text, proposal: null };
  return {
    transcript: text,
    proposal: {
      status: u.status,
      notes: (u.notes || "").trim(),
      needs_review: !!u.needs_review,
    },
  };
}