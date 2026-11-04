// Base44 does not use the Sites /api/legacy-files proxy. Preserve existing
// Base44 file URLs and references; private file references are signed by
// photoStorage before rendering or PDF generation.
export const migratedFileUrl = (source) => source || "";
