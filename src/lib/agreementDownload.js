import { base44 } from "@/api/base44Client";

// Token-gated download of the signed agreement PDF. Used by BOTH the public
// customer page and the protected staff pages — neither ever receives the raw
// private storage reference. The PDF bytes are streamed through the
// agreementPublic backend function only after the secure token is validated.
// Uses base44.functions.fetch (the SDK's streaming endpoint) so the request
// routes to the correct function host regardless of whether the app is viewed
// on its published domain, a custom domain, or the builder preview — a raw
// fetch to window.location.origin/functions/... breaks on any host where the
// page origin is not the function-serving origin.
export async function downloadSignedAgreementPdf(token, filename = "Service-Agreement-Signed.pdf") {
  if (!token) throw new Error("Missing agreement token.");
  const r = await base44.functions.fetch("/agreementPublic", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "download", token }),
  });
  if (!r || !r.ok) {
    let msg = "We couldn't open the signed agreement. Please try again.";
    try { if (r) { const j = await r.json(); if (j && j.error) msg = j.error; } } catch (e) {}
    throw new Error(msg);
  }
  // Stream the validated PDF bytes to the user. The anchor + download attribute
  // triggers a file download on desktop/Android; on iOS/iPadOS Safari (which
  // ignores the download attribute) the click navigates to the blob URL and
  // opens the PDF in Safari's native viewer, where the user can save/share.
  // No new window is opened, so no popup-blocker interaction occurs.
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}