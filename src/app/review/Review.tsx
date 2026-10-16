"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ReviewCard as ReviewItem } from "@/lib/course";
import { CHEERS } from "@/lib/courses";
import { checkWord } from "@/lib/darija";
import {
  articleOf,
  governedPrepositions,
  governsLabel,
  spokenForm,
  type TypedResult,
} from "@/lib/german";
import type { SessionLeft } from "@/lib/review";
import { useCourse, useT } from "../Locale";
import { Exercise } from "../learn/Exercise";
import { Go } from "../Nav";
import { Say } from "../Say";
import { gradeAndNext } from "./actions";
import { German, Headword, SoundToggle, speak, useSpeechUnlock } from "./German";

const GRADES = [
  { rating: 1, label: "Again", className: "[--c:#d63c3c]" },
  { rating: 2, label: "Hard", className: "[--c:#b45f00]" },
  { rating: 3, label: "Good", className: "[--c:#1a7a43]" },
  { rating: 4, label: "Easy", className: "[--c:#0077b6]" },
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

/**
 * Quiet mode cards are picked, not typed: right counts as Hard (recognising is easier than
 * recalling, so the word comes back sooner), wrong as Again.
 */
const PICKED: Record<"right" | "wrong", number[]> = { right: [2], wrong: [1] };

function typedResult(item: ReviewItem | null, typed: string): TypedResult {
  // A phrase can be said many ways: compare yourself, then grade.
  if (item?.direction !== "en_de" || item.note.source.endsWith("phrase")) return "blank";
  return checkWord(typed, item.note);
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
  /** What is left of today's session when it starts; the server updates it after each answer. */
  left: SessionLeft;
  limit: number | null;
  /** Today's lesson part, if not done yet: where the end screen leads. */
  lesson: { href: string; label: string } | null;
};

export function Review({ first, left: initial, limit, lesson }: Props) {
  const [item, setItem] = useState(first);
  const [done, setDone] = useState(0);
  const [left, setLeft] = useState(initial);
  const [remembered, setRemembered] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const shownAt = useRef(Date.now());
  useSpeechUnlock();
  const t = useT();
  const course = useCourse();
  const cheer = CHEERS[course];

  const ended = limit !== null && done >= limit;
  const router = useRouter();
  // Answers aren't revalidated one by one (that would slow each card): pages kept in the
  // browser (Today's counts, this session's first card) are dropped once you leave the session,
  // whichever way: ✕, Done, Edit, the browser's back.
  const answered = useRef(0);
  answered.current = done;
  useEffect(
    () => () => {
      if (answered.current > 0) router.refresh();
    },
    [router],
  );
  useEffect(() => {
    // Not behind the end-of-session screen.
    if (item?.direction === "de_en" && !ended) speak(spokenForm(item.note.de));
  }, [item, ended]);

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
      setPicked(null);
      shownAt.current = Date.now();
      setItem(next.item);
      setLeft(next.left);
    });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // Inputs, unit exercises and Quiet mode options handle their own keys.
      if (event.target instanceof HTMLInputElement || item?.exercise || item?.choices) return;
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

  // Cards still to see; a missed one adds a repeat, so the count can grow by one on "Again".
  const toGo = Math.min(
    left.reviews + left.repeats + left.fresh,
    limit === null ? Number.POSITIVE_INFINITY : Math.max(limit - done, 0),
  );
  const rate = done ? Math.round((100 * remembered) / done) : null;
  const toLater = left.reviews + left.repeats + left.fresh;

  if (!item || ended) {
    return (
      <main className="screen justify-center text-center">
        <span aria-hidden="true" className="icon mx-auto size-24 bg-[var(--brand-soft)] text-6xl">
          {item ? "☕" : "🎉"}
        </span>
        <p className="text-3xl font-black">{item ? t("Session done!") : cheer.doneToday}</p>
        <p className="muted font-semibold">
          {done ? `${t("{n} answers · {rate}% remembered.", { n: done, rate: rate ?? 0 })} ` : ""}
          {item
            ? t(
                toLater === 1
                  ? "{n} card is left for another session."
                  : "{n} cards are left for another session.",
                { n: toLater },
              )
            : done
              ? t("Nothing else is due right now. New words come tomorrow.")
              : t("Nothing is due right now. New words come tomorrow.")}
        </p>
        <div className="flex w-full flex-col gap-3">
          {lesson ? (
            <Go href={lesson.href} className="btn btn-primary">
              {t("Today's lesson:")} {lesson.label}
            </Go>
          ) : item ? (
            <a href="/review" className="btn btn-primary">
              {t("Keep going")}
            </a>
          ) : (
            <a href="/practice" className="btn btn-primary">
              {t("Practise more")}
            </a>
          )}
          <Go href="/" className="btn">
            {t("Done for now")}
          </Go>
        </div>
      </main>
    );
  }

  /** What the counter says: the parts that are left, e.g. "3 new · 5 reviews · 2 repeats". */
  const parts = [
    left.fresh && t("{n} new", { n: left.fresh }),
    left.reviews && t(left.reviews === 1 ? "{n} review" : "{n} reviews", { n: left.reviews }),
    left.repeats && t(left.repeats === 1 ? "{n} repeat" : "{n} repeats", { n: left.repeats }),
  ].filter(Boolean);
  /** ✕, progress through the session, what is left, sound switch. */
  const header = (chip: React.ReactNode) => (
    <header className="flex flex-col gap-2">
      <div className="topbar">
        <Go href="/" className="muted text-2xl font-black" aria-label={t("Stop reviewing")}>
          ✕
        </Go>
        <div
          role="progressbar"
          aria-label={t("Session progress")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((100 * done) / (done + toGo || 1))}
          className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--line)]"
        >
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300"
            style={{ width: `${(100 * done) / (done + toGo || 1)}%` }}
          />
        </div>
        <SoundToggle />
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        {chip}
        <span className="muted text-right font-bold">
          {toGo <= 1 ? t("Last card") : t("{n} to go", { n: toGo })}
          {parts.length > 1 && (
            <span className="block text-xs font-semibold">{parts.join(" · ")}</span>
          )}
        </span>
      </div>
    </header>
  );

  const { note } = item;
  if (item.exercise) {
    return (
      <main className="screen">
        {header(<span className="chip muted line border">🎓 {note.de}</span>)}
        {/* Right counts as Good, wrong as Again: the exercise is checked, not self-graded. */}
        <Exercise
          key={item.cardId + item.reps}
          item={item.exercise}
          onDone={(right) => answer(right ? 3 : 1)}
        />
      </main>
    );
  }
  const { choices } = item;
  const pick = picked === null ? undefined : choices?.options[picked];
  const pickedResult = pick && (picked === choices?.answer ? "right" : "wrong");
  const result = pickedResult ?? typedResult(item, typed);
  const ratings = pickedResult ? PICKED[pickedResult] : RATINGS[result];

  const message = {
    right: `✓ ${cheer.right}`,
    almost: `≈ ${t("Almost: check the spelling")}`,
    article: `✗ ${t("Article:")} ${articleOf(note.de)}`,
    wrong: `✗ ${pick ? (pick.tr ?? pick.de) : typed}`,
    blank: typed.trim() ? `${t("You wrote:")} ${typed.trim()}` : "",
  }[result];

  return (
    <main className="screen">
      {header(
        <span className="chip muted line border">
          {note.cefr} · {item.isNew ? t("new") : t("review")}
          {/* Only once revealed: the edit form shows the answer. */}
          {revealed && (
            <>
              {" · "}
              <Go href={`/words/${encodeURIComponent(note.id)}?back=review`}>{t("Edit")}</Go>
            </>
          )}
        </span>,
      )}

      <section className="card flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {item.direction === "de_en" ? (
          <>
            <German word={note.de} tr={note.tr} />
            {note.governs && <p className="muted font-bold">{governsLabel(note.governs)}</p>}
          </>
        ) : (
          <>
            <p className="muted text-sm font-extrabold">
              {course === "ary" ? t("Write this in Darija") : t("Write this in German")}
            </p>
            <p className="text-3xl font-black">
              {note.en}
              {/* Says a preposition belongs to the answer, without giving it away. */}
              {governedPrepositions(note.governs).length > 0 && (
                <span className="muted text-lg"> · {t("+ prep.")}</span>
              )}
            </p>
            {choices ? (
              <div className="mt-4 grid w-full grid-cols-2 gap-2">
                {choices.options.map((option, i) => (
                  <button
                    key={option.de}
                    type="button"
                    disabled={revealed}
                    onClick={() => {
                      setPicked(i);
                      reveal();
                    }}
                    className={`btn normal-case ${picked === i ? "border-[var(--brand)] bg-[var(--brand-soft)]" : ""}`}
                  >
                    <Headword de={option.de} tr={option.tr} />
                  </button>
                ))}
              </div>
            ) : (
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
                  lang={course === "ary" ? "fr" : "de"}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={cheer.type}
                  aria-label={t("Your answer in German")}
                  className="field w-full text-center text-xl font-bold"
                />
              </form>
            )}
          </>
        )}

        {revealed && (
          <div className="line mt-4 flex w-full flex-col gap-3 border-t-2 pt-4">
            {item.direction === "de_en" ? (
              <p className="text-2xl font-extrabold">{note.en}</p>
            ) : (
              <>
                {message && <p className={`chip mx-auto ${FEEDBACK[result]}`}>{message}</p>}
                <German word={note.de} tr={note.tr} />
                {note.governs && <p className="muted font-bold">{governsLabel(note.governs)}</p>}
              </>
            )}
            {note.exampleDe && (
              <button
                type="button"
                onClick={() => speak(note.exampleDe ?? "")}
                className="font-semibold"
              >
                <Say de={note.exampleDe} tr={note.exampleTr ?? undefined} />
              </button>
            )}
            {note.exampleEn && <p className="muted text-sm">{note.exampleEn}</p>}
            {note.hint && <p className="muted text-sm">{note.hint}</p>}
            {item.lapses >= TRICKY && (
              <Go
                href={`/words/${encodeURIComponent(note.id)}?back=review`}
                className="chip mx-auto bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              >
                🧠 {t("Tricky word: add a memory hook")}
              </Go>
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
                  {ratings.length === 1 ? t("Continue") : t(g.label)}
                </button>
              ))}
            </div>
            {ratings.includes(1) && (
              <p className="muted text-center text-xs font-semibold">
                {ratings.length === 1
                  ? t("It comes back in about 10 minutes.")
                  : t("Again: comes back in about 10 minutes.")}
              </p>
            )}
            {result === "wrong" && !choices && (
              <button type="button" disabled={pending} onClick={() => answer(3)} className="btn">
                {t("I was right")}
              </button>
            )}
          </div>
        ) : choices ? null : (
          <button type="button" onClick={reveal} className="btn btn-primary w-full">
            {t("Show answer")}
          </button>
        )}
      </footer>
    </main>
  );
}
