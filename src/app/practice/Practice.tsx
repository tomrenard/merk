"use client";

import { useState } from "react";
import type { notes } from "@/db/schema";
import { isCorrect, spokenForm } from "@/lib/german";
import type { PracticeScope } from "@/lib/review";
import { German, Headword, speak } from "../review/German";

type Note = typeof notes.$inferSelect;

/** English → typed German over a fixed set, scored at the end. Nothing is saved. */
export function Practice({ words, scope }: { words: Note[]; scope: PracticeScope }) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [missed, setMissed] = useState<Note[]>([]);
  const note = words[index];

  if (!note) {
    return (
      <section className="card mt-8 flex flex-col gap-4 text-center">
        <p className="text-6xl">
          {missed.length === 0 ? "🏆" : missed.length <= words.length / 4 ? "💪" : "📖"}
        </p>
        <p className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 bg-clip-text text-6xl font-extrabold text-transparent">
          {words.length - missed.length}/{words.length}
        </p>
        {missed.length > 0 && (
          <ul className="flex flex-col divide-y divide-current/10 text-left">
            {missed.map((m) => (
              <li key={m.id} className="py-2">
                <Headword de={m.de} className="font-bold" /> <span className="muted">{m.en}</span>
              </li>
            ))}
          </ul>
        )}
        {/* A full load, so the server picks a fresh random set. */}
        <a href={`/practice?scope=${scope}`} className="btn btn-primary">
          Again
        </a>
      </section>
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
    <section className="card flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="h-2 w-full overflow-hidden rounded-full bg-current/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400 transition-[width]"
          style={{ width: `${(index / words.length) * 100}%` }}
        />
      </div>
      <p className="muted text-sm font-semibold">
        {index + 1}/{words.length}
      </p>
      <p className="text-3xl font-bold">{note.en}</p>
      <form
        className="mt-4 w-full"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
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
          className="field w-full text-center text-xl"
        />
        {/* Keeps focus in the input, so the phone keyboard stays open between words. */}
        <button
          type="submit"
          onMouseDown={(event) => event.preventDefault()}
          className="btn btn-primary mt-4 w-full"
        >
          {checked ? "Next" : "Check"}
        </button>
      </form>
      {checked && (
        <div className="mt-2 flex flex-col items-center gap-2">
          <p
            className={`font-bold ${right ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
          >
            {right ? "✓ Richtig" : `✗ ${typed || "—"}`}
          </p>
          <German word={note.de} />
          {note.exampleDe && <p className="italic">{note.exampleDe}</p>}
        </div>
      )}
    </section>
  );
}
