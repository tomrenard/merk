import { seededShuffle } from "./shuffle.ts";
import type { Unit, UnitItem } from "./units.ts";

/** A tappable answer: the target-language text, with its Latin for Darija; `en` shows after answering. */
export type Choice = { de: string; tr?: string; en?: string };

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
export function clozeChoices(
  unit: Unit,
  item: Extract<UnitItem, { type: "cloze" }>,
  seed = item.id,
) {
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
  return withOthers(clozeAnswer(item), pool.filter(wrong), seed, { best: best.filter(wrong) });
}

/**
 * Quiet mode's version of an exercise: a gap to type becomes a choice; the rest stays. A review
 * passes a `seed` that changes each time, so the right answer isn't always the same button.
 */
export function quietItem(unit: Unit, item: UnitItem, seed?: string): UnitItem {
  if (item.type !== "cloze") return item;
  const { options, answer } = clozeChoices(unit, item, seed);

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

/** At most this many tiles on a phone screen; a longer sentence comes in chunks of words. */
const MAX_TILES = 8;
const DECOYS = 2;

/** A word as a tile: no quotes or end punctuation, which would show where the sentence ends. */
const tileWord = (word: string) => word.replace(/^[„"«‚(¿¡]+|[.,!?;:…"“”»‘’)؟،]+$/gu, "");
export const wordsOf = (text: string) =>
  text
    .split(/\s+/)
    .map(tileWord)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));

/**
 * Quiet mode: build `sentence` (German, or Darija in Latin) by tapping its words into order,
 * among `DECOYS` other words of the lesson (`pool`), first those that look alike (den/dem).
 * A word keeps its capital only if the lesson also writes it so mid-sentence (a German noun,
 * Sie), so the first tile doesn't give the start away. `de`: Darija's Arabic, shown once solved.
 */
export function tileItem(
  id: string,
  sentence: string,
  { en, de, pool }: { en: string; de?: string; pool: readonly string[] },
): Extract<UnitItem, { type: "order" }> | null {
  const words = wordsOf(sentence);
  if (words.length < 2) return null;
  // Per sentence: a line of dialogue can hold several ("Ja. Ich bin Claire."), each starting big.
  const capitals = new Set(
    [sentence, ...pool]
      .flatMap((text) => text.split(/(?<=[.!?…])\s+/))
      .flatMap((text) => wordsOf(text).slice(1))
      .filter((w) => /^\p{Lu}/u.test(w)),
  );
  const shown = (w: string) => (capitals.has(w) ? w : w.toLowerCase());
  const size = Math.ceil(words.length / MAX_TILES);
  const tiles = Array.from({ length: Math.ceil(words.length / size) }, (_, i) =>
    words
      .slice(i * size, (i + 1) * size)
      .map(shown)
      .join(" "),
  );

  const used = new Set(words.map((w) => w.toLowerCase()));
  const others = [...new Set(pool.flatMap(wordsOf).map(shown))].filter(
    (w) => !used.has(w.toLowerCase()),
  );
  const alike = others.filter((w) =>
    words.some((s) => s.length > 1 && s.slice(0, 2).toLowerCase() === w.slice(0, 2).toLowerCase()),
  );
  // One of each word, whatever its case: "Mein" and "mein" would be the same decoy twice.
  const decoys = [
    ...new Map(
      [...seededShuffle(alike, `${id}:alike`), ...seededShuffle(others, `${id}:other`)].map((w) => [
        w.toLowerCase(),
        w,
      ]),
    ).values(),
  ].slice(0, DECOYS);
  // The sentence as written (shown and heard once solved), and as its tiles make it (checked).
  const answers = [sentence, words.join(" ")];
  return { id, type: "order", tiles: [...tiles, ...decoys], answers, de, en };
}

/** The lesson's sentences as tiles are made of (Darija in Latin): where decoys come from. */
export const tilePool = (unit: Unit): string[] =>
  [
    ...unit.listening.lines,
    ...unit.speaking,
    ...unit.dictation.map((de, i) => ({ de, tr: unit.dictationTr?.[i] })),
  ]
    .map((s) => s.tr ?? s.de)
    .filter((text) => !/\p{Script=Arabic}/u.test(text));
