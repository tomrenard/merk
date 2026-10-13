"use client";

import { useEffect, useState } from "react";
import { type Drill, drills, isRightDrill } from "@/lib/drills";
import { PANEL, SOLID } from "../../feedback";
import { Back } from "../../Nav";
import { SoundToggle, speak } from "../../review/German";

const ROUND = 10;

/** Hear a number, price, time, phone number or spelled name; type what you heard. */
export default function NumbersPage() {
  // Made after mount: random items would differ between the server and the browser.
  const [items, setItems] = useState<Drill[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  useEffect(() => setItems(drills(ROUND)), []);
  const drill = items[index];

  if (items.length && !drill) {
    return (
      <main className="screen justify-center text-center">
        <span className="icon mx-auto size-24 bg-[var(--brand-soft)] text-6xl">
          {score === ROUND ? "🏆" : "👂"}
        </span>
        <p className="text-5xl font-black text-[var(--brand)]">
          {score}/{ROUND}
        </p>
        <button
          type="button"
          onClick={() => {
            setItems(drills(ROUND));
            setIndex(0);
            setScore(0);
          }}
          className="btn btn-primary"
        >
          Again
        </button>
        <Back href="/practice" className="btn">
          Done
        </Back>
      </main>
    );
  }

  const right = drill ? isRightDrill(typed, drill) : false;

  function submit() {
    if (!drill) return;
    if (!checked) {
      setChecked(true);
      if (right) setScore((s) => s + 1);
      return;
    }
    setChecked(false);
    setTyped("");
    setIndex((i) => i + 1);
    const next = items[index + 1];
    if (next) speak(next.say);
  }

  return (
    <main className="screen">
      <header className="topbar">
        <Back href="/practice" className="muted text-2xl font-black" aria-label="Stop">
          ✕
        </Back>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300"
            style={{ width: `${(index / ROUND) * 100}%` }}
          />
        </div>
        <SoundToggle />
      </header>
      <form
        className="flex flex-col gap-5 pt-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <p className="muted text-sm font-extrabold">{drill?.kind ?? "…"}: type what you hear</p>
        {/* Speech needs a tap on iPhone, so each item is played from a button. */}
        <button
          type="button"
          onClick={() => drill && speak(drill.say)}
          className="btn self-start text-2xl"
        >
          🔊 Play
        </button>
        <input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          readOnly={checked}
          inputMode={drill?.kind === "Spelled name" ? "text" : "decimal"}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={
            drill?.kind === "Time" ? "e.g. 3:15" : drill?.kind === "Price" ? "e.g. 3,49" : ""
          }
          aria-label="What you heard"
          className="field w-full text-xl font-bold"
        />
        {checked && drill && (
          <div
            className={`flex flex-col gap-1 rounded-2xl p-4 ${PANEL[right ? "right" : "wrong"]}`}
          >
            <p className="text-xl font-black">{right ? "✓ Richtig!" : `✗ It was ${drill.shown}`}</p>
            <p className="font-semibold">„{drill.say}"</p>
          </div>
        )}
        <button
          type="submit"
          onMouseDown={(event) => event.preventDefault()}
          className={`btn btn-solid w-full ${SOLID[!checked ? "idle" : right ? "right" : "wrong"]}`}
        >
          {checked ? "Continue" : "Check"}
        </button>
      </form>
    </main>
  );
}
