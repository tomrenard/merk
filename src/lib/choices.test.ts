import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { clozeChoices, withOthers } from "./choices";
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
