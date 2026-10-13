"use client";

import { useState } from "react";
import { solved } from "@/lib/audio";
import { sameAnswer } from "@/lib/german";
import { seededShuffle } from "@/lib/shuffle";
import type { UnitItem } from "@/lib/units";
import { PANEL, SOLID } from "../feedback";
import { speak } from "../review/German";

/**
 * One exercise: gap to type (with the base form), pick one of a few options, or tap words into
 * order. Checked on the spot; `onDone(right)` after Continue.
 */
export function Exercise({ item, onDone }: { item: UnitItem; onDone: (right: boolean) => void }) {
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [pool] = useState(() =>
    item.type === "order"
      ? seededShuffle(
          item.tiles.map((tile, i) => ({ tile, i })),
          item.id,
        )
      : [],
  );
  // Options in a random order: in the content the right one is often first.
  const [options] = useState(() =>
    item.type === "choice"
      ? seededShuffle(
          item.options.map((option, i) => ({ option, i })),
          item.id,
        )
      : [],
  );
  const [placed, setPlaced] = useState<number[]>([]);
  const [result, setResult] = useState<"right" | "wrong" | null>(null);

  const built = placed.map((i) => item.type === "order" && item.tiles[i]).join(" ");
  const ready =
    item.type === "cloze"
      ? typed.trim() !== ""
      : item.type === "choice"
        ? picked !== null
        : placed.length === pool.length;

  function check() {
    const right =
      item.type === "cloze"
        ? item.answers.some((answer) => sameAnswer(typed, answer))
        : item.type === "choice"
          ? picked === item.answer
          : item.answers.some((answer) => sameAnswer(built, answer));
    setResult(right ? "right" : "wrong");
    speak(solved(item), { recorded: true });
  }

  const [before, after] = item.type === "order" ? ["", ""] : item.de.split("___");

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (result) onDone(result === "right");
        else if (ready) check();
      }}
    >
      <p className="muted text-sm font-extrabold">
        {item.type === "cloze"
          ? `Fill the gap (${item.base})`
          : item.type === "choice"
            ? "Pick the right word"
            : "Put the words in order"}
      </p>
      {item.type !== "order" ? (
        <p className="text-2xl font-black leading-snug">
          {before}
          <span className="rounded-lg bg-[var(--brand-soft)] px-2 text-[var(--brand)]">
            {item.type === "choice" && picked !== null
              ? item.options[picked]
              : item.type === "cloze" && typed
                ? typed
                : "___"}
          </span>
          {after}
        </p>
      ) : (
        <p className="line min-h-16 rounded-2xl border border-dashed p-3 text-xl font-bold">
          {placed.map((i, n) => (
            <button
              key={i}
              type="button"
              disabled={result !== null}
              onClick={() => setPlaced((p) => p.filter((_, m) => m !== n))}
              className="chip line mr-2 mb-2 border text-lg"
            >
              {item.tiles[i]}
            </button>
          ))}
        </p>
      )}
      <p className="muted font-semibold">{item.en}</p>

      {item.type === "cloze" && (
        <input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          readOnly={result !== null}
          // biome-ignore lint/a11y/noAutofocus: the input is the exercise
          autoFocus
          lang="de"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Type the missing word"
          aria-label="Missing word"
          className="field w-full text-xl font-bold"
        />
      )}
      {item.type === "choice" && (
        <div className="grid grid-cols-2 gap-2">
          {options.map(({ option, i }) => (
            <button
              key={option}
              type="button"
              disabled={result !== null}
              onClick={() => setPicked(i)}
              className={`btn normal-case ${picked === i ? "border-[var(--brand)] bg-[var(--brand-soft)]" : ""}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {item.type === "order" && (
        <div className="flex flex-wrap gap-2">
          {pool.map(({ tile, i }) =>
            placed.includes(i) ? null : (
              <button
                key={i}
                type="button"
                onClick={() => setPlaced((p) => [...p, i])}
                className="btn px-3 py-2 normal-case"
              >
                {tile}
              </button>
            ),
          )}
        </div>
      )}

      {result && (
        <div className={`flex flex-col gap-1 rounded-2xl p-4 ${PANEL[result]}`}>
          <p className="text-xl font-black">
            {result === "right" ? "✓ Richtig!" : "✗ Correct answer:"}
          </p>
          <button
            type="button"
            onClick={() => speak(solved(item), { recorded: true })}
            className="text-left text-lg font-bold"
          >
            {solved(item)} 🔊
          </button>
          {item.type === "choice" && <p className="font-semibold">{item.why}</p>}
        </div>
      )}
      <button
        type="submit"
        disabled={!ready && !result}
        onMouseDown={(event) => event.preventDefault()}
        className={`btn btn-solid w-full disabled:opacity-50 ${SOLID[result ?? "idle"]}`}
      >
        {result ? "Continue" : "Check"}
      </button>
    </form>
  );
}
