import { describe, expect, it } from "vitest";
import { articleOf, checkTyped, isCorrect, lemmaKeys, splitPlural, spokenForm } from "./german.ts";

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

describe("lemmaKeys", () => {
  it.each([
    ["die Ansage, -n", ["die ansage"]],
    ["der/die Bekannte, -n", ["der bekannte", "die bekannte"]],
    ["(sich) anziehen", ["anziehen"]],
    ["sich freuen", ["freuen"]],
    ["die Eltern (pl.)", ["die eltern"]],
    ["gern(e)", ["gern"]],
    ["viel/viele", ["viel", "viele"]],
    ["Straße", ["strasse"]],
  ])("%s → %j", (word, keys) => expect(lemmaKeys(word)).toEqual(keys));

  it("keeps words that differ only by article apart", () => {
    expect(lemmaKeys("der See")).not.toEqual(lemmaKeys("die See"));
  });
});

describe("spokenForm", () => {
  it("drops the plural, brackets and slashes so the voice reads only words", () => {
    expect(spokenForm("die Ansage, -n")).toBe("die Ansage");
    expect(spokenForm("der Arzt, -̈e")).toBe("der Arzt");
    expect(spokenForm("(sich) anziehen")).toBe("sich anziehen");
    expect(spokenForm("viel/viele")).toBe("viel, viele");
    expect(spokenForm("retten")).toBe("retten");
    expect(spokenForm("die Kosten (Pl.)")).toBe("die Kosten");
    expect(spokenForm("die Bank (Geldinstitut)")).toBe("die Bank");
    expect(spokenForm("gern(e)")).toBe("gerne");
    expect(spokenForm("dein-")).toBe("dein");
    expect(spokenForm("das Stück/-stück")).toBe("das Stück, stück");
  });
});

describe("splitPlural", () => {
  it("separates the plural and makes umlaut marks readable", () => {
    const notes = (headword: string) =>
      splitPlural(headword).map(({ text, plural }) => (plural ? `[${text}]` : text));
    expect(notes("die Ansage, -n")).toEqual(["die Ansage", "[, -n]"]);
    expect(notes("der Arzt, -\u0308e")).toEqual(["der Arzt", "[, -¨e]"]);
    expect(notes("retten")).toEqual(["retten"]);
    expect(notes("der Professor, -en die Professorin, -nen")).toEqual([
      "der Professor",
      "[, -en]",
      " die Professorin",
      "[, -nen]",
    ]);
  });
});

describe("checkTyped", () => {
  it.each([
    ["der Tisch", "der Tisch, -e", undefined, "right"],
    ["Der Tisch!", "der Tisch, -e", undefined, "right"],
    ["die Tisch", "der Tisch, -e", undefined, "article"],
    ["Tisch", "der Tisch, -e", undefined, "article"],
    ["der Tisvh", "der Tisch, -e", undefined, "almost"],
    ["schon", "schön", undefined, "wrong"],
    ["die Mutter", "die Mütter", undefined, "wrong"],
    ["der Stuhl", "der Tisch, -e", undefined, "wrong"],
    ["  ", "der Tisch, -e", undefined, "blank"],
    ["warten", "warten", "auf + Akk.", "right"],
    ["warten auf", "warten", "auf + Akk.", "right"],
    ["auf", "auf", undefined, "right"],
  ])("%j for %j → %s", (input, headword, governs, result) => {
    expect(checkTyped(input, headword, governs)).toBe(result);
  });
});
