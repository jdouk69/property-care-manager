import { base44 } from "@/api/base44Client";

// Dictation audio is sensitive on-site voice material. It is uploaded to
// PRIVATE storage only — never public storage. Transcription receives a
// short-lived signed URL (10 minutes) that is used in-memory for the
// transcription call and never returned to callers, shown in UI, logged, or
// saved to any record. Note: Base44 currently provides no API to delete an
// uploaded private file, so the raw audio remains in private storage
// (authenticated/signed access only) after processing — see security audit.
async function transcribeDictationAudio(audioBlob) {
  const file = new File([audioBlob], `dictation-${Date.now()}.webm`, { type: audioBlob.type || "audio/webm" });
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
  const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: signed_url });
  return typeof transcript === "string" ? transcript : transcript?.text || "";
}

// Shared Dictate Inspection service — reusable across every inspection /
// checklist type (Property Visits, Inspections, and future types). It receives
// the CURRENTLY OPEN inspection's checklist, that checklist's OWN status
// vocabulary, and the inspection's context label — nothing is hard-coded to a
// visit type or template. It transcribes the worker's speech and returns
// PROPOSED updates only; the caller reviews and approves before anything is
// applied to the checklist.
export async function dictationProposalsFromAudio({ checklist, statuses, contextLabel, audioBlob }) {
  const text = (await transcribeDictationAudio(audioBlob)).trim();
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
      'Set "notes" to a short professional observation PARAPHRASED from the relevant part of the transcript, using observational ' +
      "property-care / home-watch wording based ONLY on what the worker actually said:\n" +
      "- Prefer phrasing like: \"appears to…\", \"no obvious concerns noted\", \"no visible signs of…\", \"visually checked\", " +
      "\"appeared to operate normally\", \"was not accessible for a visual check\", \"was not checked during this visit\", " +
      "\"no obvious damage observed\", \"staff observed…\".\n" +
      "- Avoid strong or technical wording such as: inspected, passed inspection, certified, safe, perfect, fully functional, " +
      "no mold, structurally sound, electrically safe, plumbing is good, all systems are working — never expand an observation " +
      "into a safety, diagnostic, or systems assessment. If the worker literally dictated such a phrase, use the safer " +
      "observational paraphrase instead.\n" +
      "- Stay faithful: if the worker reported an issue or concern, keep it clearly and specifically in the note — do not soften, " +
      "remove, or reinterpret it. Do not state anything was checked or is fine when the worker said it was not, was inaccessible, " +
      "or does not exist.\n" +
      "- Do not invent observations, measurements, or conclusions the worker did not state.\n" +
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
  const text = (await transcribeDictationAudio(audioBlob)).trim();
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
  const text = (await transcribeDictationAudio(audioBlob)).trim();
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
      'Set "notes" to a short professional observation PARAPHRASED from the worker\'s words, kept short and factual, using observational ' +
      "property-care / home-watch wording based ONLY on what the worker actually said. " +
      "Prefer phrasing like: \"appears to…\", \"no obvious concerns noted\", \"no visible signs of…\", \"visually checked\", " +
      "\"appeared to operate normally\", \"was not accessible for a visual check\", \"was not checked during this visit\", " +
      "\"no obvious damage observed\", \"staff observed…\". " +
      "Avoid strong or technical wording such as: inspected, passed inspection, certified, safe, perfect, fully functional, " +
      "no mold, structurally sound, electrically safe, plumbing is good, all systems are working — never expand an observation " +
      "into a safety, diagnostic, or systems assessment; if the worker literally dictated such a phrase, use the safer " +
      "observational paraphrase instead. " +
      "Stay faithful: keep any reported issue or concern clearly in the note, and never state something was checked or is fine " +
      "when the worker said it was not, was inaccessible, or does not exist. " +
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