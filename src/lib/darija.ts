import { checkTyped, distance, type TypedResult } from "./german";

/**
 * Typed Darija (Latin, see data/darija/README.md) reduced to what matters: lowercase, no
 * punctuation, one spelling per sound (sh→ch, 5→kh, q→9; ou, o and w → u; y → i), no doubled
 * letters, no `e` next to a consonant at a word's edge or between consonants (mezyan = mzyan,
 * enta = nta, mziane = mzyan). The `e` goes before spaces do, so word starts still count.
 */
export function arabiziKey(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/sh/g, "ch")
    .replace(/5/g, "kh")
    .replace(/q/g, "9")
    .replace(/ou|o|w/g, "u")
    .replace(/y/g, "i")
    .replace(/(^| )e(?=[^aeiu ])/g, "$1")
    .replace(/([^aeiu ])e(?=[^aeiu]|$| )/g, "$1")
    .replace(/ /g, "")
    .replace(/(.)\1+/g, "$1");
}

/** right, almost (one letter off in a longer word), wrong or blank, against any accepted form. */
export function checkDarija(input: string, answers: readonly string[]): TypedResult {
  const given = arabiziKey(input);
  if (!given) return "blank";
  const keys = answers.map(arabiziKey);
  if (keys.includes(given)) return "right";
  return keys.some((key) => key.length >= 4 && distance(key, given) === 1) ? "almost" : "wrong";
}

export const sameDarija = (input: string, answer: string) =>
  checkDarija(input, [answer]) === "right";

/** A typed answer to a word card, in the word's course: Darija by its Latin, German by its rules. */
export function checkWord(
  input: string,
  note: { course: string; de: string; tr?: string | null; governs?: string | null },
): TypedResult {
  return note.course === "ary"
    ? checkDarija(input, [note.tr ?? note.de])
    : checkTyped(input, note.de, note.governs);
}
