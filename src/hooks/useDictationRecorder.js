import { useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Shared microphone capture used by ALL Dictate surfaces — no separate
// recording implementations per form. The hook records audio and hands the
// finished audio to the caller's interpreter (the shared dictation service);
// interpretation and review stay in the dialogs.
// phase: idle | recording | paused | processing
//
// Pause/Resume: pausing finishes the current audio SEGMENT and releases the
// microphone (so the phone camera can be used safely); resuming starts a new
// segment. On Stop, the interpreter receives a single Blob (one segment) or
// an array of Blobs in spoken order — the dictation service transcribes them
// together as one dictation.
export default function useDictationRecorder() {
  const { t } = useLanguage();
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const recRef = useRef(null); // { rec, stream, after: "finish" | "pause" | "discard" }
  const segmentsRef = useRef([]);
  const interpretRef = useRef(null);

  const finish = async () => {
    const blobs = segmentsRef.current;
    segmentsRef.current = [];
    if (!blobs.length) { setError(t("No audio captured — try again or continue manually.")); setPhase("idle"); return; }
    setPhase("processing");
    try {
      await interpretRef.current(blobs.length === 1 ? blobs[0] : blobs);
    } catch (e) {
      setError(t("Could not process the dictation — try again or continue manually. ({message})", { message: e?.message || String(e) }));
    }
    setPhase("idle");
  };

  const beginSegment = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      const entry = { rec, stream, after: "finish" };
      rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        if (recRef.current === entry) recRef.current = null;
        if (entry.after === "discard") return;
        if (chunks.length) segmentsRef.current.push(new Blob(chunks, { type: chunks[0]?.type || "audio/webm" }));
        if (entry.after === "pause") setPhase("paused");
        else finish();
      };
      recRef.current = entry;
      rec.start();
      setPhase("recording");
    } catch (e) {
      // On a failed resume the phase stays "paused" so Stop still processes
      // what was already recorded.
      setError(t("Microphone unavailable — check permissions, or simply continue manually."));
    }
  };

  const cleanup = () => {
    const e = recRef.current;
    if (e) {
      e.after = "discard";
      try { if (e.rec.state !== "inactive") e.rec.stop(); } catch (err) {}
      e.stream.getTracks().forEach((tr) => tr.stop());
      recRef.current = null;
    }
    segmentsRef.current = [];
  };

  const reset = () => {
    cleanup();
    setPhase("idle");
    setError("");
  };

  // Start recording. `interpret(audio)` receives the finished audio and sets
  // the dialog's own review state; the hook manages the phases and surfaces
  // capture/processing errors.
  const start = (interpret) => {
    interpretRef.current = interpret;
    segmentsRef.current = [];
    return beginSegment();
  };

  const pause = () => {
    const e = recRef.current;
    if (!e || e.rec.state === "inactive") return;
    e.after = "pause";
    try { e.rec.stop(); } catch (err) {}
  };

  const resume = () => { if (phase === "paused") beginSegment(); };

  const stop = () => {
    const e = recRef.current;
    if (e) {
      e.after = "finish";
      try { if (e.rec.state !== "inactive") e.rec.stop(); } catch (err) {}
      return;
    }
    if (phase === "paused") finish();
  };

  return { phase, error, start, stop, pause, resume, reset };
}