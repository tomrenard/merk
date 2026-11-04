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
  // "Die" and "die" are the same option: one would look like a second right answer.
  const seen = new Set([answer.de.toLowerCase()]);
  const wrong = [
    ...seededShuffle(best, `${seed}:best`),
    ...seededShuffle(pool, `${seed}:pool`),
  ].filter((c) => c.de && !seen.has(c.de.toLowerCase()) && seen.add(c.de.toLowerCase()));
  const options = seededShuffle([answer, ...wrong.slice(0, others)], seed);
  return { options, answer: options.indexOf(answer) };
}

const clozeAnswer = (item: Extract<UnitItem, { type: "cloze" }>): Choice => ({
  de: item.answers[0] ?? "",
  tr: item.answersTr?.[0],
});

/** German words that are easy to mix up with each other: a wrong one of these tests the grammar. */
const FAMILIES = [
  "der die das den dem des dessen deren denen",
  "ein eine einen einem einer eines",
  "kein keine keinen keinem keiner keines nicht",
  "dieser diese dieses diesen diesem",
  "jeder jede jedes jeden jedem",
  "welcher welche welches welchen welchem",
  "bin bist ist sind seid sei seien war warst waren wäre wären gewesen",
  "habe hast hat haben habt hatte hattest hatten hätte hätten gehabt",
  "werde wirst wird werden werdet wurde wurden würde würdest würden geworden",
  "kann kannst können könnt konnte konnten könnte könnten",
  "muss musst müssen müsst musste mussten müsste müssten",
  "will willst wollen wollt wollte wollten",
  "soll sollst sollen sollt sollte sollten",
  "darf darfst dürfen dürft durfte durften dürfte",
  "mag magst mögen möchte möchtest möchten möchtet",
  "ich mich mir du dich dir er ihn ihm sie ihr ihnen wir uns euch",
  "im in ins am an ans um zum zur zu beim bei vom von",
  "wer wen wem wessen",
  "weil dass ob wenn als denn obwohl damit",
  "deshalb trotzdem deswegen dann",
].map((family) => family.split(" "));
const POSSESSIVES = ["mein", "dein", "sein", "ihr", "unser", "euer", "eur"];
const VERB_ENDINGS = ["e", "st", "t", "en"];
const ADJECTIVE_ENDINGS = ["e", "en", "er", "es", "em"];

/**
 * Other forms of a German gap's answer, as wrong options: same family (den → dem, des), same
 * possessive (meinen → meine, meinem), or the base with other endings (arbeiten: arbeitet →
 * arbeite, arbeitest; gut: guten → gute, guter). Some made-up forms aren't words: a learner's
 * mistake is what a wrong option should look like.
 */
export function formsOf(answer: string, base: string): string[] {
  const word = answer.toLowerCase();
  const family = FAMILIES.find((f) => f.includes(word));
  if (family) return family.filter((w) => w !== word);
  const own = POSSESSIVES.find((p) => word.startsWith(p) && word.length - p.length <= 2);
  if (own) return ["", ...ADJECTIVE_ENDINGS].map((e) => own + e).filter((w) => w !== word);
  if (/\s/.test(word)) return [];
  // A plural (Apfel → Äpfel): the other ways German makes plurals.
  if (/^\p{Lu}\p{Ll}+$/u.test(base) && /^\p{Lu}/u.test(answer)) {
    const soft = /(e|el|er)$/.test(base); // Flasche, Apfel, Lehrer: -n, not -en
    const forms = [base, `${base}s`, soft ? `${base}n` : `${base}en`];
    if (!soft) forms.push(`${base}e`, `${base}er`);
    if (!/[ns]$/.test(answer)) forms.push(`${answer}n`);
    return forms.filter((w) => w !== answer);
  }
  if (!/^[a-zäöüß]+$/.test(base)) return [];
  // A participle (essen → gegessen): -t or -en, with or without ge-.
  if (word.startsWith("ge") && !base.startsWith("ge") && /en$/.test(base)) {
    const stem = base.slice(0, -2);
    return [`ge${stem}t`, `ge${base}`, base, `${stem}t`].filter((w) => w !== word);
  }
  const stemOf = (endings: string[]) =>
    word.replace(
      new RegExp(`(${[...endings].sort((a, b) => b.length - a.length).join("|")})$`),
      "",
    );
  // A verb (base in -en/-n): person endings, with -e- after t/d (arbeitest).
  if (/e[lr]?n$/.test(base)) {
    const stem = stemOf(["est", "et", ...VERB_ENDINGS]);
    if (stem.length < 2) return [];
    const extra = /[td]$/.test(stem) ? "e" : "";
    // heißen: du heißt, not heißst.
    const st = /[sßzx]$/.test(stem) ? "t" : "st";
    return VERB_ENDINGS.map((e) =>
      e === "e" || e === "en" ? stem + e : stem + extra + (e === "st" ? st : e),
    ).filter((w) => w !== word);
  }
  if (!word.startsWith(base)) return [];
  return ["", ...ADJECTIVE_ENDINGS].map((e) => base + e).filter((w) => w !== word);
}

/** The gap starts a sentence: options start with a capital. */
const startsSentence = (de: string) => /(^|[.!?:]\s*)$/.test(de.split("___")[0]?.trim() ?? "");

/**
 * A gap to type becomes a choice: wrong options are first other forms of the answer (den → dem,
 * arbeitet → arbeitest) and the lesson's answers of gaps with the same hint (sein → bin, bist),
 * then the lesson's other answers. German options take the gap's capitals: "die", not "Die",
 * in the middle of a sentence (nouns keep theirs).
 */
export function clozeChoices(
  unit: Unit,
  item: Extract<UnitItem, { type: "cloze" }>,
  seed = item.id,
) {
  const sameBase = unit.items.flatMap((other) =>
    other.type === "cloze" && other.base === item.base ? [clozeAnswer(other)] : [],
  );
  const pool = unit.items.flatMap((other) =>
    other.type === "cloze"
      ? [clozeAnswer(other)]
      : other.type === "choice"
        ? other.options.map((de, i) => ({ de, tr: other.optionsTr?.[i] }))
        : [],
  );
  const german = !item.tr;
  const answer = item.answers[0] ?? "";
  // Formal Ihr/Sie keeps its capital in every form.
  const big = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
  const generated = german
    ? formsOf(answer, item.base).map((de) => ({ de: /^\p{Lu}/u.test(answer) ? big(de) : de }))
    : [];
  // A word the lesson also writes in small letters isn't a noun.
  const text = [...unit.items.map((i) => ("de" in i ? i.de : "")), ...pool.map((c) => c.de)].join(
    " ",
  );
  const small = new Set(text.split(/[^\p{L}]+/u).filter((w) => /^\p{Ll}/u.test(w)));
  const capital = startsSentence(item.de) && /^\p{Lu}/u.test(answer);
  const small1 = (w: string) => w.charAt(0).toLowerCase() + w.slice(1);
  const cased = (c: Choice): Choice =>
    !german
      ? c
      : capital
        ? { ...c, de: big(c.de) }
        : small.has(small1(c.de))
          ? { ...c, de: small1(c.de) }
          : c;
  // Never offer another accepted answer as a "wrong" one, whatever its capitals.
  const accepted = new Set(item.answers.map((a) => a.toLowerCase()));
  const wrong = (c: Choice) => !accepted.has(c.de.toLowerCase());
  // Wrong options like the answer: a capital or an extra word would give the right one away.
  const shape = (c: Choice) => `${/^\p{Lu}/u.test(c.de)}${c.de.split(/\s+/).length}`;
  const others = pool.map(cased).filter(wrong);
  const alike = others.filter((c) => !german || shape(c) === shape(clozeAnswer(item)));
  return withOthers(clozeAnswer(item), alike.length >= 3 ? alike : others, seed, {
    // Forms of the same word take the answer's capital (mache, not Mach from "Mach das!").
    best: [...sameBase, ...generated]
      .map((c) => (/^\p{Lu}/u.test(answer) || capital ? cased(c) : { ...c, de: small1(c.de) }))
      .filter(wrong),
  });
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
    // What the typed gap gives as its hint: the form you had to find.
    why: item.base && item.base !== item.answers[0] ? `${item.base} → ${item.answers[0]}` : "",
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
 * German words that fit almost anywhere ("Ich lerne auch Deutsch"): as a decoy, they could make
 * another right sentence.
 */
const FREE = new Set(
  "auch nicht sehr gern gerne noch schon doch ja mal heute immer oft dann jetzt hier so nur wirklich bitte also denn aber und oder ganz eben einfach wohl leider vielleicht morgen gestern etwa da dort".split(
    " ",
  ),
);

/**
 * Quiet mode: build `sentence` (German, or Darija in Latin) by tapping its words into order,
 * among `DECOYS` other words of the lesson (`pool`), first those that look alike (den/dem).
 * A word keeps its capital only if the lesson also writes it so mid-sentence, or it is one of
 * `nouns` (Entschuldigung, Anna at the start), so the first tile doesn't give the start away.
 * A long sentence comes in tiles of two or more words, and so do its decoys. `de`: Darija's
 * Arabic, shown once solved.
 */
export function tileItem(
  id: string,
  sentence: string,
  {
    en,
    de,
    pool,
    nouns = [],
  }: { en: string; de?: string; pool: readonly string[]; nouns?: readonly string[] },
): Extract<UnitItem, { type: "order" }> | null {
  const words = wordsOf(sentence);
  if (words.length < 2) return null;
  // Per sentence: a line of dialogue can hold several ("Ja. Ich bin Claire."), each starting big.
  const capitals = new Set([
    ...nouns,
    ...[sentence, ...pool]
      .flatMap((text) => text.split(/(?<=[.!?…])\s+/))
      .flatMap((text) => wordsOf(text).slice(1))
      .filter((w) => /^\p{Lu}/u.test(w)),
  ]);
  const shown = (w: string) => (capitals.has(w) ? w : w.toLowerCase());
  const size = Math.ceil(words.length / MAX_TILES);
  const chunks = (list: string[]) =>
    Array.from({ length: Math.ceil(list.length / size) }, (_, i) =>
      list
        .slice(i * size, (i + 1) * size)
        .map(shown)
        .join(" "),
    );
  const tiles = chunks(words);

  const used = new Set(words.map((w) => w.toLowerCase()));
  // Decoys as long as the tiles (a lone word among pairs would stand out), with no word of the
  // sentence nor a word that fits anywhere.
  const others = [...new Set(pool.flatMap((text) => chunks(wordsOf(text))))].filter(
    (tile) =>
      tile.split(" ").length === size &&
      tile.split(" ").every((w) => !used.has(w.toLowerCase()) && !FREE.has(w.toLowerCase())),
  );
  const alike = others.filter((tile) =>
    words.some(
      (s) => s.length > 1 && s.slice(0, 2).toLowerCase() === tile.slice(0, 2).toLowerCase(),
    ),
  );
  // One of each, whatever its case: "Mein" and "mein" would be the same decoy twice.
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
  return { id, type: "order", tiles: [...tiles, ...decoys], answers, de, en, modelOnly: true };
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
