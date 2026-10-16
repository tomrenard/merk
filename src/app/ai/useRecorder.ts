"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "../Locale";

/**
 * Records from the microphone, at most `maxSeconds`; the mic is released when recording stops
 * or the screen closes. `clip` is the last recording.
 */
export function useRecorder(maxSeconds = 60) {
  const t = useT();

  const [recording, setRecording] = useState(false);
  const [clip, setClip] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** Bumped by reset and unmount: a recording or mic request from before is dropped. */
  const session = useRef(0);
  const starting = useRef(false);

  function stop() {
    clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    setRecording(false);
  }

  function reset() {
    session.current++;
    stop();
    setClip((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
  }

  async function start() {
    if (starting.current) return;
    starting.current = true;
    reset();
    setError(null);
    const mine = session.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const release = () => {
        for (const track of media.getTracks()) track.stop();
      };
      if (mine !== session.current) return release();
      const chunks: Blob[] = [];
      // 32 kbps is plenty for speech-to-text and keeps a minute under MAX_AUDIO.
      const rec = new MediaRecorder(media, { audioBitsPerSecond: 32_000 });
      rec.ondataavailable = (event) => chunks.push(event.data);
      rec.onstop = () => {
        release();
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (blob.size && mine === session.current)
          setClip({ blob, url: URL.createObjectURL(blob) });
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
      timer.current = setTimeout(stop, maxSeconds * 1000);
    } catch {
      setError(t("No microphone: allow it for this app in your phone's settings."));
    } finally {
      starting.current = false;
    }
  }

  // Leaving the screen turns the mic off and drops what was being recorded.
  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup only, on unmount
  useEffect(() => reset, []);

  return { recording, clip, error, start, stop, reset };
}

/** The recording as a form, for the speech-to-text actions. */
export function recordingForm(blob: Blob, fields: Record<string, string> = {}) {
  const form = new FormData();
  form.append("audio", blob, blob.type.includes("mp4") ? "voice.m4a" : "voice.webm");
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}
