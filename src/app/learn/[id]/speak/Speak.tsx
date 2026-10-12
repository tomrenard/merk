"use client";

import { useEffect, useRef, useState } from "react";
import { sameAnswer } from "@/lib/german";
import type { Unit } from "@/lib/units";
import { speak, useSpeechUnlock } from "../../../review/German";
import { PartDone, PartShell, usePartSave } from "../../PartShell";

/** The browser's speech recognition, where there is one (Safari and Chrome; not every PWA). */
type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};
function recognition(): Recognition | null {
  const Ctor =
    (window as unknown as Record<string, unknown>).SpeechRecognition ??
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  return typeof Ctor === "function" ? new (Ctor as new () => Recognition)() : null;
}

/**
 * For each line: hear it, say it while recording, then play yourself back next to the model.
 * Where the phone can, it also writes down what it heard you say.
 */
export function Speak({
  unit,
  after,
}: {
  unit: Unit;
  after: { href: string; label: string } | null;
}) {
  useSpeechUnlock();
  const lines = unit.speaking;
  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [listening, setListening] = useState(false);
  const [mine, setMine] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const listener = useRef<Recognition | null>(null);
  const busy = useRef(false);
  const { finished, failed, saving, save, retry } = usePartSave(unit.id, "speak");
  const line = lines[index];
  // Known only in the browser; checked after mount so server and phone render the same.
  const [canCheck, setCanCheck] = useState(false);
  useEffect(() => setCanCheck(recognition() !== null), []);

  /** Stops recorder, mic and recognition; `drop` also forgets the recording. */
  function stopAll(drop = false) {
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    for (const track of stream.current?.getTracks() ?? []) track.stop();
    stream.current = null;
    listener.current?.stop();
    listener.current = null;
    setRecording(false);
    setListening(false);
    if (drop) {
      setMine((url) => {
        if (url) URL.revokeObjectURL(url);
        return null;
      });
      setHeard(null);
    }
  }

  // Leaving the screen turns the mic off.
  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup only, on unmount
  useEffect(() => () => stopAll(true), []);

  async function record() {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    stopAll(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(media);
      rec.ondataavailable = (event) => chunks.push(event.data);
      rec.onstop = () => {
        if (chunks.length) setMine(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
        for (const track of media.getTracks()) track.stop();
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
    } catch {
      stopAll(true);
      setError("No microphone: allow it for this app in your phone's settings.");
    } finally {
      busy.current = false;
    }
  }

  /** Speech-to-text on its own (not while recording: on iPhone the two fight over the mic). */
  function check() {
    if (busy.current) return;
    stopAll();
    setHeard(null);
    const rec = recognition();
    if (!rec) return;
    rec.lang = "de-DE";
    rec.interimResults = false;
    rec.onresult = (event) => {
      setHeard(event.results[0]?.[0]?.transcript ?? null);
      setListening(false);
    };
    // Say why nothing came back, instead of hanging on "Listening…".
    rec.onerror = (event) => {
      setListening(false);
      setError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Speech-to-text is blocked: allow the microphone, and turn on Siri & Dictation (Settings › Siri)."
          : event.error === "no-speech"
            ? "Didn't hear anything. Tap and say the sentence."
            : `Speech-to-text failed (${event.error}). Recording and comparing still works.`,
      );
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
      listener.current = rec;
      setListening(true);
    } catch {
      setError("Speech-to-text isn't available here.");
    }
  }

  function next() {
    stopAll(true);
    if (index + 1 < lines.length) setIndex(index + 1);
    else save(lines.length, lines.length);
  }

  if (finished || !line) {
    return (
      <PartDone
        next={after}
        title="Toll gesprochen!"
        detail="Saying it out loud is what makes it come out in real conversations."
        saveFailed={failed}
        onRetry={retry}
        saving={saving}
      />
    );
  }

  return (
    <PartShell unitId={unit.id} progress={index / lines.length}>
      <p className="muted text-sm font-extrabold">
        Say it {index + 1}/{lines.length}: listen, record, compare
      </p>
      <div className="card flex flex-col gap-2">
        <p className="text-2xl font-black">{line.de}</p>
        <p className="muted font-semibold">{line.en}</p>
      </div>
      <button type="button" onClick={() => speak(line.de)} className="btn">
        🔊 Listen
      </button>
      <button
        type="button"
        onClick={recording ? () => stopAll() : record}
        className={`btn btn-solid py-5 text-lg ${recording ? "[--c:#d63c3c]" : "[--c:var(--brand-fill)]"}`}
      >
        {recording ? "⏹ Stop" : mine ? "🎙 Record again" : "🎙 Record yourself"}
      </button>
      {error && <p className="font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      {mine && !recording && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => new Audio(mine).play()} className="btn normal-case">
            ▶ Me
          </button>
          <button type="button" onClick={() => speak(line.de)} className="btn normal-case">
            ▶ Model
          </button>
        </div>
      )}
      {!canCheck && (
        <p className="muted text-sm">
          Speech-to-text isn't available in this app on your phone (iOS often leaves it out of
          home-screen apps). Recording and comparing works; for a transcript, open this page in
          Safari with Siri & Dictation on.
        </p>
      )}
      {canCheck && !recording && (
        <button
          type="button"
          onClick={listening ? () => stopAll() : check}
          className="btn normal-case"
        >
          {listening ? "Listening… tap to stop" : "🗣 Check with speech-to-text"}
        </button>
      )}
      {heard && (
        <div className="flex flex-col gap-1">
          <p className="rounded-2xl bg-[var(--field)] p-3 font-semibold">
            {sameAnswer(heard, line.de) ? "✓ " : ""}Heard: „{heard}"
          </p>
          <p className="muted text-xs">
            Speech-to-text is done by your phone's provider (Apple or Google). Recordings stay on
            your phone.
          </p>
        </div>
      )}
      <button type="button" onClick={next} className="btn mt-auto">
        {index + 1 < lines.length ? "Next line" : "Finish"}
      </button>
    </PartShell>
  );
}
