// Property/customer photo storage helpers.
//
// SECURITY MODEL: property and visit photos are PRIVATE by default. Uploads
// go to Base44 private storage (UploadPrivateFile) and only the private file
// reference (e.g. "mp/private/<app>/<file>") is persisted in records — never
// a permanent public URL and never a temporary signed URL. When an authorized
// staff member's screen or a PDF build needs to display the image, a fresh
// short-lived signed URL is generated on demand (in-memory cache only).
//
// Public URLs (legacy records, business logo, owner-profile photos) pass
// through unchanged — those files are public by design.

export const isPrivateFileRef = (v) => !!v && !/^https?:/i.test(v) && !/^data:/i.test(v);

const TTL_SECONDS = 300; // shortest practical expiry — 5 minutes
const cache = new Map(); // uri -> { url, expiresAt } — in-memory only, never persisted

// Resolve a stored photo reference to a fetchable/displayable URL:
// public URLs pass through; private storage refs get a fresh signed URL.
export async function resolvePhotoUrl(src) {
  if (!isPrivateFileRef(src)) return src || "";
  const hit = cache.get(src);
  if (hit && hit.expiresAt - Date.now() > 60_000) return hit.url;
  const { base44 } = await import("@/api/base44Client");
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: src, expires_in: TTL_SECONDS });
  if (!signed_url) throw new Error("Could not create a signed URL for this photo.");
  cache.set(src, { url: signed_url, expiresAt: Date.now() + TTL_SECONDS * 1000 });
  return signed_url;
}

// Upload a photo to PRIVATE storage. Persist the returned reference only —
// never the file's signed URL.
export async function uploadPrivatePhoto(file) {
  const { base44 } = await import("@/api/base44Client");
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  return file_uri;
}