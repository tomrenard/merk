"use client";

import { useEffect, useState, useTransition } from "react";
import { quietItem } from "@/lib/choices";
import { spokenForm } from "@/lib/german";
import { shuffled } from "@/lib/shuffle";
import type { Unit, UnitItem } from "@/lib/units";
import { useQuiet, useT } from "../../../Locale";
import { Go } from "../../../Nav";
import { Headword, SoundToggle, speak, useSpeechUnlock } from "../../../review/German";
import { Say } from "../../../Say";
import { learnWords, recordUnit } from "../../actions";
import { Exercise } from "../../Exercise";
import { Prose } from "../../Prose";

const DRILL = 12;

type Step = "learn" | "drill" | "check" | "done";

/** Explanation → 12 practice exercises → a 6-exercise check on items not practised. */
export function Lesson({
  unit,
  words,
  checkSize,
  pass,
  next,
  testOut,
}: {
  unit: Unit;
  /** Topic lessons: the theme's words, shown first. */
  words: { de: string; en: string; started: boolean }[];
  checkSize: number;
  pass: number;
  /** Where to go after the unit's grammar. */
  next: { href: string; label: string } | null;
  /** Test-out: straight to the check; passing it marks the whole unit done. */
  testOut: boolean;
}) {
  useSpeechUnlock();
  const t = useT();
  const [step, setStep] = useState<Step>(testOut ? "check" : "learn");
  // Shuffled in the browser only: a different order on the server would break hydration.
  const [order, setOrder] = useState<UnitItem[]>([]);
  const quiet = useQuiet();
  useEffect(
    () => setOrder(shuffled(quiet ? unit.items.map((item) => quietItem(unit, item)) : unit.items)),
    [unit, quiet],
  );
  const [saveFailed, setSaveFailed] = useState(false);
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
    save(newScore);
  }

  /** Saves the check; on failure (offline, server down) the score is kept for a retry. */
  function save(final: number) {
    startSaving(async () => {
      try {
        await recordUnit(unit.id, final, testOut);
        setSaveFailed(false);
      } catch {
        setSaveFailed(true);
      }
      setStep("done");
    });
  }

  if (step === "learn") {
    return (
      <main className="screen">
        <header className="topbar">
          <Go
            href={`/learn/${unit.id}`}
            className="muted text-2xl font-black"
            aria-label={t("Back to the unit")}
          >
            ✕
          </Go>
          <span className="chip muted line border">{unit.cefr}</span>
          <SoundToggle />
        </header>
        <div>
          <p className="muted text-sm font-extrabold">{unit.situation}</p>
          <h1 className="text-3xl font-black">{unit.title}</h1>
          <p className="muted mt-1 font-semibold">{unit.canDo}</p>
        </div>
        {words.length > 0 && (
          <>
            <section className="card flex flex-col divide-y divide-[var(--line)] py-0">
              {words.map((word) => (
                <button
                  key={`${word.de}|${word.en}`}
                  type="button"
                  onClick={() => speak(spokenForm(word.de), { recorded: true })}
                  className="flex items-center gap-3 py-3 text-left"
                >
                  <span className="flex-1">
                    <Headword de={word.de} className="block font-bold" />
                    <span className="muted text-sm">{word.en}</span>
                  </span>
                  <span aria-hidden="true" className="text-sm opacity-50">
                    {word.started ? "✓" : "🔊"}
                  </span>
                </button>
              ))}
            </section>
            {words.some((word) => !word.started) && (
              <form action={learnWords}>
                <input type="hidden" name="unit" value={unit.id} />
                <button type="submit" className="btn w-full">
                  🌱{" "}
                  {t("Learn the {n} new ones in my reviews", {
                    n: words.filter((word) => !word.started).length,
                  })}
                </button>
              </form>
            )}
          </>
        )}
        {words.length > 0 ? (
          <details className="card">
            <summary className="cursor-pointer font-extrabold">{t("About this topic")}</summary>
            <div className="mt-3">
              <Prose text={unit.explanation} />
            </div>
          </details>
        ) : (
          <section className="card">
            <Prose text={unit.explanation} />
          </section>
        )}
        {unit.french && (
          <p className="chip bg-sky-100 py-3 font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-200">
            🇫🇷 {unit.french}
          </p>
        )}
        <section className="card flex flex-col divide-y divide-[var(--line)] py-0">
          {unit.examples.map((example) => (
            <button
              key={example.de}
              type="button"
              onClick={() => speak(example.de, { recorded: true })}
              className="py-3 text-left"
            >
              <span className="block font-bold">
                <Say de={example.de} tr={example.tr} /> 🔊
              </span>

              <span className="muted text-sm">{example.en}</span>
            </button>
          ))}
        </section>
        <button type="button" onClick={() => setStep("drill")} className="btn btn-primary">
          {t("Practise")}
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
        <p className="text-3xl font-black">
          {passed ? (testOut ? t("You know this unit!") : t("Unit done!")) : t("Almost there")}
        </p>
        <p className="text-5xl font-black text-[var(--brand)]">
          {score}/{checkSize}
        </p>
        <p className="muted font-semibold">
          {passed
            ? t("It will come back in your reviews, so it sticks.")
            : t(
                "You need {pass} to pass. Try the check again another day; the rest of the course stays open.",
                { pass },
              )}
        </p>
        {saveFailed && (
          <button
            type="button"
            disabled={saving}
            onClick={() => save(score)}
            className="btn btn-primary"
          >
            {t("Couldn't save: retry")}
          </button>
        )}
        {!saveFailed && next && (
          <Go
            href={testOut ? (passed ? "/learn" : `/learn/${unit.id}/grammar`) : next.href}
            className="btn btn-primary"
          >
            {testOut ? (passed ? t("Back to the course") : t("Learn this unit")) : next.label}
          </Go>
        )}
        <Go href="/" className="btn">
          {t("Home")}
        </Go>
      </main>
    );
  }

  return (
    <main className="screen">
      <header className="topbar">
        <Go
          href={`/learn/${unit.id}`}
          className="muted text-2xl font-black"
          aria-label={t("Stop the lesson")}
        >
          ✕
        </Go>
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
        {step === "drill"
          ? t("Practice {n}/{total}", { n: index + 1, total: DRILL })
          : t("Check {n}/{total}", { n: index + 1, total: checkSize })}
      </p>
      {item && !saving && <Exercise key={`${step}-${item.id}`} item={item} onDone={done} />}
    </main>
  );
}
