"use client";

import { type ReactNode, useState, useTransition } from "react";
import type { CourseExam } from "@/lib/course";
import { Back } from "../Nav";
import { recordExam } from "./actions";

/** Top bar of an exam: ✕ (leaving loses the attempt), progress, section name. */
export function ExamBar({ progress, section }: { progress: number; section: string }) {
  return (
    <header className="flex flex-col gap-2">
      <div className="topbar">
        <Back href="/learn" className="muted text-2xl font-black" aria-label="Leave the exam">
          ✕
        </Back>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
      <p className="chip self-start bg-[var(--brand-soft)] text-[var(--brand)]">{section}</p>
    </header>
  );
}

/** Before an exam: what's in it, the pass mark, your best so far. */
export function ExamIntro({
  exam,
  best,
  sections,
  minutes,
  onStart,
}: {
  exam: CourseExam;
  best?: number;
  sections: { icon: string; name: string; detail: string }[];
  minutes: number;
  onStart: () => void;
}) {
  return (
    <main className="screen">
      <header className="topbar">
        <Back href="/learn" className="muted text-2xl font-black" aria-label="Back to the course">
          ✕
        </Back>
      </header>
      <span aria-hidden="true" className="icon mx-auto size-20 bg-[var(--brand-soft)] text-5xl">
        {exam.type === "level" ? "🏆" : "📝"}
      </span>
      <div className="text-center">
        <h1 className="text-3xl font-black">{exam.title}</h1>
        <p className="muted font-semibold">
          {exam.type === "level"
            ? `Everything from ${exam.level}, built like the Goethe exam.`
            : `A check on the lessons of ${exam.id}.`}
        </p>
      </div>
      <ul className="card flex flex-col divide-y divide-[var(--line)] py-0">
        {sections.map((s) => (
          <li key={s.name} className="flex items-center gap-3 py-3">
            <span aria-hidden="true" className="text-2xl">
              {s.icon}
            </span>
            <span className="flex-1">
              <span className="block font-extrabold">{s.name}</span>
              <span className="muted text-sm font-semibold">{s.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="muted text-center text-sm font-semibold">
        About {minutes} min · {exam.pass}% to pass
        {best !== undefined && ` · your best: ${best}%`}
        <br />
        {exam.type === "level"
          ? "Each section counts the same; listening, reading and grammar must each reach the mark too. "
          : "Each try has new questions. "}
        Leaving midway doesn't count.
      </p>
      <button type="button" onClick={onStart} className="btn btn-primary mt-auto">
        {best === undefined ? "Start" : "Try again"}
      </button>
    </main>
  );
}

/** Saves once; on failure keeps the score for a retry. */
export function useExamSave(exam: CourseExam) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [, start] = useTransition();
  const [percent, setPercent] = useState(0);
  function save(value: number) {
    setPercent(value);
    setState("saving");
    start(async () => {
      try {
        await recordExam(exam.id, value);
        setState("saved");
      } catch {
        setState("failed");
      }
    });
  }
  return { state, percent, save, retry: () => save(percent) };
}

/** The result: passed or not, by section, and what's next. */
export function ExamResult({
  exam,
  percent,
  sections,
  state,
  onRetry,
}: {
  exam: CourseExam;
  percent: number;
  sections: { name: string; score: number; total: number }[];
  state: "idle" | "saving" | "saved" | "failed";
  onRetry: () => void;
}): ReactNode {
  const passed = percent >= exam.pass;
  return (
    <main className="screen justify-center text-center">
      <span aria-hidden="true" className="icon mx-auto size-24 bg-[var(--brand-soft)] text-6xl">
        {passed ? (exam.type === "level" ? "🏆" : "🎉") : "💪"}
      </span>
      <p className="text-3xl font-black">{passed ? `${exam.id} bestanden!` : "Not yet"}</p>
      <p className="text-5xl font-black text-[var(--brand)]">{percent}%</p>
      <p className="muted font-semibold">
        {passed
          ? exam.type === "level"
            ? `You passed the ${exam.level} exam. Time for the next level.`
            : `${exam.id} is done. On to the next part.`
          : `You need ${exam.pass}%. Review the lessons it showed you were unsure about, then try again; every attempt has new questions.`}
      </p>
      <ul className="card flex flex-col divide-y divide-[var(--line)] py-0 text-left">
        {sections.map((s) => (
          <li key={s.name} className="flex justify-between py-2 font-bold">
            <span>{s.name}</span>
            <span>
              {s.score}/{s.total}
            </span>
          </li>
        ))}
      </ul>
      {state === "failed" ? (
        <button type="button" onClick={onRetry} className="btn btn-primary">
          Couldn't save: retry
        </button>
      ) : state === "saved" ? (
        <Back href="/" className="btn btn-primary">
          Continue
        </Back>
      ) : (
        <button type="button" disabled className="btn btn-primary opacity-50">
          Saving…
        </button>
      )}
      <Back href="/learn" className="btn">
        Course
      </Back>
    </main>
  );
}
