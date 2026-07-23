const KEY = "pcm_visit_draft";

export function saveDraft(d) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...d, savedAt: Date.now() })); } catch (e) {}
}
export function loadDraft() {
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
}
export function clearDraft() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}