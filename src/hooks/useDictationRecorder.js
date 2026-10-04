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
//
// FAIL-SAFE (real-device iOS bug): after the native camera sheet (or any
// full-screen page interruption) Safari may NEVER deliver MediaRecorder's
// `onstop` event. Every state transition therefore has a watchdog fallback —
// Pause and Stop always finalize the segment even when `onstop` is lost, so
// the controls can never wedge on "recording" with a dead inactive recorder.
const ONSTOP_WATCHDOG_MS = 1500;

export default function useDictationRecorder() {
  const { t } = useLanguage();
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const recRef = useRef(null); // { rec, stream, after: "finish" | "pause" | "discard", chunks, finalized, watchdog }
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

  // Single, idempotent end-of-segment path — used by the recorder's own
  // `onstop` AND by the watchdog fallback, so exactly one of them completes
  // the segment regardless of whether Safari ever fires `onstop`.
  const finalizeSegment = (entry) => {
    if (entry.watchdog) { clearTimeout(entry.watchdog); entry.watchdog = null; }
    if (entry.finalized) return;
    entry.finalized = true;
    try { entry.stream.getTracks().forEach((tr) => tr.stop()); } catch (err) {}
    if (recRef.current === entry) recRef.current = null;
    if (entry.after === "discard") return;
    if (entry.chunks.length) segmentsRef.current.push(new Blob(entry.chunks, { type: entry.chunks[0]?.type || "audio/webm" }));
    if (entry.after === "pause") setPhase("paused");
    else finish();
  };

  // Arms the fallback: if `onstop` never arrives (iOS camera interruption),
  // the segment is finalized anyway and Pause/Stop still complete.
  const armWatchdog = (entry) => {
    if (entry.watchdog) clearTimeout(entry.watchdog);
    entry.watchdog = setTimeout(() => finalizeSegment(entry), ONSTOP_WATCHDOG_MS);
  };

  const beginSegment = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const entry = { rec, stream, after: "finish", chunks: [], finalized: false, watchdog: null };
      rec.ondataavailable = (e) => { if (e.data?.size) entry.chunks.push(e.data); };
      rec.onstop = () => finalizeSegment(entry);
      recRef.current = entry;
      rec.start();
      setPhase("recording");
    } catch {
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
      // Always finalize locally too — never relies on `onstop` firing, so
      // Cancel always releases the microphone even after an iOS interruption.
      finalizeSegment(e);
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
    if (!e) return;
    if (e.rec.state === "inactive") { finalizeSegment(e); return; } // onstop already lost
    e.after = "pause";
    try { e.rec.stop(); } catch (err) { finalizeSegment(e); return; }
    armWatchdog(e);
  };

  const resume = () => { if (phase === "paused") beginSegment(); };

  const stop = () => {
    const e = recRef.current;
    if (e) {
      if (e.rec.state === "inactive") { finalizeSegment(e); return; } // onstop already lost
      e.after = "finish";
      try { e.rec.stop(); } catch (err) { finalizeSegment(e); return; }
      armWatchdog(e);
      return;
    }
    if (phase === "paused") finish();
  };

  return { phase, error, start, stop, pause, resume, reset };
}