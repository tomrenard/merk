"use client";

import { useState } from "react";
import type { CourseExam } from "@/lib/course";
import { sameAnswer } from "@/lib/german";
import { PANEL, SOLID } from "../feedback";
import { Exercise } from "../learn/Exercise";
import { speak, useSpeechUnlock } from "../review/German";
import type { PartExamPacket } from "./data";
import { ExamBar, ExamIntro, ExamResult, useExamSave } from "./ExamShell";

/** 12 exercises, 2 lines by ear, 2 dictations from the part's lessons; 70% passes. */
export function PartExam({
  exam,
  packet,
  best,
}: {
  exam: CourseExam;
  packet: PartExamPacket;
  best?: number;
}) {
  useSpeechUnlock();
  const [started, setStarted] = useState(false);
  const total = packet.items.length + packet.listening.length + packet.dictation.length;
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({ items: 0, listening: 0, dictation: 0 });
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const { state, percent, save, retry } = useExamSave(exam);

  function next(section: keyof typeof scores, right: boolean) {
    const updated = { ...scores, [section]: scores[section] + (right ? 1 : 0) };
    setScores(updated);
    setPicked(null);
    setTyped("");
    setChecked(false);
    if (step + 1 < total) return setStep(step + 1);
    setStep(total);
    save(Math.round((100 * (updated.items + updated.listening + updated.dictation)) / total));
  }

  if (!started) {
    return (
      <ExamIntro
        exam={exam}
        best={best}
        minutes={10}
        onStart={() => setStarted(true)}
        sections={[
          {
            icon: "🧩",
            name: "Grammar & words",
            detail: `${packet.items.length} exercises from the part's lessons`,
          },
          { icon: "🎧", name: "Listening", detail: `${packet.listening.length} lines by ear` },
          { icon: "✍️", name: "Dictation", detail: `${packet.dictation.length} sentences to write` },
        ]}
      />
    );
  }

  if (step >= total) {
    return (
      <ExamResult
        exam={exam}
        percent={percent}
        state={state}
        onRetry={retry}
        sections={[
          { name: "Grammar & words", score: scores.items, total: packet.items.length },
          { name: "Listening", score: scores.listening, total: packet.listening.length },
          { name: "Dictation", score: scores.dictation, total: packet.dictation.length },
        ]}
      />
    );
  }

  const bar = (section: string) => (
    <ExamBar progress={step / total} section={`${exam.title} · ${section}`} />
  );

  const item = packet.items[step];
  if (item) {
    return (
      <main className="screen">
        {bar(`${step + 1}/${packet.items.length}`)}
        <Exercise key={item.id} item={item} onDone={(right) => next("items", right)} />
      </main>
    );
  }

  const l = step - packet.items.length;
  const line = packet.listening[l];
  if (line) {
    return (
      <main className="screen">
        {bar("Listening")}
        <button
          type="button"
          onClick={() => speak(line.de)}
          className="btn btn-primary py-5 text-xl"
        >
          🔊 Play
        </button>
        <p className="font-bold">What did you hear?</p>
        <div className="flex flex-col gap-2">
          {line.options.map((option, i) => (
            <button
              key={option}
              type="button"
              onClick={() => setPicked(i)}
              aria-pressed={picked === i}
              className={`btn justify-start normal-case ${picked === i ? "border-[var(--brand)] bg-[var(--brand-soft)]" : ""}`}
            >
              {option}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={picked === null}
          onClick={() => next("listening", picked === line.answer)}
          className="btn btn-primary mt-auto disabled:opacity-50"
        >
          Continue
        </button>
      </main>
    );
  }

  const sentence = packet.dictation[l - packet.listening.length] ?? "";
  const right = sameAnswer(typed, sentence);
  return (
    <main className="screen">
      {bar("Dictation")}
      <button type="button" onClick={() => speak(sentence)} className="btn self-start text-2xl">
        🔊 Play
      </button>
      <textarea
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
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
        <div className={`rounded-2xl p-4 ${PANEL[right ? "right" : "wrong"]}`}>
          <p className="text-xl font-black">{right ? "✓ Richtig!" : "✗ It was:"}</p>
          <p className="font-bold">{sentence}</p>
        </div>
      )}
      <button
        type="button"
        disabled={!typed.trim()}
        onClick={() => (checked ? next("dictation", right) : setChecked(true))}
        className={`btn btn-solid disabled:opacity-50 ${SOLID[checked ? (right ? "right" : "wrong") : "idle"]}`}
      >
        {checked ? "Continue" : "Check"}
      </button>
    </main>
  );
}
