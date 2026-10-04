import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { checklistItemDisplay } from "@/lib/i18n/checklistItemDisplay";

// A photo taken mid-dictation: preview, choose which checklist item it
// belongs to, then attach it through the visit's existing photo path.
export default function DictationPhotoPanel({ file, checklist, onAttach, onDiscard }) {
  const { t, lang } = useLanguage();
  const [idx, setIdx] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const attach = async () => {
    setBusy(true);
    await onAttach(Number(idx));
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2.5">
      <div className="flex items-start gap-3">
        {preview && <img src={preview} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-medium">{t("Attach photo to:")}</p>
          <Select value={idx} onValueChange={setIdx}>
            <SelectTrigger className="h-11 text-sm"><SelectValue placeholder={t("Choose checklist item")} /></SelectTrigger>
            <SelectContent>
              {checklist.map((it, i) => (
                <SelectItem key={i} value={String(i)}>{i + 1}. {checklistItemDisplay(it.name, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onDiscard} disabled={busy} className="rounded-xl h-11">{t("Discard")}</Button>
        <Button onClick={attach} disabled={idx === "" || busy} className="rounded-xl h-11 gap-1.5">
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("Attaching…")}</> : t("Attach")}
        </Button>
      </div>
    </div>
  );
}