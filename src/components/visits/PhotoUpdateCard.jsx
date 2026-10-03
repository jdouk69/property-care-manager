import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Send, Loader2, CheckCircle2, AlertTriangle, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { sendOwnerPhotoUpdateEmail } from "@/lib/photoUpdateSend";
import { athensMediumDateTime } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Image } from "@/components/ui/image";

const MAX_PHOTOS = 3;

/**
 * Complete Care FOLLOW-UP photo update — the owner deliverable of the brief
 * monthly follow-up visit, replacing the full visit-report workflow (which is
 * excluded for this visit type). Staff select 1–3 photos taken during the
 * visit, optionally add a short note, review the recipient and content, and
 * explicitly send a dated photo update in the owner's preferred language.
 * Photos travel as email attachments — never as public URLs. A stored
 * photo_update_sent_at guards against accidental duplicate sends (resend is
 * explicit and confirmed).
 *
 * props: { visit, property, client, business, onUpdate }
 */
export default function PhotoUpdateCard({ visit, property, client, business, onUpdate }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState([]);
  const [note, setNote] = useState(visit?.photo_update_note || "");
  const [urls, setUrls] = useState({});
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    base44.auth.me().then((u) => setUserName(u?.full_name || u?.email || "")).catch(() => {});
  }, []);

  // All photos recorded on this visit: visit-level first, then checklist
  // items, deduplicated in order.
  const allPhotos = useMemo(() => {
    const seen = new Set();
    const out = [];
    const push = (u) => {
      const k = String(u || "").trim();
      if (k && !seen.has(k)) { seen.add(k); out.push(k); }
    };
    (visit?.photos || []).forEach(push);
    (visit?.checklist || []).forEach((it) => (it.photos || []).forEach(push));
    return out;
  }, [visit?.id, visit?.checklist, visit?.photos]);

  // Thumbnail URLs: public URLs pass through; private storage URIs get a
  // short-lived signed URL (the same private-storage rule as report PDFs).
  useEffect(() => {
    let active = true;
    (async () => {
      const out = {};
      for (const p of allPhotos) {
        if (/^https?:/i.test(p)) { out[p] = p; continue; }
        try {
          const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: p });
          out[p] = signed_url || "";
        } catch (e) { out[p] = ""; }
      }
      if (active) setUrls(out);
    })();
    return () => { active = false; };
  }, [allPhotos]);

  if (!visit) return null;
  const sent = !!visit.photo_update_sent_at;

  const toggle = (p) => {
    setError("");
    setSelected((cur) => {
      if (cur.includes(p)) return cur.filter((x) => x !== p);
      if (cur.length >= MAX_PHOTOS) {
        setError(t("You can send up to {n} photos per update.", { n: MAX_PHOTOS }));
        return cur;
      }
      return [...cur, p];
    });
  };

  const doSend = async () => {
    setError("");
    if (sent && !window.confirm(t("Resend this photo update to the owner?"))) return;
    setSending(true);
    try {
      const res = await sendOwnerPhotoUpdateEmail({
        visit, property, client, business,
        photos: selected, note: note.trim(), sentBy: userName,
      });
      if (res.ok) {
        const patch = {
          photo_update_photos: selected,
          photo_update_note: note.trim(),
          photo_update_sent_at: new Date().toISOString(),
          photo_update_sent_to: res.to,
          photo_update_sent_by: userName,
        };
        await base44.entities.PropertyVisit.update(visit.id, patch);
        onUpdate && onUpdate({ ...visit, ...patch });
        setConfirmOpen(false);
      } else {
        setError(t("Could not send photo update: {message}", { message: res.error || "unknown error" }));
      }
    } catch (e) {
      setError(t("Could not send photo update: {message}", { message: e?.message || e }));
    }
    setSending(false);
  };

  const openConfirm = () => {
    setError("");
    if (selected.length === 0) {
      setError(t("Select at least one photo (up to {n}).", { n: MAX_PHOTOS }));
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-primary" /> {t("Owner Photo Update")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("Follow-up visits include a dated photo update, not a customer-facing visit report.")}
          </p>
        </div>
        {sent && <span className="text-xs px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{t("Sent")}</span>}
      </div>

      {allPhotos.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <ImageOff className="w-4 h-4 shrink-0" /> {t("No photos available from this visit.")}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {t("Select 1–{max} photos taken during this visit for the dated owner update.", { max: MAX_PHOTOS })}
            {" · "}{t("Selected {n} of {max}", { n: selected.length, max: MAX_PHOTOS })}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {allPhotos.map((p) => {
              const on = selected.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggle(p)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${on ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"}`}
                  aria-pressed={on}
                >
                  {urls[p] ? (
                    <Image src={urls[p]} alt="" className="w-full h-full" fittingType="fill" />
                  ) : (
                    <span className="w-full h-full block bg-muted" />
                  )}
                  {on && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div>
            <p className="text-xs font-medium mb-1">{t("Short note for the owner (optional)")}</p>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="text-sm" />
          </div>
        </>
      )}

      {sent && visit.photo_update_sent_at && (
        <p className="text-xs text-muted-foreground">
          {t("Photo update sent {date}", { date: athensMediumDateTime(visit.photo_update_sent_at) })}
          {visit.photo_update_sent_to ? ` · ${visit.photo_update_sent_to}` : ""}
          {visit.photo_update_sent_by ? ` · ${t("by {name}", { name: visit.photo_update_sent_by })}` : ""}
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-500">{error}</p>
        </div>
      )}

      {allPhotos.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
          <Button onClick={openConfirm} disabled={sending} className="rounded-xl gap-1.5">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sent ? t("Resend Photo Update") : t("Send Photo Update")}
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={(o) => { if (!sending) setConfirmOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Review & send photo update")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 text-muted-foreground">
              <span className="text-xs font-medium text-foreground shrink-0">{t("Recipient:")} </span>
              <span className="text-xs break-all">{client?.email || "—"}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.map((p) => (
                <span key={p} className="w-16 h-16 rounded-lg overflow-hidden border border-border">
                  {urls[p] ? <Image src={urls[p]} alt="" className="w-full h-full" fittingType="fill" /> : <span className="w-full h-full block bg-muted" />}
                </span>
              ))}
            </div>
            {note.trim() && (
              <div className="rounded-xl border border-border bg-muted/40 p-2.5 text-xs text-foreground/90 whitespace-pre-line">{note.trim()}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {t("The update is emailed in the owner's preferred language with the selected photos attached — no public links are sent.")}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sending}>{t("Cancel")}</Button>
            <Button onClick={doSend} disabled={sending} className="gap-1.5">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sent ? t("Resend Photo Update") : t("Send Photo Update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}