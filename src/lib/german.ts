/** `der`, `die`, `das` or `der/die`, from the start of a headword like "die Ansage, -n". */
export function articleOf(headword: string): string | null {
  return headword.match(/^(der\/die|der|die|das) /)?.[1] ?? null;
}

const ARTICLE_COLOR: Record<string, string> = {
  der: "text-blue-600 dark:text-blue-400",
  die: "text-red-600 dark:text-red-400",
  das: "text-green-600 dark:text-green-400",
  "der/die": "text-purple-600 dark:text-purple-400",
};

/** Tailwind colour for a headword's gender: der blue, die red, das green. */
export function articleColor(headword: string): string {
  return ARTICLE_COLOR[articleOf(headword) ?? ""] ?? "";
}

/** What the voice should read: "die Ansage, -n" → "die Ansage", "(sich) anziehen" → "sich anziehen". */
export function spokenForm(headword: string): string {
  const base = (headword.split(",")[0] ?? headword).replace("(pl.)", "");
  return base.replace(/[()]/g, "").replace(/\//g, ", ").replace(/\s+/g, " ").trim();
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

export function isCorrect(input: string, headword: string): boolean {
  return acceptedAnswers(headword).includes(normalize(input));
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
