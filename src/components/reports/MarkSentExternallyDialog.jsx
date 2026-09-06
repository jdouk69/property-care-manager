import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const METHODS = ["WhatsApp", "Manual Email", "In-person", "Phone Call", "Other"];

/**
 * Record a report delivery that happened outside the app (WhatsApp, manual
 * email, in-person, …). This does NOT send an email — it only stamps the visit's
 * report record as Sent with the chosen delivery method, so externally-marked
 * delivery stays distinct from confirmed in-app email delivery.
 */
export default function MarkSentExternallyDialog({ open, onClose, onConfirm }) {
  const { t } = useLanguage();
  const [method, setMethod] = useState("WhatsApp");
  const [recipient, setRecipient] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  if (!open) return null;

  const submit = () => {
    if (!method || !confirmed) return;
    onConfirm({ method, recipient: recipient.trim() });
    setRecipient("");
    setConfirmed(false);
    setMethod("WhatsApp");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border max-w-md w-full p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold">{t("Mark Report Sent Externally")}</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {t("Use this when the report was delivered outside the app (e.g. WhatsApp or a manual email). This records a manual confirmation — it does not send an email and is clearly distinguished from in-app email delivery.")}
        </p>
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block">{t("Delivery method *")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => <SelectItem key={m} value={m}>{t(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">{t("Recipient (optional)")}</Label>
            <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={t("e.g. owner WhatsApp number or email")} />
          </div>
          <label className="flex items-start gap-2.5 text-sm cursor-pointer">
            <Checkbox checked={confirmed} onCheckedChange={setConfirmed} className="mt-0.5" />
            <span className="text-muted-foreground">{t("I confirm the report was delivered to the owner via the method above.")}</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={onClose}>{t("Cancel")}</Button>
          <Button onClick={submit} disabled={!confirmed || !method}>{t("Mark Sent")}</Button>
        </div>
      </div>
    </div>
  );
}