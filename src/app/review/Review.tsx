"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ReviewCard as ReviewItem } from "@/lib/course";
import {
  articleOf,
  checkTyped,
  governedPrepositions,
  governsLabel,
  spokenForm,
  type TypedResult,
} from "@/lib/german";
import { Exercise } from "../learn/Exercise";
import { gradeAndNext } from "./actions";
import { German, SoundToggle, speak, useSpeechUnlock } from "./German";

const GRADES = [
  { rating: 1, label: "Again", className: "[--c:#d61f1f] [--edge:#a51515]" },
  { rating: 2, label: "Hard", className: "[--c:#b45f00] [--edge:#8a4800]" },
  { rating: 3, label: "Good", className: "[--c:#2f7d00] [--edge:#235e00]" },
  { rating: 4, label: "Easy", className: "[--c:#0077b6] [--edge:#005a8a]" },
];

/**
 * Grades on offer. A typed answer is checked for you, so a wrong one can't be graded Good by
 * accident (people overrate what they know); "I was right" covers answers the check can't know,
 * like a synonym. German→English and blank answers are graded by you.
 */
const RATINGS: Record<TypedResult, number[]> = {
  right: [2, 3, 4],
  almost: [1, 2],
  article: [1],
  wrong: [1],
  blank: [1, 2, 3, 4],
};

function typedResult(item: ReviewItem | null, typed: string): TypedResult {
  // A phrase can be said many ways: compare yourself, then grade.
  if (item?.direction !== "en_de" || item.note.source === "phrase") return "blank";
  return checkTyped(typed, item.note.de, item.note.governs);
}

const FEEDBACK: Record<TypedResult, string> = {
  right: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  almost: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  article: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  wrong: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  blank: "bg-[var(--field)]",
};

/** A card forgotten this often gets a nudge to add a memory hook (in the hint). */
const TRICKY = 8;

type Props = {
  first: ReviewItem | null;
  /** Cards in this session, as far as known at the start (new learning steps may add some). */
  total: number;
  limit: number | null;
  /** Today's lesson part, if not done yet: where the end screen leads. */
  lesson: { href: string; label: string } | null;
};

export function Review({ first, total, limit, lesson }: Props) {
  const [item, setItem] = useState(first);
  const [done, setDone] = useState(0);
  const [remembered, setRemembered] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const shownAt = useRef(Date.now());
  useSpeechUnlock();

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
    setDone((n) => n + 1);
    if (rating > 1) setRemembered((n) => n + 1);
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
      // Inputs and unit exercises handle their own keys.
      if (event.target instanceof HTMLInputElement || item?.exercise) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        reveal();
      } else if (revealed) {
        const result = typedResult(item, typed);
        // 3 on a wrong answer is the "I was right" button.
        if (
          RATINGS[result].includes(Number(event.key)) ||
          (result === "wrong" && event.key === "3")
        ) {
          answer(Number(event.key));
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!item || (limit !== null && done >= limit)) {
    const rate = done ? Math.round((100 * remembered) / done) : null;
    return (
      <main className="screen justify-center text-center">
        <span aria-hidden="true" className="icon mx-auto size-24 bg-[var(--brand-soft)] text-6xl">
          {item ? "☕" : "🎉"}
        </span>
        <p className="text-3xl font-black">{item ? "Session done!" : "Fertig für heute!"}</p>
        <p className="muted font-semibold">
          {done ? `${done} cards · ${rate}% remembered` : "Nothing was due."}
          {item ? " The rest waits for your next session." : ""}
        </p>
        <div className="flex w-full flex-col gap-3">
          {lesson ? (
            <Link href={lesson.href} className="btn btn-primary">
              Today's lesson: {lesson.label}
            </Link>
          ) : item ? (
            <a href="/review" className="btn btn-primary">
              Keep going
            </a>
          ) : (
            <a href="/practice" className="btn btn-primary">
              Practise more
            </a>
          )}
          <Link href="/" className="btn">
            Done for now
          </Link>
        </div>
      </main>
    );
  }

  /** ✕, progress through the session, cards left, sound switch. */
  const left = Math.max(total - done, 0);
  const header = (chip: React.ReactNode) => (
    <header className="flex flex-col gap-2">
      <div className="topbar">
        <Link href="/" className="muted text-2xl font-black" aria-label="Stop reviewing">
          ✕
        </Link>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300"
            style={{ width: `${total ? Math.min(100, (100 * done) / total) : 0}%` }}
          />
        </div>
        <SoundToggle />
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        {chip}
        <span className="muted font-bold">{left ? `${left} left` : "almost done"}</span>
      </div>
    </header>
  );

  const { note } = item;
  if (item.exercise) {
    return (
      <main className="screen">
        {header(<span className="chip muted line border-2">🎓 {note.de}</span>)}
        {/* Right counts as Good, wrong as Again: the exercise is checked, not self-graded. */}
        <Exercise
          key={item.cardId + item.reps}
          item={item.exercise}
          onDone={(right) => answer(right ? 3 : 1)}
        />
      </main>
    );
  }
  const result = typedResult(item, typed);
  const ratings = RATINGS[result];
  const message = {
    right: "✓ Richtig!",
    almost: "≈ Almost: check the spelling",
    article: `✗ Article: ${articleOf(note.de)}`,
    wrong: `✗ ${typed}`,
    blank: typed.trim() ? `You wrote: ${typed.trim()}` : "",
  }[result];

  return (
    <main className="screen">
      {header(
        <span className="chip muted line border-2">
          {note.cefr} · {item.isNew ? "new" : "review"}
          {/* Only once revealed: the edit form shows the answer. */}
          {revealed && (
            <>
              {" · "}
              <Link href={`/words/${encodeURIComponent(note.id)}?back=review`}>Edit</Link>
            </>
          )}
        </span>,
      )}

      <section className="card flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {item.direction === "de_en" ? (
          <>
            <German word={note.de} />
            {note.governs && <p className="muted font-bold">{governsLabel(note.governs)}</p>}
          </>
        ) : (
          <>
            <p className="muted text-sm font-extrabold tracking-wide uppercase">
              Write this in German
            </p>
            <p className="text-3xl font-black">
              {note.en}
              {/* Says a preposition belongs to the answer, without giving it away. */}
              {governedPrepositions(note.governs).length > 0 && (
                <span className="muted text-lg"> · + prep.</span>
              )}
            </p>
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
                {message && <p className={`chip mx-auto ${FEEDBACK[result]}`}>{message}</p>}
                <German word={note.de} />
                {note.governs && <p className="muted font-bold">{governsLabel(note.governs)}</p>}
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
            {item.lapses >= TRICKY && (
              <Link
                href={`/words/${encodeURIComponent(note.id)}?back=review`}
                className="chip mx-auto bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              >
                🧠 Tricky word: add a memory hook
              </Link>
            )}
          </div>
        )}
      </section>

      <footer className="sticky bottom-0 pb-[env(safe-area-inset-bottom)]">
        {revealed ? (
          <div className="flex flex-col gap-2">
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${ratings.length}, 1fr)` }}
            >
              {GRADES.filter((g) => ratings.includes(g.rating)).map((g) => (
                <button
                  key={g.rating}
                  type="button"
                  disabled={pending}
                  onClick={() => answer(g.rating)}
                  className={`btn btn-solid px-1 text-sm ${g.className} disabled:opacity-50`}
                >
                  {ratings.length === 1 ? "Continue" : g.label}
                </button>
              ))}
            </div>
            {result === "wrong" && (
              <button type="button" disabled={pending} onClick={() => answer(3)} className="btn">
                I was right
              </button>
            )}
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
