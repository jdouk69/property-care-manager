// Token-gated download of the signed agreement PDF. Used by BOTH the public
// customer page and the protected staff pages — neither ever receives the raw
// private storage reference. The PDF bytes are streamed through the
// agreementPublic backend function only after the secure token is validated.
export async function downloadSignedAgreementPdf(token, filename = "Service-Agreement-Signed.pdf") {
  if (!token) throw new Error("Missing agreement token.");
  const r = await fetch(`${window.location.origin}/functions/agreementPublic`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "download", token }),
  });
  if (!r.ok) {
    let msg = "Download failed. Please try again.";
    try { const j = await r.json(); if (j && j.error) msg = j.error; } catch (e) {}
    throw new Error(msg);
  }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}