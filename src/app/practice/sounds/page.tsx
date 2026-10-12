"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { shuffled } from "@/lib/shuffle";
import { PAIRS, type Pair } from "@/lib/sounds";
import { PANEL } from "../../feedback";
import { SoundToggle, speak, useSpeechUnlock } from "../../review/German";

const ROUND = 12;
type Item = { pair: Pair; said: 0 | 1 };

/** ROUND random pairs, each with one of its two words picked to be said. */
const fresh = (): Item[] =>
  shuffled(PAIRS)
    .slice(0, ROUND)
    .map((pair) => ({ pair, said: Math.random() < 0.5 ? 0 : 1 }));

/** Hear one word of a pair that sounds alike to a French ear, and tap which one it was. */
export default function SoundsPage() {
  useSpeechUnlock();
  // Made after mount: random items would differ between the server and the browser.
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => setItems(fresh()), []);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [score, setScore] = useState(0);
  const item = items[index];

  if (items.length && !item) {
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
            setItems(fresh());
            setIndex(0);
            setScore(0);
          }}
          className="btn btn-primary"
        >
          Again
        </button>
        <Link href="/practice" className="btn">
          Done
        </Link>
      </main>
    );
  }

  function pick(choice: 0 | 1) {
    if (!item || picked !== null) return;
    setPicked(choice);
    if (choice === item.said) setScore((s) => s + 1);
  }

  return (
    <main className="screen">
      <header className="topbar">
        <Link href="/practice" className="muted text-2xl font-black" aria-label="Stop">
          ✕
        </Link>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300"
            style={{ width: `${(index / ROUND) * 100}%` }}
          />
        </div>
        <SoundToggle />
      </header>
      <p className="muted pt-6 text-sm font-extrabold">{item?.pair.focus ?? "…"}: which word?</p>
      <button
        type="button"
        onClick={() => item && speak(item.pair.words[item.said])}
        className="btn btn-primary py-5 text-xl"
      >
        🔊 Play
      </button>
      <div className="grid grid-cols-2 gap-3">
        {item?.pair.words.map((word, i) => (
          <button
            key={word}
            type="button"
            onClick={() => pick(i as 0 | 1)}
            className={`btn flex-col py-5 normal-case ${picked !== null && i === item.said ? "border-green-600" : ""} ${picked === i && i !== item.said ? "border-red-600" : ""}`}
          >
            <span className="text-2xl">{word}</span>
            <span className="muted text-xs">{item.pair.en[i]}</span>
          </button>
        ))}
      </div>
      {item && picked !== null && (
        <div className={`rounded-2xl p-4 ${PANEL[picked === item.said ? "right" : "wrong"]}`}>
          <p className="text-xl font-black">
            {picked === item.said ? "✓ Richtig!" : `✗ It was ${item.pair.words[item.said]}`}
          </p>
          <div className="mt-2 flex gap-2">
            {item.pair.words.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => speak(word)}
                className="chip line border"
              >
                🔊 {word}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        disabled={picked === null}
        onClick={() => {
          setPicked(null);
          setIndex(index + 1);
        }}
        className="btn mt-auto disabled:opacity-50"
      >
        Continue
      </button>
    </main>
  );
}
