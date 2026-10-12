"use client";

import { useState } from "react";
import type { Unit } from "@/lib/units";
import { speak, useSpeechUnlock } from "../../../review/German";
import { PartDone, PartShell, usePartSave } from "../../PartShell";

/** Write a few sentences, then compare with a model answer and judge yourself. */
export function Write({
  unit,
  after,
}: {
  unit: Unit;
  after: { href: string; label: string } | null;
}) {
  useSpeechUnlock();
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);
  const { finished, failed, saving, save, retry } = usePartSave(unit.id, "write");

  if (finished) {
    return (
      <PartDone
        next={after}
        title="Gut geschrieben!"
        detail="Copying good phrases from the model into your own texts is how writing grows."
        saveFailed={failed}
        onRetry={retry}
        saving={saving}
      />
    );
  }

  return (
    <PartShell unitId={unit.id} progress={shown ? 0.5 : 0}>
      <p className="muted text-sm font-extrabold tracking-wide uppercase">Write it yourself</p>
      <p className="text-xl font-black leading-snug">{unit.writing.task}</p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={6}
        lang="de"
        autoCapitalize="sentences"
        placeholder="Auf Deutsch…"
        aria-label="Your text"
        className="field text-lg"
      />
      {!shown ? (
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => setShown(true)}
          className="btn btn-primary disabled:opacity-50"
        >
          Compare with a model
        </button>
      ) : (
        <>
          <div className="card flex flex-col gap-2">
            <p className="muted text-sm font-extrabold tracking-wide uppercase">A model answer</p>
            <button
              type="button"
              onClick={() => speak(unit.writing.model)}
              className="text-left font-semibold leading-relaxed"
            >
              {unit.writing.model} 🔊
            </button>
          </div>
          <p className="muted text-sm font-semibold">
            Yours can be different and still right. Did you use this unit's grammar correctly?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => save(0, 1)} className="btn">
              Not yet
            </button>
            <button type="button" onClick={() => save(1, 1)} className="btn btn-primary">
              Yes
            </button>
          </div>
        </>
      )}
    </PartShell>
  );
}
