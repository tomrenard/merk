"use client";

import { useRef, useState } from "react";
import { sameAnswer } from "@/lib/german";
import type { Unit } from "@/lib/units";
import { speak, useSpeechUnlock } from "../../../review/German";
import { PartDone, PartShell, usePartSave } from "../../PartShell";

/** The browser's speech recognition, where there is one (Safari and Chrome; not every PWA). */
type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
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
  const [mine, setMine] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const listener = useRef<Recognition | null>(null);
  const { finished, failed, save, retry } = usePartSave(unit.id, "speak");
  const line = lines[index];

  async function record() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const media = new MediaRecorder(stream);
      media.ondataavailable = (event) => chunks.push(event.data);
      media.onstop = () => {
        for (const track of stream.getTracks()) track.stop();
        setMine(URL.createObjectURL(new Blob(chunks, { type: media.mimeType })));
      };
      media.start();
      recorder.current = media;
      setRecording(true);
      const rec = recognition();
      if (rec) {
        rec.lang = "de-DE";
        rec.interimResults = false;
        rec.onresult = (event) => setHeard(event.results[0]?.[0]?.transcript ?? null);
        try {
          rec.start();
          listener.current = rec;
        } catch {
          // Recognition is a bonus; recording works without it.
        }
      }
    } catch {
      setError("No microphone: allow it for this app in your phone's settings.");
    }
  }

  function stop() {
    recorder.current?.stop();
    listener.current?.stop();
    setRecording(false);
  }

  function next() {
    if (mine) URL.revokeObjectURL(mine);
    setMine(null);
    setHeard(null);
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
      />
    );
  }

  return (
    <PartShell unitId={unit.id} progress={index / lines.length}>
      <p className="muted text-sm font-extrabold tracking-wide uppercase">
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
        onClick={recording ? stop : record}
        className={`btn btn-solid py-5 text-lg ${recording ? "[--c:#d61f1f] [--edge:#a51515]" : "[--c:var(--brand-fill)] [--edge:var(--brand-edge)]"}`}
      >
        {recording ? "⏹ Stop" : mine ? "🎙 Record again" : "🎙 Record yourself"}
      </button>
      {error && <p className="font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      {mine && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => new Audio(mine).play()}
              className="btn normal-case"
            >
              ▶ Me
            </button>
            <button type="button" onClick={() => speak(line.de)} className="btn normal-case">
              ▶ Model
            </button>
          </div>
          {heard && (
            <p className="rounded-2xl bg-[var(--field)] p-3 font-semibold">
              {sameAnswer(heard, line.de) ? "✓ " : ""}Heard: „{heard}"
            </p>
          )}
        </div>
      )}
      <button type="button" onClick={next} className="btn mt-auto">
        {index + 1 < lines.length ? "Next line" : "Finish"}
      </button>
    </PartShell>
  );
}
