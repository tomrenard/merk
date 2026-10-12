import { lemmaKeys } from "./german.ts";

/** B1 list lines that are word-building prefixes, not words: "Traum-", "un-", "herein-, rein-". */
const PREFIXES = new Set(["un-", "miss-", "aller-", "unter-", "herein-, rein-"]);

/**
 * One line of the B1 list → headword and verb forms, or null for a prefix.
 * "retten, rettet, rettete, hat gerettet" → retten + forms; "hier/hier-" → "hier";
 * "das Gebäude, -" and stems like "ander-" are words and stay.
 */
export function parseB1Line(raw: string): { de: string; hint: string | null } | null {
  let line = raw.trim();
  if (!line || PREFIXES.has(line) || /^[A-ZÄÖÜ][^ ,/]*-$/.test(line)) return null;
  // "hier/hier-", "gesamt-/Gesamt-": the word and its prefix use; keep the word.
  line = line.replace(/^([^ ,/]+)\/[^ ,/]+-$/, "$1");
  const [de = line, ...forms] = /^(der|die|das) /.test(line) ? [line] : line.split(", ");
  return { de, hint: forms.join(", ") || null };
}

/** Keys for frequency lookup: like lemmaKeys, without the article ("der tisch" → "tisch"). */
export function rankKeys(headword: string): string[] {
  return lemmaKeys(headword).map((key) => key.replace(/^(der|die|das) /, ""));
}

/**
 * Words taught first, before frequency order: greetings, politeness, question words, numbers,
 * the verbs you need on day one. Newspaper-based frequency ranks these late or not at all.
 */
export const SURVIVAL = [
  "hallo",
  "tschuess",
  "danke",
  "bitte",
  "ja",
  "nein",
  "entschuldigung",
  "ich",
  "du",
  "sie",
  "er",
  "es",
  "wir",
  "ihr",
  "sein",
  "haben",
  "heissen",
  "kommen",
  "wohnen",
  "sprechen",
  "verstehen",
  "gut",
  "nicht",
  "und",
  "aber",
  "oder",
  "wie",
  "was",
  "wo",
  "woher",
  "wer",
  "wann",
  "warum",
  "eins",
  "zwei",
  "drei",
  "vier",
  "fuenf",
  "sechs",
  "sieben",
  "acht",
  "neun",
  "zehn",
  "tag",
  "morgen",
  "abend",
  "nacht",
  "heute",
  "jetzt",
  "hier",
  "da",
  "machen",
  "gehen",
  "essen",
  "trinken",
  "brauchen",
  "kaufen",
  "kosten",
  "moechten",
  "koennen",
  "muessen",
  "wasser",
  "kaffee",
  "brot",
  "euro",
  "uhr",
  "name",
  "deutsch",
  "frau",
  "mann",
  "kind",
  "wohnung",
  "arbeit",
  "freund",
  "lernen",
  "spaet",
  "langsam",
  "noch einmal",
];

/**
 * Teaching order within a level: survival words first, then by corpus frequency rank (lower =
 * more common), then the rest in list order. A second sense of the same word goes 50 places
 * later, so the two are not learned on the same day.
 */
export function frequencyOrder<T extends { de: string }>(
  words: T[],
  ranks: Map<string, number>,
): T[] {
  const pinned = new Map(SURVIVAL.map((key, i) => [key, i]));
  const senses = new Map<string, number>();
  const score = words.map((word, listIndex) => {
    const keys = rankKeys(word.de);
    const first = keys[0] ?? word.de;
    const sense = senses.get(first) ?? 0;
    senses.set(first, sense + 1);
    const pin = Math.min(...keys.map((key) => pinned.get(key) ?? Number.POSITIVE_INFINITY));
    const rank = Math.min(...keys.map((key) => ranks.get(key) ?? Number.POSITIVE_INFINITY));
    const base = Number.isFinite(pin)
      ? pin
      : Number.isFinite(rank)
        ? 1_000 + rank
        : 1_000_000 + listIndex;
    return { word, value: base + sense * 50 };
  });
  return score.sort((a, b) => a.value - b.value).map((s) => s.word);
}

/** DeReWo lines ("sein 3 V", "ein(e) 3 DET") in file order → rank by key; first rank wins. */
export function parseRanks(text: string): Map<string, number> {
  const ranks = new Map<string, number>();
  let rank = 0;
  for (const line of text.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;
    const lemma = line.split(/\s+/)[0] ?? "";
    for (const part of lemma.split(",")) {
      for (const key of rankKeys(part)) if (!ranks.has(key)) ranks.set(key, rank);
    }
    rank++;
  }
  return ranks;
}

/** Mixes `extra` into `main`: one extra item after every `every` main items, the rest at the end. */
export function interleave<T>(main: T[], extra: T[], every: number): T[] {
  const result: T[] = [];
  let next = 0;
  main.forEach((item, i) => {
    result.push(item);
    if ((i + 1) % every === 0 && next < extra.length) result.push(extra[next++] as T);
  });
  return [...result, ...extra.slice(next)];
}
