import { useRef, useState } from "react";

// Shared microphone capture used by ALL Dictate surfaces — no separate
// recording implementations per form. The hook records audio and hands the
// finished blob to the caller's interpreter (the shared dictation service);
// interpretation and review stay in the dialogs.
// phase: idle | recording | processing
export default function useDictationRecorder() {
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const cleanup = () => {
    try { recRef.current?.state === "recording" && recRef.current.stop(); } catch (e) {}
    recRef.current = null;
    if (mediaRef.current) { mediaRef.current.getTracks().forEach((t) => t.stop()); mediaRef.current = null; }
    chunksRef.current = [];
  };

  const reset = () => {
    cleanup();
    setPhase("idle");
    setError("");
  };

  // Start recording. `interpret(blob)` receives the finished audio and sets the
  // dialog's own review state; the hook manages idle→recording→processing and
  // surfaces capture/processing errors.
  const start = async (interpret) => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const chunks = [...chunksRef.current];
        cleanup();
        if (!chunks.length) { setError("No audio captured — try again or continue manually."); setPhase("idle"); return; }
        setPhase("processing");
        try {
          await interpret(new Blob(chunks, { type: chunks[0]?.type || "audio/webm" }));
        } catch (e) {
          setError("Could not process the dictation — try again or continue manually. (" + (e?.message || e) + ")");
        }
        setPhase("idle");
      };
      recRef.current = rec;
      rec.start();
      setPhase("recording");
    } catch (e) {
      setError("Microphone unavailable — check permissions, or simply continue manually.");
    }
  };

  const stop = () => { try { recRef.current?.stop(); } catch (e) {} };

  return { phase, error, start, stop, reset };
}