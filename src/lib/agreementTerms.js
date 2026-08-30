// Single source of truth: base44/shared/agreementTerms.js (backend-authoritative).
// The authenticated agreementSend backend imports that same module, so the staff
// preview and the frozen sent_snapshot are produced by IDENTICAL code. This makes
// the invariant structural: STAFF PREVIEW = FROZEN SNAPSHOT = future customer view
// = future signed PDF. No second implementation to drift.
export {
  SECRET_FIELDS,
  renderVatWording,
  renderOptionalCharge,
  renderEmergencyMaxAmount,
  resolvePlaceholders,
  resolveSections,
  buildSentSnapshot,
  canonicalize,
  snapshotHash,
  scanSnapshotForSecrets,
  generatePublicToken,
} from "../../base44/shared/agreementTerms.js";