"use client";

import { useState } from "react";
import type { notes } from "@/db/schema";
import { isCorrect, spokenForm } from "@/lib/german";
import type { PracticeScope } from "@/lib/review";
import { German, speak } from "../review/German";

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
      <section className="mt-12 flex flex-col gap-4 text-center">
        <p className="text-4xl font-semibold">
          {words.length - missed.length}/{words.length}
        </p>
        {missed.length > 0 && (
          <ul className="flex flex-col divide-y divide-current/10 text-left">
            {missed.map((m) => (
              <li key={m.id} className="py-2">
                <span className="font-medium">{m.de}</span>{" "}
                <span className="opacity-70">{m.en}</span>
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
    <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm opacity-60">
        {index + 1}/{words.length}
      </p>
      <p className="text-3xl font-semibold">{note.en}</p>
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
          <p className={right ? "text-green-600" : "text-red-600"}>
            {right ? "✓ Richtig" : `✗ ${typed || "—"}`}
          </p>
          <German word={note.de} />
          {note.exampleDe && <p className="italic">{note.exampleDe}</p>}
        </div>
      )}
    </section>
  );
}
