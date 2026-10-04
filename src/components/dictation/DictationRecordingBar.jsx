import React from "react";
import { Mic, Pause, Play, Square, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// Live recording controls: status + elapsed time, Pause/Resume, optional
// Photo, and Stop. Display + callbacks only — capture lives in the recorder.
export default function DictationRecordingBar({ paused, elapsed, onPause, onResume, onPhoto, onStop }) {
  const { t } = useLanguage();
  const btn = "rounded-xl h-11 px-2 gap-1.5";
  return (
    <div className={`rounded-xl border px-3 py-2.5 space-y-2.5 ${paused ? "border-amber-500/30 bg-amber-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
      <div className={`flex items-center gap-2 text-sm font-semibold ${paused ? "text-amber-600" : "text-rose-600"}`}>
        <span className={`w-3 h-3 rounded-full shrink-0 ${paused ? "bg-amber-500" : "bg-rose-500 animate-pulse"}`} />
        {paused ? <Pause className="w-4 h-4 shrink-0" /> : <Mic className="w-4 h-4 shrink-0" />}
        {paused ? t("Paused") : t("Recording")} {mmss(elapsed)}
      </div>
      {paused && <p className="text-xs text-muted-foreground">{t("Recording paused — tap Resume to continue speaking.")}</p>}
      <div className={`grid gap-2 ${onPhoto ? "grid-cols-3" : "grid-cols-2"}`}>
        {paused ? (
          <Button variant="outline" onClick={onResume} className={btn}><Play className="w-4 h-4" /> {t("Resume")}</Button>
        ) : (
          <Button variant="outline" onClick={onPause} className={btn}><Pause className="w-4 h-4" /> {t("Pause")}</Button>
        )}
        {onPhoto && (
          <Button variant="outline" onClick={onPhoto} className={btn}><Camera className="w-4 h-4" /> {t("Photo")}</Button>
        )}
        <Button variant="destructive" onClick={onStop} className={btn}><Square className="w-4 h-4" /> {t("Stop")}</Button>
      </div>
    </div>
  );
}