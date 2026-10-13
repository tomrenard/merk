"use client";

import { useEffect, useState } from "react";
import type { Failure } from "@/lib/ai";
import { sameAnswer } from "@/lib/german";
import type { Unit } from "@/lib/units";
import { transcribeRecording } from "../../../ai/actions";
import { AiFailure } from "../../../ai/Feedback";
import { recordingForm, useRecorder } from "../../../ai/useRecorder";
import { speak, useSpeechUnlock } from "../../../review/German";
import { PartDone, PartShell, usePartSave } from "../../PartShell";

/**
 * For each line: hear it, say it while recording, then see what was heard (speech-to-text on
 * the server) and play yourself back next to the model.
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
  const { recording, clip, error, start, stop, reset } = useRecorder(20);
  const { finished, failed, saving, save, retry } = usePartSave(unit.id, "speak");
  const line = lines[index];

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

  return (
    <PartShell unitId={unit.id} progress={index / lines.length}>
      <p className="muted text-sm font-extrabold">
        Say it {index + 1}/{lines.length}: listen, record, compare
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
        {recording ? "⏹ Stop" : clip ? "🎙 Record again" : "🎙 Record yourself"}
      </button>
      {error && <p className="font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      {clip && !recording && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => new Audio(clip.url).play()} className="btn">
            ▶ Me
          </button>
          <button type="button" onClick={() => speak(line.de, { recorded: true })} className="btn">
            ▶ Model
          </button>
        </div>
      )}
      {listening && (
        <p role="status" className="muted font-semibold">
          Listening to your recording…
        </p>
      )}
      {heard !== null && (
        <p className="rounded-2xl bg-[var(--field)] p-3 font-semibold">
          {sameAnswer(heard, line.de) ? "✓ " : ""}Heard: „{heard || "…"}“
        </p>
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
