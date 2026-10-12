"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { articleColor, isCorrect } from "@/lib/german";
import type { ReviewItem } from "@/lib/review";
import { gradeAndNext } from "./actions";

const GRADES = [
  { rating: 1, label: "Again", className: "bg-red-600" },
  { rating: 2, label: "Hard", className: "bg-amber-600" },
  { rating: 3, label: "Good", className: "bg-green-600" },
  { rating: 4, label: "Easy", className: "bg-sky-600" },
];

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  speechSynthesis.speak(utterance);
}

function German({ word }: { word: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(word)}
      className={`text-3xl font-semibold ${articleColor(word)}`}
      title="Listen"
    >
      {word}{" "}
      <span aria-hidden="true" className="text-xl opacity-50">
        🔊
      </span>
    </button>
  );
}

type Props = { first: ReviewItem | null };

export function Review({ first }: Props) {
  const [item, setItem] = useState(first);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const shownAt = useRef(Date.now());

  useEffect(() => {
    if (item?.direction === "de_en") speak(item.note.de);
  }, [item]);

  function reveal() {
    setRevealed(true);
    if (item?.direction === "en_de") speak(item.note.de);
  }

  function answer(rating: number) {
    if (!item || pending) return;
    const duration = Date.now() - shownAt.current;
    startTransition(async () => {
      const next = await gradeAndNext(item.cardId, rating, duration, item.reps);
      // Reset in the same update as the new card, so its answer never flashes for a frame.
      setRevealed(false);
      setTyped("");
      shownAt.current = Date.now();
      setItem(next);
    });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        reveal();
      } else if (revealed && ["1", "2", "3", "4"].includes(event.key)) answer(Number(event.key));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!item) {
    return (
      <main className="mx-auto mt-24 max-w-md text-center">
        <p className="text-2xl">Fertig für heute! 🎉</p>
        <Link href="/" className="btn mt-6 inline-block">
          Back
        </Link>
      </main>
    );
  }

  const { note } = item;
  const right = item.direction === "en_de" && typed && isCorrect(typed, note.de);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="flex justify-between text-sm opacity-60">
        <Link href="/">← merk</Link>
        <span>
          {note.cefr} · {item.isNew ? "new" : "review"} ·{" "}
          <Link href={`/words/${encodeURIComponent(note.id)}?back=review`}>Edit</Link>
        </span>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {item.direction === "de_en" ? (
          <German word={note.de} />
        ) : (
          <>
            <p className="text-3xl font-semibold">{note.en}</p>
            <form
              className="mt-4 w-full"
              onSubmit={(event) => {
                event.preventDefault();
                reveal();
              }}
            >
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                disabled={revealed}
                lang="de"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Auf Deutsch… (ae, oe, ue, ss ok)"
                aria-label="Your answer in German"
                className="field w-full text-center text-xl"
              />
            </form>
          </>
        )}

        {revealed && (
          <div className="mt-4 flex w-full flex-col gap-3 border-t border-current/10 pt-4">
            {item.direction === "de_en" ? (
              <>
                <p className="text-2xl">{note.en}</p>
              </>
            ) : (
              <>
                {typed && (
                  <p className={right ? "text-green-600" : "text-red-600"}>
                    {right ? "✓ Richtig" : `✗ ${typed}`}
                  </p>
                )}
                <German word={note.de} />
              </>
            )}
            {note.exampleDe && (
              <button type="button" onClick={() => speak(note.exampleDe ?? "")} className="italic">
                {note.exampleDe}
              </button>
            )}
            {note.exampleEn && <p className="text-sm opacity-70">{note.exampleEn}</p>}
            {note.hint && <p className="text-sm opacity-60">{note.hint}</p>}
          </div>
        )}
      </section>

      <footer className="sticky bottom-0 pb-[env(safe-area-inset-bottom)]">
        {revealed ? (
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <button
                key={g.rating}
                type="button"
                disabled={pending}
                onClick={() => answer(g.rating)}
                className={`btn text-white ${g.className} disabled:opacity-50`}
              >
                {g.label}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" onClick={reveal} className="btn btn-primary w-full">
            Show answer
          </button>
        )}
      </footer>
    </main>
  );
}
