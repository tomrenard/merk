"use client";

import { useEffect, useState } from "react";
import type { Failure } from "@/lib/ai";
import { spokenWords } from "@/lib/german";
import type { Unit } from "@/lib/units";
import { transcribeRecording } from "../../../ai/actions";
import { AiFailure } from "../../../ai/Feedback";
import { recordingForm, useRecorder } from "../../../ai/useRecorder";
import { speak, useSpeechUnlock } from "../../../review/German";
import { PartDone, PartShell, usePartSave } from "../../PartShell";

/**
 * Repeat each line: hear it, record yourself (it stops by itself after about the line's length),
 * then see which words came through (speech-to-text on the server, no AI teacher needed) and
 * play yourself back.
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
  const [heard, setHeard] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [listening, setListening] = useState(false);
  const line = lines[index];
  // Enough time for the line said slowly, then it stops and checks by itself.
  const seconds = Math.min(20, 3 + Math.ceil((line?.de.split(" ").length ?? 5) * 0.7));
  const { recording, clip, error, start, stop, reset } = useRecorder(seconds);
  const { finished, failed, saving, save, retry } = usePartSave(unit.id, "speak");

  // Each new recording is written down once.
  useEffect(() => {
    if (!clip) return;
    let current = true;
    setHeard(null);
    setFailure(null);
    setListening(true);
    transcribeRecording(recordingForm(clip.blob))
      .catch((): Failure => ({ ok: false, reason: "error" }))
      .then((result) => {
        if (!current) return;
        setListening(false);
        if (result.ok) setHeard(result.result);
        else setFailure(result);
      });
    return () => {
      current = false;
    };
  }, [clip]);

  function next() {
    reset();
    setHeard(null);
    setFailure(null);
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

  // Which words of the line didn't come through (order, fillers and repeats don't matter).
  const said = new Set(spokenWords(heard ?? ""));
  const shown = line.de.split(" ").map((word) => ({
    word,
    missed: spokenWords(word).some((w) => !said.has(w)),
  }));
  const missed = shown.filter((w) => w.missed).map((w) => w.word.replace(/[.,!?;:]/g, ""));

  return (
    <PartShell unitId={unit.id} progress={index / lines.length}>
      <p className="muted text-sm font-extrabold">
        Say it {index + 1}/{lines.length}: listen, then repeat
      </p>
      <div className="card flex flex-col gap-2">
        <p className="text-2xl font-black">{line.de}</p>
        <p className="muted font-semibold">{line.en}</p>
      </div>
      <button type="button" onClick={() => speak(line.de, { recorded: true })} className="btn">
        🔊 Listen
      </button>
      <button
        type="button"
        onClick={recording ? stop : start}
        className={`btn btn-solid py-5 text-lg ${recording ? "[--c:#d63c3c]" : "[--c:var(--brand-fill)]"}`}
      >
        {recording ? "⏹ Done" : clip ? "🎙 Try again" : "🎙 Say it"}
      </button>
      <p className="muted text-sm">
        {recording
          ? `Say the sentence now. It stops by itself after ${seconds} seconds.`
          : "Tap, say the sentence, and we check which words came through."}
      </p>
      {error && <p className="font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      {listening && (
        <p role="status" className="muted font-semibold">
          Checking what you said…
        </p>
      )}
      {heard !== null && (
        <div role="status" className="card flex flex-col gap-2">
          <p className="font-extrabold">
            {missed.length
              ? `Didn't come through: ${missed.join(", ")}`
              : "✓ Perfect, every word came through."}
          </p>
          <p className="text-lg font-semibold" lang="de">
            {shown.map(({ word, missed }, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: words of a fixed sentence
              <span key={i} className={missed ? "text-rose-600 underline dark:text-rose-400" : ""}>
                {word}{" "}
              </span>
            ))}
          </p>
          <p className="muted text-sm">We heard: „{heard || "…"}“</p>
        </div>
      )}
      {clip && !recording && (
        <button type="button" onClick={() => new Audio(clip.url).play()} className="btn">
          ▶ Hear yourself
        </button>
      )}
      {failure && <AiFailure failure={failure} />}
      {clip && (
        <p className="muted text-xs">
          Your recording is sent once for speech-to-text and not stored; only the text is kept.
        </p>
      )}
      <button type="button" onClick={next} className="btn mt-auto">
        {index + 1 < lines.length ? "Next line" : "Finish"}
      </button>
    </PartShell>
  );
}
