import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ClipboardList, Send, Link2, Copy, Check, Mail, Loader2, ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { athensMediumDateTime } from "@/lib/timezone";

const STATUS_TONE = {
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  Sent: "bg-blue-50 text-blue-600 border-blue-200",
  Received: "bg-amber-50 text-amber-600 border-amber-200",
  Reviewed: "bg-purple-50 text-purple-600 border-purple-200",
  Applied: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Archived: "bg-slate-100 text-slate-400 border-slate-200",
};

// fmt is defined inside the component below so it can use the current language
// and always display Athens-local time (never the viewer's browser timezone).

function genToken() {
  try { return crypto.randomUUID(); } catch (e) { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
}

// Latest non-archived intake for the client.
function latestActive(intakes) {
  const list = (intakes || []).filter((i) => !i.archived);
  list.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
  return list[0] || null;
}

export default function ClientIntakePanel({ client, intakes, onChanged }) {
  const { t, lang } = useLanguage();
  const fmt = (iso) => (iso ? athensMediumDateTime(iso, lang) : "—");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [emailState, setEmailState] = useState(null); // null | "sending" | "sent" | "error"
  const [emailErr, setEmailErr] = useState("");

  const latest = latestActive(intakes);
  const isActive = latest && ["Draft", "Sent", "Received", "Reviewed"].includes(latest.status);
  const reviewable = latest && ["Received", "Reviewed"].includes(latest.status);

  const openSend = async () => {
    setBusy(true);
    try {
      let active = latest && ["Draft", "Sent"].includes(latest.status) ? latest : null;
      if (!active) {
        const token = genToken();
        const created = await base44.entities.CustomerIntake.create({
          client_id: client.id,
          secure_token: token,
          status: "Sent",
          sent_at: new Date().toISOString(),
          payload: {},
        });
        active = created;
        if (onChanged) await onChanged();
      }
      const url = `${window.location.origin}/intake/${active.secure_token}`;
      setLink(url);
      setEmailState(null); setEmailErr("");
      setCopied(false);
      setOpen(true);
    } catch (e) { /* ignore */ }
    setBusy(false);
  };

  const copyLink = () => {
    try { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {}
  };

  const copyMessage = () => {
    const msg = `Hello ${client.name || ""},\n\nPlease complete your property intake form so we can set up your service:\n${link}\n\nYou can save your progress and return to it later.\n\nThank you,\nProperty Care`;
    try { navigator.clipboard?.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {}
  };

  const sendEmail = async () => {
    if (!client.email) { setEmailState("error"); setEmailErr(t("No email address on this client.")); return; }
    setEmailState("sending"); setEmailErr("");
    try {
      await base44.integrations.Core.SendEmail({
        to: client.email,
        subject: "Your Property Care intake form",
        body: `Hello ${client.name || ""},\n\nPlease complete your property intake form so we can set up your service:\n${link}\n\nYou can save your progress and return to it later using the same link.\n\nThank you,\nProperty Care`,
      });
      setEmailState("sent");
    } catch (e) {
      setEmailState("error");
      setEmailErr(e?.message || t("Could not send email. Use Copy Link / Copy Message to send manually."));
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 font-medium text-sm"><ClipboardList className="w-4 h-4 text-muted-foreground" /> {t("Customer Intake")}</div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={openSend} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {reviewable ? t("Resend / Copy link") : latest && latest.status === "Sent" ? t("Copy link") : t("Send Intake Form")}
        </Button>
      </div>
      <div className="px-4 py-3">
        {!latest ? (
          <p className="text-sm text-muted-foreground">{t("Not sent yet. Send the secure intake form for the customer to complete on their own device.")}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_TONE[latest.status] || ""}`}>{t(latest.status)}</span>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5">
              {latest.sent_at && <span>{t("Sent:")} {fmt(latest.sent_at)}</span>}
              {latest.submitted_at && <span>{t("Submitted:")} {fmt(latest.submitted_at)}</span>}
              {latest.applied_at && <span>{t("Applied:")} {fmt(latest.applied_at)}</span>}
            </div>
            {reviewable && (
              <Link to={`/clients/${client.id}/intake`} className="ml-auto text-xs text-primary inline-flex items-center gap-1 hover:underline">
                {t("Review Intake")} <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Customer intake link")}</DialogTitle>
            <DialogDescription>{t("Share this secure link with the customer. They can complete the form on their phone, tablet, or computer without logging in.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Input readOnly value={link} className="text-xs" onFocus={(e) => e.target.select()} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={copyLink}>{copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />} {t("Copy link")}</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={copyMessage}><Copy className="w-4 h-4" /> {t("Copy message")}</Button>
            </div>
            <div className="pt-2 border-t border-border">
              {client.email ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {client.email}</p>
                  <Button size="sm" variant="default" className="gap-1.5" onClick={sendEmail} disabled={emailState === "sending"}>
                    {emailState === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {emailState === "sent" ? t("Sent") : emailState === "sending" ? t("Sending…") : t("Send by email")}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("No email on file — use Copy link / Copy message to send via WhatsApp.")}</p>
              )}
              {emailState === "sent" && <p className="text-xs text-emerald-600 mt-2">{t("Email sent.")}</p>}
              {emailState === "error" && <p className="text-xs text-destructive mt-2">{emailErr || t("Email could not be sent. Use Copy link / Copy message.")}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("Done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}