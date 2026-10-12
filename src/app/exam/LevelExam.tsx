"use client";

import { useEffect, useRef, useState } from "react";
import type { CourseExam } from "@/lib/course";
import { examPercent, type Section } from "@/lib/exam-score";
import type { Exam } from "@/lib/exams";
import { seededShuffle } from "@/lib/shuffle";
import { Exercise } from "../learn/Exercise";
import { speak, useSpeechUnlock } from "../review/German";
import { ExamBar, ExamIntro, ExamResult, useExamSave } from "./ExamShell";

type Question = { q: string; options: string[]; answer: number };
type Step =
  | {
      kind: "hear";
      section: Section;
      title: string;
      intro: string;
      lines: Exam["hoeren"][number]["lines"];
    }
  | { kind: "question"; section: Section; question: Question; text?: string; title?: string }
  | { kind: "item"; section: Section; item: Exam["sprachbausteine"][number]; n: number }
  | { kind: "perform"; section: Section; task: Exam["schreiben"][number]; write: boolean };

/** Options in a fixed shuffled order per question (same on server and phone), answer remapped. */
function mixed(question: Question): Question {
  const options = seededShuffle(question.options, question.q);
  return { ...question, options, answer: options.indexOf(question.options[question.answer] ?? "") };
}

/** The exam as one list of screens, section by section. */
function steps(content: Exam): Step[] {
  return [
    ...content.hoeren.flatMap((task): Step[] => [
      { kind: "hear", section: "Hören", title: task.title, intro: task.intro, lines: task.lines },
      ...task.questions.map(
        (question): Step => ({
          kind: "question",
          section: "Hören",
          question: mixed(question),
          title: task.title,
        }),
      ),
    ]),
    ...content.lesen.flatMap((task) =>
      task.questions.map(
        (question): Step => ({
          kind: "question",
          section: "Lesen",
          question: mixed(question),
          text: task.text,
          title: task.title,
        }),
      ),
    ),
    ...content.sprachbausteine.map(
      (item, n): Step => ({ kind: "item", section: "Sprachbausteine", item, n }),
    ),
    ...content.schreiben.map(
      (task): Step => ({ kind: "perform", section: "Schreiben", task, write: true }),
    ),
    ...content.sprechen.map(
      (task): Step => ({ kind: "perform", section: "Sprechen", task, write: false }),
    ),
  ];
}

/**
 * A level exam modelled on the Goethe certificate. Listening, reading and grammar are checked
 * here; writing and speaking you judge yourself against the checklist and a model. 60% passes.
 */
export function LevelExam({
  exam,
  content,
  best,
}: {
  exam: CourseExam;
  content: Exam;
  best?: number;
}) {
  useSpeechUnlock();
  const [started, setStarted] = useState(false);
  const [all] = useState(() => steps(content));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState<Record<Section, [number, number]>>({
    Hören: [0, 0],
    Lesen: [0, 0],
    Sprachbausteine: [0, 0],
    Schreiben: [0, 0],
    Sprechen: [0, 0],
  });
  const [picked, setPicked] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);
  const [ticks, setTicks] = useState<boolean[]>([]);
  const [playing, setPlaying] = useState<number | null>(null);
  const run = useRef(0);
  const { state, percent, save, retry } = useExamSave(exam);
  useEffect(
    () => () => {
      run.current++;
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    },
    [],
  );

  function next(section: Section, points: number, of: number) {
    const updated = {
      ...score,
      [section]: [score[section][0] + points, score[section][1] + of] as [number, number],
    };
    setScore(updated);
    setPicked(null);
    setText("");
    setShown(false);
    setTicks([]);
    stopPlaying();
    if (index + 1 < all.length) return setIndex(index + 1);
    setIndex(all.length);
    save(examPercent(updated));
  }

  function stopPlaying() {
    run.current++;
    setPlaying(null);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }

  function play(lines: { speaker: string; de: string }[], from = 0, id = ++run.current) {
    const line = lines[from];
    if (!line || id !== run.current) return setPlaying(null);
    const speakers = [...new Set(lines.map((l) => l.speaker))];
    setPlaying(from);
    speak(line.de, {
      second: speakers.indexOf(line.speaker) % 2 === 1,
      onEnd: () => {
        if (id === run.current) play(lines, from + 1, id);
      },
    });
  }

  if (!started) {
    const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
    return (
      <ExamIntro
        exam={exam}
        best={best}
        minutes={exam.level === "A1" ? 25 : 40}
        onStart={() => setStarted(true)}
        sections={[
          {
            icon: "🎧",
            name: "Hören · listening",
            detail: count(content.hoeren.length, "recording"),
          },
          { icon: "📖", name: "Lesen · reading", detail: count(content.lesen.length, "text") },
          {
            icon: "🧩",
            name: "Sprachbausteine · grammar",
            detail: count(content.sprachbausteine.length, "gap"),
          },
          {
            icon: "✍️",
            name: "Schreiben · writing",
            detail: `${count(content.schreiben.length, "task")}, you mark it with a checklist`,
          },
          {
            icon: "🎙️",
            name: "Sprechen · speaking",
            detail: `${count(content.sprechen.length, "task")}, you mark it with a checklist`,
          },
        ]}
      />
    );
  }

  if (index >= all.length) {
    return (
      <ExamResult
        exam={exam}
        percent={percent}
        state={state}
        onRetry={retry}
        sections={(Object.entries(score) as [Section, [number, number]][]).map(
          ([name, [s, t]]) => ({ name, score: s, total: t }),
        )}
      />
    );
  }

  const step = all[index];
  if (!step) return null;
  const bar = <ExamBar progress={index / all.length} section={`${exam.title} · ${step.section}`} />;

  if (step.kind === "hear") {
    return (
      <main className="screen">
        {bar}
        <h1 className="text-2xl font-black">{step.title}</h1>
        <p className="font-semibold">{step.intro}</p>
        <button
          type="button"
          onClick={() => (playing === null ? play(step.lines) : stopPlaying())}
          className="btn btn-primary py-5 text-xl"
        >
          {playing === null ? "▶ Play" : `⏹ ${playing + 1}/${step.lines.length}`}
        </button>
        <p className="muted text-sm">
          As in the real exam, you can listen twice. Then answer the questions.
        </p>
        <button type="button" onClick={() => next("Hören", 0, 0)} className="btn mt-auto">
          Questions
        </button>
      </main>
    );
  }

  if (step.kind === "question") {
    return (
      <main className="screen">
        {bar}
        {step.text && (
          <article className="card max-h-[45dvh] overflow-y-auto whitespace-pre-line">
            {step.title && <p className="mb-2 font-extrabold">{step.title}</p>}
            {step.text}
          </article>
        )}
        <p className="text-xl font-black">{step.question.q}</p>
        <div className="flex flex-col gap-2">
          {step.question.options.map((option, i) => (
            <button
              key={option}
              type="button"
              onClick={() => setPicked(i)}
              aria-pressed={picked === i}
              className={`btn justify-start text-left normal-case ${picked === i ? "border-[var(--brand)] bg-[var(--brand-soft)]" : ""}`}
            >
              {option}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={picked === null}
          onClick={() => next(step.section, picked === step.question.answer ? 1 : 0, 1)}
          className="btn btn-primary mt-auto disabled:opacity-50"
        >
          Continue
        </button>
      </main>
    );
  }

  if (step.kind === "item") {
    const item = { id: `${exam.id}-sb-${step.n}`, type: "choice" as const, en: "", ...step.item };
    return (
      <main className="screen">
        {bar}
        <Exercise
          key={item.id}
          item={item}
          onDone={(right) => next("Sprachbausteine", right ? 1 : 0, 1)}
        />
      </main>
    );
  }

  const checks = step.task.checklist;
  return (
    <main className="screen">
      {bar}
      <p className="text-xl font-black leading-snug">{step.task.task}</p>
      {step.write ? (
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          readOnly={shown}
          rows={7}
          lang="de"
          autoCapitalize="sentences"
          aria-label="Your answer"
          className="field text-lg"
        />
      ) : (
        <p className="muted font-semibold">
          Say your answer out loud (about a minute), then compare.
        </p>
      )}
      {!shown ? (
        <button
          type="button"
          disabled={step.write && !text.trim()}
          onClick={() => setShown(true)}
          className="btn btn-primary disabled:opacity-50"
        >
          Compare
        </button>
      ) : (
        <>
          <div className="card flex flex-col gap-2">
            <p className="muted text-sm font-extrabold">A model answer</p>
            <button
              type="button"
              onClick={() => speak(step.task.model)}
              className="text-left font-semibold leading-relaxed"
            >
              {step.task.model} 🔊
            </button>
          </div>
          <p className="font-bold">Tick what your answer did:</p>
          {checks.map((check, i) => (
            <label key={check} className="flex items-start gap-3 font-semibold">
              <input
                type="checkbox"
                checked={ticks[i] ?? false}
                onChange={(event) =>
                  setTicks((t) => Object.assign([...t], { [i]: event.target.checked }))
                }
                className="mt-1 size-5"
              />
              {check}
            </label>
          ))}
          <button
            type="button"
            onClick={() => next(step.section, ticks.filter(Boolean).length, checks.length)}
            className="btn btn-primary"
          >
            Continue
          </button>
        </>
      )}
    </main>
  );
}
