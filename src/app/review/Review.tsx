"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { isCorrect, spokenForm } from "@/lib/german";
import type { ReviewItem } from "@/lib/review";
import { gradeAndNext } from "./actions";
import { German, SoundToggle, speak } from "./German";

const GRADES = [
  { rating: 1, label: "Again", className: "[--c:#d61f1f] [--edge:#a51515]" },
  { rating: 2, label: "Hard", className: "[--c:#b45f00] [--edge:#8a4800]" },
  { rating: 3, label: "Good", className: "[--c:#2f7d00] [--edge:#235e00]" },
  { rating: 4, label: "Easy", className: "[--c:#0077b6] [--edge:#005a8a]" },
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
      <main className="screen justify-center text-center">
        <span className="icon mx-auto size-24 bg-[var(--brand-soft)] text-6xl">🎉</span>
        <p className="text-3xl font-black">Fertig für heute!</p>
        <p className="muted font-semibold">Everything due is done. Bis morgen!</p>
        <div className="flex w-full flex-col gap-3">
          <a href="/practice?scope=today" className="btn btn-primary">
            Practice today's words
          </a>
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
        <Link href="/" className="muted text-2xl font-black" aria-label="Stop reviewing">
          ✕
        </Link>
        <span className="chip muted line border-2">
          {note.cefr} · {item.isNew ? "new" : "review"}
          {/* Only once revealed: the edit form shows the answer. */}
          {revealed && (
            <>
              {" · "}
              <Link href={`/words/${encodeURIComponent(note.id)}?back=review`}>Edit</Link>
            </>
          )}
        </span>
        <SoundToggle />
      </header>

      <section className="card flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {item.direction === "de_en" ? (
          <German word={note.de} />
        ) : (
          <>
            <p className="muted text-sm font-extrabold tracking-wide uppercase">
              Write this in German
            </p>
            <p className="text-3xl font-black">{note.en}</p>
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
                className="field w-full text-center text-xl font-bold"
              />
            </form>
          </>
        )}

        {revealed && (
          <div className="line mt-4 flex w-full flex-col gap-3 border-t-2 pt-4">
            {item.direction === "de_en" ? (
              <>
                <p className="text-2xl font-extrabold">{note.en}</p>
              </>
            ) : (
              <>
                {typed && (
                  <p
                    className={`chip mx-auto ${right ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"}`}
                  >
                    {right ? "✓ Richtig!" : `✗ ${typed}`}
                  </p>
                )}
                <German word={note.de} />
              </>
            )}
            {note.exampleDe && (
              <button
                type="button"
                onClick={() => speak(note.exampleDe ?? "")}
                className="font-semibold"
              >
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
                className={`btn btn-solid px-1 text-sm ${g.className} disabled:opacity-50`}
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
