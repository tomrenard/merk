/**
 * The placement test's scoring, as plain functions (see app/placement for the flow). Methods
 * follow DIALANG / Meara yes-no vocabulary tests (made-up words correct for guessing) and an
 * adaptive search over the course units for grammar. Cut-offs are reasoned defaults, not normed:
 * every answer is logged so they can be tuned later.
 */

/** German-looking words that don't exist (checked against the deck and an English word list). */
export const PSEUDOWORDS = [
  "der Flomm",
  "die Schelpe",
  "das Mökel",
  "die Klunde",
  "der Brast",
  "die Fenke",
  "das Spolder",
  "die Kramme",
  "der Tulper",
  "das Trimsel",
  "die Blarke",
  "der Gonter",
  "die Wuse",
  "das Pfelt",
  "der Strumm",
  "die Pelme",
  "das Knaffel",
  "die Ruppe",
  "der Plönt",
  "die Siefe",
  "das Wockel",
  "der Quarm",
  "flümmen",
  "verkrandeln",
  "abtrüsen",
  "belöken",
  "schnarben",
  "kleuben",
  "zerpfeln",
  "ansluden",
  "verschmullen",
  "gräpsen",
  "drimpig",
  "schleuk",
  "gelbrig",
  "ströpig",
  "blöckisch",
  "knöbelig",
  "umbrillig",
  "knepp",
];

export type Level = "A1" | "A2" | "B1";
export type Band = { id: number; level: Level; size: number };
export type VocabAnswer = { band: number | null; yes: boolean };
export type MeaningCheck = { level: Level; right: boolean };

/** A band counts as known from here, so its words are marked known. */
export const KNOWN_BAND = 0.85;
/** A level is "secure" from here, "in progress" from IN_PROGRESS. */
export const SECURE = 0.8;
export const IN_PROGRESS = 0.4;
/** Saying yes to more than this share of made-up words makes the vocabulary result unreliable. */
export const MAX_FALSE_YES = 0.35;

/**
 * Share of each band's words known: yes-rate h corrected by the yes-rate on made-up words f,
 * p = (h − f) / (1 − f), then scaled by how many meaning checks at that level were right.
 */
export function bandScores(bands: Band[], answers: VocabAnswer[], checks: MeaningCheck[]) {
  const pseudo = answers.filter((a) => a.band === null);
  const f = pseudo.length ? pseudo.filter((a) => a.yes).length / pseudo.length : 0;
  return bands.map((band) => {
    const mine = answers.filter((a) => a.band === band.id);
    const h = mine.length ? mine.filter((a) => a.yes).length / mine.length : 0;
    const p = f >= 1 ? 0 : Math.max(0, (h - f) / (1 - f));
    const asked = checks.filter((c) => c.level === band.level);
    const v = asked.length ? asked.filter((c) => c.right).length / asked.length : 1;
    return { ...band, n: mine.length, p: p * v, falseYes: f };
  });
}

/** Words known (estimate and 95% range), and a level per CEFR list. */
export function vocabResult(scores: ReturnType<typeof bandScores>) {
  const falseYes = scores[0]?.falseYes ?? 0;
  const size = scores.reduce((sum, s) => sum + s.p * s.size, 0);
  const spread = scores.reduce(
    (sum, s) => sum + (s.n ? 1.96 * Math.sqrt((s.p * (1 - s.p)) / s.n) * s.size : 0),
    0,
  );
  const levels = (["A1", "A2", "B1"] as const).map((level) => {
    const inLevel = scores.filter((s) => s.level === level);
    const total = inLevel.reduce((sum, s) => sum + s.size, 0);
    const share = total ? inLevel.reduce((sum, s) => sum + s.p * s.size, 0) / total : 0;
    return {
      level,
      share,
      state: share >= SECURE ? "secure" : share >= IN_PROGRESS ? "in progress" : "new",
    };
  });
  return {
    size: Math.round(size),
    low: Math.max(0, Math.round(size - spread)),
    high: Math.round(size + spread),
    levels,
    unreliable: falseYes > MAX_FALSE_YES,
    knownBands:
      falseYes > MAX_FALSE_YES ? [] : scores.filter((s) => s.p >= KNOWN_BAND).map((s) => s.id),
  };
}

/**
 * Grammar: a binary search over the units in course order. `lo` = last unit passed (0: none),
 * `hi` = first unit failed (count + 1: none). Each probe asks 3 items of unit `next`; 2 right
 * passes. Stops when the gap is 3 units or less, after 7 probes, or when unit 1 is failed.
 */
export type Search = { lo: number; hi: number; probes: number; next: number; done: boolean };

export function startSearch(units: number, prior: Level): Search {
  const start = { A1: 10, A2: 30, B1: 50 }[prior];
  return { lo: 0, hi: units + 1, probes: 0, next: Math.min(start, units), done: units === 0 };
}

export function afterProbe(search: Search, passed: boolean): Search {
  const lo = passed ? search.next : search.lo;
  const hi = passed ? search.hi : search.next;
  const probes = search.probes + 1;
  const done = hi - lo <= 3 || probes >= 7 || (!passed && search.next === 1);
  return { lo, hi, probes, next: Math.floor((lo + hi) / 2), done };
}
