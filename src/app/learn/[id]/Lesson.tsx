"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { Unit, UnitItem } from "@/lib/units";
import { SoundToggle, speak, useSpeechUnlock } from "../../review/German";
import { recordUnit } from "../actions";
import { Exercise } from "../Exercise";
import { Prose } from "../Prose";

const DRILL = 12;

type Step = "learn" | "drill" | "check" | "done";

/** Explanation → 12 practice exercises → a 6-exercise check on items not practised. */
export function Lesson({
  unit,
  checkSize,
  pass,
  next,
}: {
  unit: Unit;
  checkSize: number;
  pass: number;
  next: string | null;
}) {
  useSpeechUnlock();
  const [step, setStep] = useState<Step>("learn");
  // Shuffled after mount: a random order on the server would not match the browser.
  const [order, setOrder] = useState<UnitItem[]>([]);
  useEffect(() => setOrder([...unit.items].sort(() => Math.random() - 0.5)), [unit]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [saving, startSaving] = useTransition();

  const items = step === "drill" ? order.slice(0, DRILL) : order.slice(DRILL, DRILL + checkSize);
  const item = items[index];

  function done(right: boolean) {
    const newScore = step === "check" && right ? score + 1 : score;
    setScore(newScore);
    if (index + 1 < items.length) return setIndex(index + 1);
    setIndex(0);
    if (step === "drill") return setStep("check");
    startSaving(async () => {
      await recordUnit(unit.id, newScore);
      setStep("done");
    });
  }

  if (step === "learn") {
    return (
      <main className="screen">
        <header className="topbar">
          <Link href="/learn" className="muted text-2xl font-black" aria-label="Back to the course">
            ✕
          </Link>
          <span className="chip muted line border-2">{unit.cefr}</span>
          <SoundToggle />
        </header>
        <div>
          <p className="muted text-sm font-extrabold tracking-wide uppercase">{unit.situation}</p>
          <h1 className="text-3xl font-black">{unit.title}</h1>
          <p className="muted mt-1 font-semibold">{unit.canDo}</p>
        </div>
        <section className="card">
          <Prose text={unit.explanation} />
        </section>
        {unit.french && (
          <p className="chip bg-sky-100 py-3 font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-200">
            🇫🇷 {unit.french}
          </p>
        )}
        <section className="card flex flex-col divide-y-2 divide-[var(--line)] py-0">
          {unit.examples.map((example) => (
            <button
              key={example.de}
              type="button"
              onClick={() => speak(example.de)}
              className="py-3 text-left"
            >
              <span className="block font-bold">{example.de} 🔊</span>
              <span className="muted text-sm">{example.en}</span>
            </button>
          ))}
        </section>
        <button type="button" onClick={() => setStep("drill")} className="btn btn-primary">
          Practise
        </button>
      </main>
    );
  }

  if (step === "done") {
    const passed = score >= pass;
    return (
      <main className="screen justify-center text-center">
        <span className="icon mx-auto size-24 bg-[var(--brand-soft)] text-6xl">
          {passed ? "🎉" : "💪"}
        </span>
        <p className="text-3xl font-black">{passed ? "Unit done!" : "Almost there"}</p>
        <p className="text-5xl font-black text-[var(--brand)]">
          {score}/{checkSize}
        </p>
        <p className="muted font-semibold">
          {passed
            ? "It will come back in your reviews, so it sticks."
            : `You need ${pass} to pass. Try it again another day; the next unit is open anyway.`}
        </p>
        {next && (
          <Link href={`/learn/${next}`} className="btn btn-primary">
            Next unit
          </Link>
        )}
        <Link href="/" className="btn">
          Home
        </Link>
      </main>
    );
  }

  return (
    <main className="screen">
      <header className="topbar">
        <Link href="/learn" className="muted text-2xl font-black" aria-label="Stop the lesson">
          ✕
        </Link>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300"
            style={{
              width: `${((step === "check" ? DRILL : 0) + index) * (100 / (DRILL + checkSize))}%`,
            }}
          />
        </div>
        <SoundToggle />
      </header>
      <p className="chip self-start bg-[var(--brand-soft)] text-[var(--brand)]">
        {step === "drill" ? `Practice ${index + 1}/${DRILL}` : `Check ${index + 1}/${checkSize}`}
      </p>
      {item && !saving && <Exercise key={`${step}-${item.id}`} item={item} onDone={done} />}
    </main>
  );
}
