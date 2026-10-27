import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { clozeChoices, tileItem, tilePool, withOthers } from "./choices";
import { sameDarija } from "./darija";
import { sameAnswer } from "./german";
import { Unit } from "./units";

const unit = (id: string) =>
  Unit.parse(
    JSON.parse(readFileSync(new URL(`../../data/units/${id}.json`, import.meta.url), "utf8")),
  );

describe("Quiet mode choices", () => {
  it("keeps the answer once, no duplicates, same order for the same seed", () => {
    const pool = ["bin", "bist", "ist", "bin", "sind"].map((de) => ({ de }));
    const a = withOthers({ de: "bin" }, pool, "x");
    expect(a.options).toHaveLength(4);
    expect(new Set(a.options.map((o) => o.de)).size).toBe(4);
    expect(a.options[a.answer]?.de).toBe("bin");
    expect(withOthers({ de: "bin" }, pool, "x")).toEqual(a);
  });

  it("gives every gap of every lesson at least one wrong option", () => {
    for (const id of ["a1-01", "a1-07", "b2-01", "ary-a1-01", "ary-a1-10"]) {
      const u = unit(id);
      for (const item of u.items) {
        if (item.type !== "cloze") continue;
        const { options, answer } = clozeChoices(u, item);
        expect(options.length, item.id).toBeGreaterThanOrEqual(2);
        expect(options[answer]?.de).toBe(item.answers[0]);
        const others = options.filter((_, i) => i !== answer).map((o) => o.de);
        expect(
          others.some((o) => item.answers.includes(o)),
          item.id,
        ).toBe(false);

        if (id.startsWith("ary"))
          expect(
            options.every((o) => o.tr),
            item.id,
          ).toBe(true);
      }
    }
  });
});

describe("Quiet mode tiles", () => {
  const ids = readdirSync(new URL("../../data/units/", import.meta.url)).map((f) =>
    f.replace(".json", ""),
  );

  it("rebuild every sentence from at most 8 tiles, plus 2 decoys not in it", () => {
    for (const id of ids) {
      const u = unit(id);
      const ary = id.startsWith("ary");
      const sentences = [
        ...u.dictation.map((de, i) => u.dictationTr?.[i] ?? de),
        ...u.speaking.map((s) => s.tr ?? s.de),
        ...(u.writing.sentences ?? []).map((s) => s.tr ?? s.de),
      ];
      for (const sentence of sentences) {
        const item = tileItem(`${id}:x`, sentence, { en: "", pool: tilePool(u) });
        if (!item) continue;
        const decoys = item.tiles.slice(-2);
        const own = item.tiles.slice(0, -2);
        expect(own.length, sentence).toBeLessThanOrEqual(8);
        const same = ary ? sameDarija : sameAnswer;
        expect(
          item.answers.some((a) => same(own.join(" "), a)),
          sentence,
        ).toBe(true);
        const words = new Set(own.join(" ").toLowerCase().split(" "));
        expect(
          decoys.filter((d) => words.has(d.toLowerCase())),
          sentence,
        ).toEqual([]);
      }
    }
  });

  it("doesn't give the start away with a capital, but keeps nouns", () => {
    const item = tileItem("t", "Die Küche ist klein.", { en: "", pool: ["Ich mag die Küche."] });
    expect(item?.tiles.slice(0, 4)).toEqual(["die", "Küche", "ist", "klein"]);
  });
});
