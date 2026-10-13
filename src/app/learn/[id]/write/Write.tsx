"use client";

import { useState, useTransition } from "react";
import type { Failure, Feedback } from "@/lib/ai";
import type { Unit } from "@/lib/units";
import { checkWriting } from "../../../ai/actions";
import { AiFailure, FeedbackCard } from "../../../ai/Feedback";
import { speak, useSpeechUnlock } from "../../../review/German";
import { PartDone, PartShell, usePartSave } from "../../PartShell";

/**
 * Write a few sentences, get the AI teacher's feedback, then see a model answer. Without AI
 * (daily limit, budget, offline) you compare with the model and judge yourself.
 */
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
  const [marked, setMarked] = useState<Feedback | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [checking, startChecking] = useTransition();

  function check() {
    startChecking(async () => {
      const result = await checkWriting({ unit: unit.id }, text).catch(
        (): Failure => ({ ok: false, reason: "error" }),
      );
      setFailure(result.ok ? null : result);
      if (result.ok) setMarked(result.result);
      // After a passing error the button stays, to try again; otherwise go on without AI.
      if (result.ok || result.reason !== "error") setShown(true);
    });
  }
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
      <p className="muted text-sm font-extrabold">Write it yourself</p>
      <p className="text-xl font-black leading-snug">{unit.writing.task}</p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        readOnly={shown || checking}
        maxLength={1500}
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
          disabled={!text.trim() || checking}
          onClick={check}
          className="btn btn-primary disabled:opacity-50"
        >
          {checking ? "Checking…" : failure ? "Try again" : "Check my text"}
        </button>
      ) : null}
      {!shown && failure && <AiFailure failure={failure} />}
      {shown && (
        <>
          {marked && <FeedbackCard feedback={marked} />}
          {failure && <AiFailure failure={failure} />}
          <div className="card flex flex-col gap-2">
            <p className="muted text-sm font-extrabold">A model answer</p>
            <button
              type="button"
              onClick={() => speak(unit.writing.model, { recorded: true })}
              className="text-left font-semibold leading-relaxed"
            >
              {unit.writing.model} 🔊
            </button>
          </div>
          {marked ? (
            <button
              type="button"
              onClick={() => save(marked.score >= 60 ? 1 : 0, 1)}
              className="btn btn-primary"
            >
              Finish
            </button>
          ) : (
            <>
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
        </>
      )}
    </PartShell>
  );
}
