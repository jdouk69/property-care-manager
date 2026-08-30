// Re-export the snapshot + hash helpers from agreementTerms for ergonomic imports.
// Kept as its own module per the Phase A spec ("agreementSnapshot.js" exists).
export {
  buildSentSnapshot,
  canonicalize,
  snapshotHash,
  renderVatWording,
  renderOptionalCharge,
  resolvePlaceholders,
  resolveSections,
} from "./agreementTerms";