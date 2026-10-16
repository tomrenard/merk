import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { arabiziKey, checkDarija, sameDarija } from "./darija";
import { DarijaWord, wordProblems } from "./darija-words";

describe("typed Darija", () => {
  it("accepts the usual Arabizi variants", () => {
    for (const [typed, answer] of [
      ["Bzaf", "bzzaf"],
      ["mezyan", "mzyan"],
      ["shokran", "chokran"],
      ["5oya", "khoya"],
      ["qhwa", "9hwa"],
      ["nuss", "nouss"],
      ["3afak!", "3afak"],
      ["wach nta  mzyan ?", "wach nta mzyan?"],
      // How French speakers often write it.
      ["houwa", "howa"],
      ["chnou", "chno"],
      ["choukran", "chokran"],
      ["ntoma", "ntouma"],
      ["mziane", "mzyan"],
      ["dair", "dayr"],
      ["ou nta", "w nta"],
      ["enta", "nta"],
      ["w enta", "w nta"],
    ] as const) {
      expect(sameDarija(typed, answer), `${typed} = ${answer}`).toBe(true);
    }
  });

  it("keeps sounds apart that change the word", () => {
    expect(sameDarija("7na", "hna")).toBe(false); // nous / ici
    expect(sameDarija("3la", "la")).toBe(false); // sur / non
    expect(sameDarija("9alb", "kalb")).toBe(false); // cœur / chien
  });

  it("grades right, almost, wrong and blank", () => {
    expect(checkDarija("smiti", ["smiti", "smiyti"])).toBe("right");
    expect(checkDarija("chokra", ["chokran"])).toBe("almost");
    expect(checkDarija("la", ["wah"])).toBe("wrong");
    expect(checkDarija("  ", ["wah"])).toBe("blank");
    // Short words get no "almost": one letter is the whole difference.
    expect(checkDarija("fen", ["fin"])).toBe("wrong");
  });

  it("drops accents and keeps the vowels a, i, u", () => {
    expect(arabiziKey("Bezzâf")).toBe("bzaf");
    expect(arabiziKey("bzaf")).toBe("bzaf");

    expect(arabiziKey("labas")).toBe("labas");
  });
});

describe("data/darija/words.json", () => {
  it("parses and has no problems", () => {
    const file = new URL("../../data/darija/words.json", import.meta.url);
    if (!existsSync(file)) return;
    const words = DarijaWord.array().parse(JSON.parse(readFileSync(file, "utf8")));
    expect(wordProblems(words)).toEqual([]);
  });
});
