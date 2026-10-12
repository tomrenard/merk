/** `der`, `die`, `das` or `der/die`, from the start of a headword like "die Ansage, -n". */
export function articleOf(headword: string): string | null {
  return headword.match(/^(der\/die|der|die|das) /)?.[1] ?? null;
}

/** Folds what a phone keyboard makes hard to type: case, umlauts as ae/oe/ue, ß as ss. */
export function normalize(text: string): string {
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
export function acceptedAnswers(headword: string): string[] {
  const base = (headword.split(",")[0] ?? headword).replace("(pl.)", "").trim();
  const forms = [base, base.replace(/[()]/g, ""), base.replace(/\([^)]*\)\s*/g, "")];
  const pair = base.match(/^der\/die (.+)$/);
  if (pair) forms.push(`der ${pair[1]}`, `die ${pair[1]}`);
  else if (!articleOf(base)) forms.push(...base.split("/"));
  return [...new Set(forms.map(normalize))];
}

export function isCorrect(input: string, headword: string): boolean {
  return acceptedAnswers(headword).includes(normalize(input));
}
