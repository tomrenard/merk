import { describe, expect, it } from "vitest";
import { nextUnit, PASS, UNITS } from "./course";

describe("nextUnit", () => {
  const [first, second, third] = UNITS.map((unit) => unit.id);

  it("starts at the first unit", () => {
    expect(nextUnit(new Map())?.id).toBe(first);
  });

  it("moves on after one try, passed or not", () => {
    expect(nextUnit(new Map([[first ?? "", PASS - 2]]))?.id).toBe(second);
    expect(nextUnit(new Map([[first ?? "", PASS]]))?.id).toBe(second);
  });

  it("comes back to failed units once every unit was tried", () => {
    const scores = new Map(UNITS.map((unit) => [unit.id, PASS] as [string, number]));
    scores.set(third ?? "", 0);
    expect(nextUnit(scores)?.id).toBe(third);
    scores.set(third ?? "", PASS);
    expect(nextUnit(scores)).toBeNull();
  });
});
