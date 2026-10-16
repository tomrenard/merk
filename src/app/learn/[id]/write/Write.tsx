"use client";

import { useState, useTransition } from "react";
import type { Failure, Feedback } from "@/lib/ai";
import { CHEERS, courseOfId } from "@/lib/courses";
import type { Unit } from "@/lib/units";
import { checkWriting } from "../../../ai/actions";
import { AiFailure, FeedbackCard } from "../../../ai/Feedback";
import { useQuiet, useT } from "../../../Locale";
import { speak, useSpeechUnlock } from "../../../review/German";
import { Say } from "../../../Say";
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
  const t = useT();
  const course = courseOfId(unit.id);
  const quiet = useQuiet();

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
        title={CHEERS[course].wrote}
        detail={t("Copying good phrases from the model into your own texts is how writing grows.")}
        saveFailed={failed}
        onRetry={retry}
        saving={saving}
      />
    );
  }

  // Quiet mode: no writing; you read and hear a good answer to the task.
  if (quiet) {
    return (
      <PartShell unitId={unit.id} progress={0.5}>
        <p className="muted text-sm font-extrabold">{t("Read a good answer")}</p>
        <p className="text-xl font-black leading-snug">{unit.writing.task}</p>
        <button
          type="button"
          onClick={() => speak(unit.writing.model, { recorded: true })}
          className="card text-left font-semibold leading-relaxed"
        >
          <Say de={unit.writing.model} tr={unit.writing.modelTr} /> 🔊
        </button>
        <p className="muted text-sm font-semibold">
          {t("Notice how it uses this lesson's grammar; you can write your own later.")}
        </p>
        <button type="button" onClick={() => save(1, 1)} className="btn btn-primary mt-auto">
          {t("Finish")}
        </button>
      </PartShell>
    );
  }

  return (
    <PartShell unitId={unit.id} progress={shown ? 0.5 : 0}>
      <p className="muted text-sm font-extrabold">{t("Write it yourself")}</p>
      <p className="text-xl font-black leading-snug">{unit.writing.task}</p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        readOnly={shown || checking}
        maxLength={1500}
        rows={6}
        lang={course === "ary" ? "fr" : "de"}
        autoCapitalize="sentences"
        placeholder={CHEERS[course].write}
        aria-label={t("Your text")}
        className="field text-lg"
      />
      {!shown ? (
        <button
          type="button"
          disabled={!text.trim() || checking}
          onClick={check}
          className="btn btn-primary disabled:opacity-50"
        >
          {checking ? t("Checking…") : failure ? t("Try again") : t("Check my text")}
        </button>
      ) : null}
      {!shown && failure && <AiFailure failure={failure} />}
      {shown && (
        <>
          {marked && <FeedbackCard feedback={marked} course={course} />}

          {failure && <AiFailure failure={failure} />}
          <div className="card flex flex-col gap-2">
            <p className="muted text-sm font-extrabold">{t("A model answer")}</p>
            <button
              type="button"
              onClick={() => speak(unit.writing.model, { recorded: true })}
              className="text-left font-semibold leading-relaxed"
            >
              <Say de={unit.writing.model} tr={unit.writing.modelTr} /> 🔊
            </button>
          </div>
          {marked ? (
            <button
              type="button"
              onClick={() => save(marked.score >= 60 ? 1 : 0, 1)}
              className="btn btn-primary"
            >
              {t("Finish")}
            </button>
          ) : (
            <>
              <p className="muted text-sm font-semibold">
                {t(
                  "Yours can be different and still right. Did you use this unit's grammar correctly?",
                )}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => save(0, 1)} className="btn">
                  {t("Not yet")}
                </button>
                <button type="button" onClick={() => save(1, 1)} className="btn btn-primary">
                  {t("Yes")}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </PartShell>
  );
}
