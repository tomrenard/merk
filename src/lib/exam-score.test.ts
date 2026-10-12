import { describe, expect, it } from "vitest";
import { examPercent, type Scores } from "./exam-score";

const scores = (h: number, l: number, s: number, self: number): Scores => ({
  Hören: [h, 10],
  Lesen: [l, 10],
  Sprachbausteine: [s, 10],
  Schreiben: [self, 10],
  Sprechen: [self, 10],
});

describe("examPercent", () => {
  it("averages the sections, each counting the same", () => {
    expect(examPercent(scores(10, 10, 10, 10))).toBe(100);
    expect(examPercent(scores(8, 8, 8, 4))).toBe(64);
  });

  it("never passes on self-marked sections: the weakest checked one caps it", () => {
    expect(examPercent(scores(10, 10, 0, 10))).toBe(0);
    expect(examPercent(scores(5, 9, 9, 10))).toBe(50);
  });
});
