import { describe, expect, it } from "vitest";
import { frequencyOrder, interleave, parseB1Line, parseRanks } from "./wordlists.ts";

describe("parseB1Line", () => {
  it.each([
    ["das Gebäude, -", "das Gebäude, -", null],
    ["der Finger, -", "der Finger, -", null],
    ["ander-", "ander-", null],
    ["heutig-", "heutig-", null],
    ["hier/hier-", "hier", null],
    ["zurück/zurück-", "zurück", null],
    ["gesamt-/Gesamt-", "gesamt-", null],
    ["retten, rettet, rettete, hat gerettet", "retten", "rettet, rettete, hat gerettet"],
    ["die Ansage, -n", "die Ansage, -n", null],
  ])("%s → %s", (line, de, hint) => {
    expect(parseB1Line(line)).toEqual({ de, hint });
  });

  it.each(["Traum-", "Lieblings-", "Öko-", "un-", "miss-", "herein-, rein-", ""])(
    "drops the prefix %j",
    (line) => {
      expect(parseB1Line(line)).toBeNull();
    },
  );
});

describe("frequencyOrder", () => {
  const ranks = parseRanks("# header\nsein 3 V\nTisch 9 N\nGebäude 12 N\nauf 4\n");
  const order = (words: string[]) =>
    frequencyOrder(
      words.map((de) => ({ de })),
      ranks,
    ).map((w) => w.de);

  it("puts survival words first, then frequency, then unranked in list order", () => {
    expect(order(["das Gebäude, -", "zzz", "der Tisch, -e", "hallo", "yyy"])).toEqual([
      "hallo",
      "der Tisch, -e",
      "das Gebäude, -",
      "zzz",
      "yyy",
    ]);
  });

  it("spreads a second sense of the same word 50 places later", () => {
    const filler = Array.from({ length: 60 }, (_, i) => `w${i}`);
    const many = parseRanks(["auf 1", ...filler.map((w) => `${w} 2`)].join("\n"));
    const result = frequencyOrder(
      ["auf", "auf", ...filler].map((de) => ({ de })),
      many,
    ).map((w) => w.de);
    expect(result.indexOf("auf")).toBe(0);
    expect(result.lastIndexOf("auf")).toBe(50);
  });
});

describe("interleave", () => {
  it("puts one extra after every n items, leftovers at the end", () => {
    expect(interleave<number | string>([1, 2, 3, 4, 5], ["a", "b", "c"], 2)).toEqual([
      1,
      2,
      "a",
      3,
      4,
      "b",
      5,
      "c",
    ]);
  });
});
