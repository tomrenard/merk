import { seededShuffle } from "./shuffle.ts";
import type { Unit, UnitItem } from "./units.ts";

/** A tappable answer: the target-language text, with its Latin for Darija. */
export type Choice = { de: string; tr?: string };

/**
 * Quiet mode: `answer` plus up to `others` different wrong options, taken from `best` first
 * (the most plausible ones), then `pool`, in an order fixed by `seed` (the same on server and
 * phone). Options are compared by their text.
 */
export function withOthers(
  answer: Choice,
  pool: readonly Choice[],
  seed: string,
  { others = 3, best = [] }: { others?: number; best?: readonly Choice[] } = {},
) {
  const seen = new Set([answer.de]);
  const wrong = [
    ...seededShuffle(best, `${seed}:best`),
    ...seededShuffle(pool, `${seed}:pool`),
  ].filter((c) => c.de && !seen.has(c.de) && seen.add(c.de));
  const options = seededShuffle([answer, ...wrong.slice(0, others)], seed);
  return { options, answer: options.indexOf(answer) };
}

const clozeAnswer = (item: Extract<UnitItem, { type: "cloze" }>): Choice => ({
  de: item.answers[0] ?? "",
  tr: item.answersTr?.[0],
});

/**
 * A gap to type becomes a choice: wrong options are the lesson's other answers, first those of
 * gaps with the same hint (sein → bin, bist, ist).
 */
export function clozeChoices(unit: Unit, item: Extract<UnitItem, { type: "cloze" }>) {
  const best = unit.items.flatMap((other) =>
    other.type === "cloze" && other.base === item.base ? [clozeAnswer(other)] : [],
  );
  const pool = unit.items.flatMap((other) =>
    other.type === "cloze"
      ? [clozeAnswer(other)]
      : other.type === "choice"
        ? other.options.map((de, i) => ({ de, tr: other.optionsTr?.[i] }))
        : [],
  );
  // Never offer another accepted answer as a "wrong" one.
  const wrong = (c: Choice) => !item.answers.includes(c.de);
  return withOthers(clozeAnswer(item), pool.filter(wrong), item.id, { best: best.filter(wrong) });
}

/** Quiet mode's version of an exercise: a gap to type becomes a choice; the rest stays. */
export function quietItem(unit: Unit, item: UnitItem): UnitItem {
  if (item.type !== "cloze") return item;
  const { options, answer } = clozeChoices(unit, item);
  if (options.length < 2) return item;
  return {
    id: item.id,
    type: "choice",
    de: item.de,
    tr: item.tr,
    options: options.map((o) => o.de),
    optionsTr: item.tr ? options.map((o) => o.tr ?? o.de) : undefined,
    answer,
    why: "",
    en: item.en,
  };
}
