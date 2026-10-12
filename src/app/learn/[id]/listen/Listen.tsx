"use client";

import { useState } from "react";
import { sameAnswer } from "@/lib/german";
import { shuffled } from "@/lib/shuffle";
import type { Unit } from "@/lib/units";
import { PANEL, SOLID } from "../../../feedback";
import { speak, useSpeechUnlock } from "../../../review/German";
import { PartDone, PartShell, usePartSave } from "../../PartShell";

type Step = "hear" | "questions" | "read" | "dictation";

/** Hear the dialogue (text hidden), answer questions, read it, then type sentences you hear. */
export function Listen({
  unit,
  after,
}: {
  unit: Unit;
  after: { href: string; label: string } | null;
}) {
  useSpeechUnlock();
  const { lines, questions } = unit.listening;
  const [step, setStep] = useState<Step>("hear");
  const [playing, setPlaying] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const [answer, setAnswer] = useState<number | string | null>(null);
  const [checked, setChecked] = useState(false);
  const [english, setEnglish] = useState(false);
  const [options] = useState(() =>
    questions.map((q) => shuffled(q.options.map((option, i) => ({ option, i })))),
  );
  const { finished, failed, save, retry } = usePartSave(unit.id, "listen");
  const total = questions.length + unit.dictation.length;
  // The other speaker gets the second voice, if the device has one.
  const speakers = [...new Set(lines.map((line) => line.speaker))];

  function play(from = 0) {
    const line = lines[from];
    if (!line) return setPlaying(null);
    setPlaying(from);
    speak(line.de, {
      second: speakers.indexOf(line.speaker) % 2 === 1,
      onEnd: () => play(from + 1),
    });
  }

  function next(correct: boolean, count: number) {
    const score = right + (correct ? 1 : 0);
    setRight(score);
    setAnswer(null);
    setChecked(false);
    if (index + 1 < count) return setIndex(index + 1);
    setIndex(0);
    if (step === "questions") setStep("read");
    else save(score, total);
  }

  if (finished) {
    return (
      <PartDone
        next={after}
        title="Gut gehört!"
        detail={`${right}/${total} right. Try the dialogue again any time.`}
        saveFailed={failed}
        onRetry={retry}
      />
    );
  }

  const progress = { hear: 0, questions: 0.25, read: 0.5, dictation: 0.75 }[step];

  if (step === "hear") {
    return (
      <PartShell unitId={unit.id} progress={progress}>
        <p className="muted text-sm font-extrabold tracking-wide uppercase">
          Listen first, no text
        </p>
        <h1 className="text-2xl font-black">{unit.listening.title}</h1>
        <p className="font-semibold">{unit.listening.intro}</p>
        <button type="button" onClick={() => play()} className="btn btn-primary py-5 text-xl">
          {playing === null ? "▶ Play the dialogue" : `🔊 Line ${playing + 1}/${lines.length}…`}
        </button>
        <p className="muted text-sm">Listen twice if you like. Then answer a few questions.</p>
        <button type="button" onClick={() => setStep("questions")} className="btn mt-auto">
          Questions
        </button>
      </PartShell>
    );
  }

  if (step === "questions") {
    const question = questions[index];
    if (!question) return null;
    const correct = answer === question.answer;
    return (
      <PartShell unitId={unit.id} progress={progress + (index / questions.length) * 0.25}>
        <p className="muted text-sm font-extrabold tracking-wide uppercase">
          Question {index + 1}/{questions.length}
        </p>
        <p className="text-2xl font-black">{question.q}</p>
        <div className="flex flex-col gap-2">
          {options[index]?.map(({ option, i }) => (
            <button
              key={option}
              type="button"
              disabled={checked}
              onClick={() => setAnswer(i)}
              className={`btn justify-start text-left normal-case ${answer === i ? "border-[var(--brand)] bg-[var(--brand-soft)]" : ""}`}
            >
              {option}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => play()} className="btn">
          🔊 Hear it again
        </button>
        {checked && (
          <p className={`rounded-2xl p-4 text-xl font-black ${PANEL[correct ? "right" : "wrong"]}`}>
            {correct ? "✓ Richtig!" : `✗ ${question.options[question.answer]}`}
          </p>
        )}
        <button
          type="button"
          disabled={answer === null}
          onClick={() => (checked ? next(correct, questions.length) : setChecked(true))}
          className={`btn btn-solid mt-auto disabled:opacity-50 ${SOLID[checked ? (correct ? "right" : "wrong") : "idle"]}`}
        >
          {checked ? "Continue" : "Check"}
        </button>
      </PartShell>
    );
  }

  if (step === "read") {
    return (
      <PartShell unitId={unit.id} progress={progress}>
        <div className="topbar">
          <p className="muted text-sm font-extrabold tracking-wide uppercase">
            Now read it · tap a line
          </p>
          <button type="button" onClick={() => setEnglish(!english)} className="chip line border-2">
            {english ? "Hide English" : "Show English"}
          </button>
        </div>
        <ol className="card flex flex-col gap-3">
          {lines.map((line) => (
            <li key={`${line.speaker}: ${line.de}`}>
              <button
                type="button"
                onClick={() => speak(line.de, { second: speakers.indexOf(line.speaker) % 2 === 1 })}
                className="text-left"
              >
                <span className="muted block text-xs font-extrabold uppercase">{line.speaker}</span>
                <span className="font-bold">{line.de}</span>
                {english && <span className="muted block text-sm">{line.en}</span>}
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setStep("dictation")} className="btn btn-primary">
          Dictation
        </button>
      </PartShell>
    );
  }

  const sentence = unit.dictation[index] ?? "";
  const typed = typeof answer === "string" ? answer : "";
  const correct = sameAnswer(typed, sentence);
  return (
    <PartShell unitId={unit.id} progress={progress + (index / unit.dictation.length) * 0.25}>
      <p className="muted text-sm font-extrabold tracking-wide uppercase">
        Dictation {index + 1}/{unit.dictation.length}: type what you hear
      </p>
      <button type="button" onClick={() => speak(sentence)} className="btn self-start text-2xl">
        🔊 Play
      </button>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (checked) next(correct, unit.dictation.length);
          else if (typed.trim()) setChecked(true);
        }}
      >
        <textarea
          value={typed}
          onChange={(event) => setAnswer(event.target.value)}
          readOnly={checked}
          rows={2}
          lang="de"
          autoCapitalize="sentences"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="What you heard"
          className="field text-lg font-bold"
        />
        {checked && (
          <div className={`rounded-2xl p-4 ${PANEL[correct ? "right" : "wrong"]}`}>
            <p className="text-xl font-black">{correct ? "✓ Richtig!" : "✗ It was:"}</p>
            <p className="font-bold">{sentence}</p>
          </div>
        )}
        <button
          type="submit"
          onMouseDown={(event) => event.preventDefault()}
          className={`btn btn-solid ${SOLID[checked ? (correct ? "right" : "wrong") : "idle"]}`}
        >
          {checked ? "Continue" : "Check"}
        </button>
      </form>
    </PartShell>
  );
}
