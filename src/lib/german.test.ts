import { describe, expect, it } from "vitest";
import { articleOf, isCorrect } from "./german.ts";

describe("articleOf", () => {
  it.each([
    ["die Ansage, -n", "die"],
    ["der/die Bekannte, -n", "der/die"],
    ["antworten", null],
    ["Sie", null],
  ])("%s → %s", (word, article) => expect(articleOf(word)).toBe(article));
});

describe("isCorrect", () => {
  it.each([
    ["die Ansage", "die Ansage, -n"],
    ["der apfel", "der Apfel, -Ä"],
    ["die Aepfel", "die Äpfel"],
    ["Strasse", "Straße"],
    ["anziehen", "(sich) anziehen"],
    ["sich anziehen", "(sich) anziehen"],
    ["die Bekannte", "der/die Bekannte, -n"],
    ["z. B.", "zum Beispiel/z. B."],
    ["die Eltern", "die Eltern (pl.)"],
    ["die Eltern (pl.)", "die Eltern (pl.)"],
    ["die Ansage, -n", "die Ansage, -n"],
    ["Kreditkarte", "(Kredit)-Karte, -n"],
    ["Karte", "(Kredit)-Karte, -n"],
  ])("accepts %s for %s", (input, word) => expect(isCorrect(input, word)).toBe(true));

  it.each([
    ["Ansage", "die Ansage, -n"],
    ["das Ansage", "die Ansage, -n"],
    ["", "antworten"],
  ])("rejects %s for %s", (input, word) => expect(isCorrect(input, word)).toBe(false));
});
