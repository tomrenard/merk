"use client";

import Link from "next/link";
import { useState } from "react";
import type { notes } from "@/db/schema";
import { isCorrect, spokenForm } from "@/lib/german";
import type { PracticeScope } from "@/lib/review";
import { German, Headword, SoundToggle, speak } from "../review/German";

type Note = typeof notes.$inferSelect;

/** English → typed German over a fixed set, scored at the end. Nothing is saved. */
export function Practice({ words, scope }: { words: Note[]; scope: PracticeScope }) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [missed, setMissed] = useState<Note[]>([]);
  const note = words[index];

  if (!note) {
    const score = words.length - missed.length;
    return (
      <main className="screen text-center">
        <section className="flex flex-col items-center gap-3 pt-10">
          <span className="icon size-24 bg-[var(--brand-soft)] text-6xl">
            {missed.length === 0 ? "🏆" : missed.length <= words.length / 4 ? "💪" : "📖"}
          </span>
          <h1 className="text-3xl font-black">
            {missed.length === 0 ? "Perfekt!" : "Gut gemacht!"}
          </h1>
          <p className="text-5xl font-black text-[var(--brand)]">
            {score}/{words.length}
          </p>
        </section>
        {missed.length > 0 && (
          <section className="text-left">
            <h2 className="muted mb-2 text-sm font-extrabold tracking-wide uppercase">
              To revisit
            </h2>
            <ul className="card divide-y-2 divide-[var(--line)] py-0">
              {missed.map((m) => (
                <li key={m.id} className="py-3">
                  <Headword de={m.de} className="font-extrabold" />{" "}
                  <span className="muted">{m.en}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="mt-auto flex flex-col gap-3">
          {/* A full load, so the server picks a fresh random set. */}
          <a href={`/practice?scope=${scope}`} className="btn btn-primary">
            Practice again
          </a>
          <Link href="/" className="btn">
            Done
          </Link>
        </div>
      </main>
    );
  }

  const right = isCorrect(typed, note.de);

  function submit() {
    if (!note) return;
    if (!checked) {
      setChecked(true);
      if (!right) setMissed((m) => [...m, note]);
      speak(spokenForm(note.de));
      return;
    }
    setChecked(false);
    setTyped("");
    setIndex((i) => i + 1);
  }

  return (
    <main className="screen">
      <header className="topbar">
        <Link href="/practice" className="muted text-2xl font-black" aria-label="Stop practising">
          ✕
        </Link>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300"
            style={{ width: `${(index / words.length) * 100}%` }}
          />
        </div>
        <SoundToggle />
      </header>

      <form
        className="flex flex-1 flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="pt-6">
          <p className="muted text-sm font-extrabold tracking-wide uppercase">
            Write this in German
          </p>
          <p className="mt-2 text-3xl font-black">{note.en}</p>
        </div>
        <input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          readOnly={checked}
          onKeyDown={(event) => event.repeat && event.preventDefault()}
          // biome-ignore lint/a11y/noAutofocus: the input is the whole screen
          autoFocus
          lang="de"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Auf Deutsch… (ae, oe, ue, ss ok)"
          aria-label="Your answer in German"
          className="field w-full text-xl font-bold"
        />

        <div
          className={`-mx-4 mt-auto -mb-6 flex flex-col gap-3 rounded-t-3xl px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${
            checked
              ? right
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
              : ""
          }`}
        >
          {checked && (
            <div className="flex flex-col items-start gap-1">
              <p className="text-xl font-black">{right ? "✓ Richtig!" : "✗ Correct answer:"}</p>
              <German word={note.de} />
              {note.exampleDe && <p className="font-semibold">{note.exampleDe}</p>}
            </div>
          )}
          {/* Keeps focus in the input, so the phone keyboard stays open between words. */}
          <button
            type="submit"
            onMouseDown={(event) => event.preventDefault()}
            className={`btn btn-solid w-full ${
              !checked
                ? "[--c:var(--brand)] [--edge:var(--brand-edge)]"
                : right
                  ? "[--c:#58cc02] [--edge:#58a700]"
                  : "[--c:#ff4b4b] [--edge:#ea2b2b]"
            }`}
          >
            {checked ? "Continue" : "Check"}
          </button>
        </div>
      </form>
    </main>
  );
}
