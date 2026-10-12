"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { isCorrect, spokenForm } from "@/lib/german";
import type { ReviewItem } from "@/lib/review";
import { gradeAndNext } from "./actions";
import { German, SoundToggle, speak } from "./German";

const GRADES = [
  { rating: 1, label: "Again", className: "bg-rose-600 [--edge:#881337]" },
  { rating: 2, label: "Hard", className: "bg-amber-600 [--edge:#78350f]" },
  { rating: 3, label: "Good", className: "bg-emerald-600 [--edge:#064e3b]" },
  { rating: 4, label: "Easy", className: "bg-sky-600 [--edge:#0c4a6e]" },
];

type Props = { first: ReviewItem | null };

export function Review({ first }: Props) {
  const [item, setItem] = useState(first);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const shownAt = useRef(Date.now());

  useEffect(() => {
    if (item?.direction === "de_en") speak(spokenForm(item.note.de));
  }, [item]);

  function reveal() {
    setRevealed(true);
    if (item?.direction === "en_de") speak(spokenForm(item.note.de));
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
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-5 text-center">
        <p className="text-7xl">🎉</p>
        <p className="text-3xl font-extrabold">Fertig für heute!</p>
        <div className="flex w-full flex-col gap-3">
          <Link href="/practice" className="btn btn-primary">
            🎯 Practice today's words
          </Link>
          <Link href="/" className="btn">
            Home
          </Link>
        </div>
      </main>
    );
  }

  const { note } = item;
  const right = item.direction === "en_de" && typed && isCorrect(typed, note.de);

  return (
    <main className="screen">
      <header className="topbar">
        <Link href="/" className="pill">
          ← merk
        </Link>
        <SoundToggle />
        <span className="pill">
          {note.cefr} · {item.isNew ? "new" : "review"}
          {/* Only once revealed: the edit form shows the answer. */}
          {revealed && (
            <>
              {" · "}
              <Link href={`/words/${encodeURIComponent(note.id)}?back=review`}>Edit</Link>
            </>
          )}
        </span>
      </header>

      <section className="card flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {item.direction === "de_en" ? (
          <German word={note.de} />
        ) : (
          <>
            <p className="text-3xl font-bold">{note.en}</p>
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
          <div className="mt-4 flex w-full flex-col gap-3 border-t-2 border-dashed border-current/10 pt-4">
            {item.direction === "de_en" ? (
              <>
                <p className="text-2xl font-semibold">{note.en}</p>
              </>
            ) : (
              <>
                {typed && (
                  <p
                    className={`font-bold ${right ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                  >
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
            {note.exampleEn && <p className="muted text-sm">{note.exampleEn}</p>}
            {note.hint && <p className="muted text-sm">{note.hint}</p>}
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
                className={`btn px-1 text-white ${g.className} disabled:opacity-50`}
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
