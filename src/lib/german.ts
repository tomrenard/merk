/** `der`, `die`, `das` or `der/die`, from the start of a headword like "die Ansage, -n". */
export function articleOf(headword: string): string | null {
  return headword.match(/^(der\/die|der|die|das) /)?.[1] ?? null;
}

const ARTICLE_COLOR: Record<string, string> = {
  der: "text-blue-600 dark:text-sky-300",
  die: "text-rose-600 dark:text-rose-300",
  das: "text-emerald-600 dark:text-emerald-300",
  "der/die": "text-violet-600 dark:text-violet-300",
};

/** Tailwind colour for a headword's gender: der blue, die red, das green. */
export function articleColor(headword: string): string {
  return ARTICLE_COLOR[articleOf(headword) ?? ""] ?? "";
}

/**
 * Splits a headword into words and plural notes, for display: "der Professor, -en die
 * Professorin, -nen" → words "der Professor", " die Professorin", notes ", -en", ", -nen".
 * The lists mark umlaut plurals with a combining diaeresis on the hyphen, which fonts draw on
 * the next letter ("-ë"), so it becomes a standalone "¨".
 */
export function splitPlural(headword: string): { text: string; plural: boolean }[] {
  return headword
    .replace(/-\u0308/g, "-¨")
    .split(/(, [^,]*?(?= (?:der|die|das) |$))/)
    .filter(Boolean)
    .map((text) => ({ text, plural: text.startsWith(", ") }));
}

/**
 * What the voice should read: "die Ansage, -n" → "die Ansage", "die Bank (Geldinstitut)" →
 * "die Bank", "(sich) anziehen" → "sich anziehen", "dein-" → "dein".
 */
export function spokenForm(headword: string): string {
  return (headword.split(",")[0] ?? headword)
    .replace(/\s\([^)]*\)$/, "")
    .replace(/[()]/g, "")
    .replace(/\//g, ", ")
    .replace(/-(?=\s|,|$)|(?<=^|\s)-/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Folds what a phone keyboard makes hard to type: case, umlauts as ae/oe/ue, ß as ss. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[.!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The answers that count as right for a headword: plural, "(pl.)" and optional parts dropped. */
function acceptedAnswers(headword: string): string[] {
  const base = (headword.split(",")[0] ?? headword).replace("(pl.)", "").trim();
  const optionalKept = base.replace(/[()]/g, "");
  const optionalDropped = base.replace(/\([^)]*\)[\s-]*/g, "");
  // Typing the headword exactly as shown, plural and all, also counts.
  const forms = [headword, base, optionalKept, optionalKept.replace(/-/g, ""), optionalDropped];
  const pair = base.match(/^der\/die (.+)$/);
  if (pair) forms.push(`der ${pair[1]}`, `die ${pair[1]}`);
  else if (!articleOf(base)) forms.push(...base.split("/"));
  return [...new Set(forms.map(normalize))];
}

/** Answer comparison also ignores commas, quotes and long dashes. */
const answerKey = (text: string) => normalize(text.replace(/[,"'„“”‚‘’«»–—]/g, " "));

/** Umlauts and ß reduced to their base letter: "schön" and "schon" look alike here. */
const vowelBase = (key: string) =>
  key.replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u").replace(/ss/g, "s");

const withoutArticle = (key: string) => key.replace(/^(der|die|das|der\/die) /, "");

/** Edit distance (insert, delete, replace one letter). */
function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(
        (row[j] ?? 0) + 1,
        (next[j - 1] ?? 0) + 1,
        (row[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    row = next;
  }
  return row[b.length] ?? 0;
}

/**
 * How a typed answer compares to the headword: `right`; `article` (the word is right but the
 * gender is wrong or missing, which is part of the word); `almost` (one letter off, but not an
 * umlaut or ß, since schon/schön are different words); `wrong`; or `blank`. A verb that takes a
 * preposition (`governs` "auf + Akk.") is also right with it: "warten auf".
 */
export type TypedResult = "right" | "article" | "almost" | "wrong" | "blank";

export function checkTyped(input: string, headword: string, governs?: string | null): TypedResult {
  const given = answerKey(input);
  if (!given) return "blank";
  const answers = acceptedAnswers(headword).map(answerKey);
  // "auf + Akk." names a preposition; "+ Dat." only a case, nothing to type.
  const prep = governs?.match(/^\p{Ll}+/u)?.[0];
  if (prep) answers.push(...answers.map((answer) => `${answer} ${answerKey(prep)}`));
  if (answers.includes(given)) return "right";
  if (articleOf(headword) && answers.some((a) => withoutArticle(a) === withoutArticle(given))) {
    return "article";
  }
  const almost = answers.some(
    (a) => a.length >= 4 && distance(a, given) === 1 && vowelBase(a) !== vowelBase(given),
  );
  return almost ? "almost" : "wrong";
}

export function isCorrect(input: string, headword: string): boolean {
  return checkTyped(input, headword) === "right";
}

/**
 * Keys that identify a headword across level lists, one per spelling it allows:
 * "der/die Bekannte, -n" → ["der bekannte", "die bekannte"], "viel/viele" → ["viel", "viele"].
 * The article stays in, so "der See" (lake) and "die See" (sea) are different words.
 * ponytail: same-article homographs (die Bank: bench / bank) still collide; fine for a word list.
 */
export function lemmaKeys(headword: string): string[] {
  const base = (headword.split(",")[0] ?? headword).replace(/\([^)]*\)/g, "").trim();
  const pair = base.match(/^der\/die (.+)$/);
  const spellings = pair ? [`der ${pair[1]}`, `die ${pair[1]}`] : base.split("/");
  return spellings.map((spelling) => normalize(spelling.replace(/^sich /, ""))).filter(Boolean);
}
