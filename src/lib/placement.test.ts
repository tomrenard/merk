import { describe, expect, it } from "vitest";
import {
  afterProbe,
  type Band,
  bandScores,
  startLesson,
  startSearch,
  vocabResult,
} from "./placement.ts";

const bands: Band[] = [
  { id: 0, level: "A1", size: 300 },
  { id: 1, level: "A2", size: 300 },
];
const yes = (band: number | null, n: number, of: number) =>
  Array.from({ length: of }, (_, i) => ({ band, yes: i < n }));

describe("vocabulary", () => {
  it("corrects for guessing with made-up words", () => {
    const scores = bandScores(bands, [...yes(0, 8, 8), ...yes(1, 4, 8), ...yes(null, 2, 10)], []);
    expect(scores[0]?.p).toBe(1);
    expect(scores[1]?.p).toBeCloseTo((0.5 - 0.2) / 0.8);
    const result = vocabResult(scores);
    expect(result.knownBands).toEqual([0]);
    expect(result.levels[0]).toMatchObject({ level: "A1", state: "secure" });
    expect(result.levels[1]?.state).toBe("new");
    expect(result.low).toBeLessThanOrEqual(result.size);
  });

  it("scales by wrong meaning checks and refuses to mark words after much guessing", () => {
    const checked = bandScores(
      bands,
      [...yes(0, 8, 8), ...yes(null, 0, 10)],
      [
        { level: "A1", right: true },
        { level: "A1", right: false },
      ],
    );
    expect(checked[0]?.p).toBe(0.5);
    const guessing = vocabResult(bandScores(bands, [...yes(0, 8, 8), ...yes(null, 5, 10)], []));
    expect(guessing.unreliable).toBe(true);
    expect(guessing.knownBands).toEqual([]);
  });
});

describe("grammar search", () => {
  it("narrows down to a range of 3 units or less", () => {
    let search = startSearch(60, "A2");
    expect(search.next).toBe(30);
    const level = 22; // units up to 22 are known
    while (!search.done) search = afterProbe(search, search.next <= level);
    expect(search.lo).toBeLessThanOrEqual(level);
    expect(search.hi).toBeGreaterThan(level);
    expect(search.hi - search.lo).toBeLessThanOrEqual(3);
    expect(search.probes).toBeLessThanOrEqual(7);
  });

  it("stops at once for a beginner who fails unit 1", () => {
    let search = startSearch(60, "A1");
    while (!search.done) search = afterProbe(search, false);
    expect(search.lo).toBe(0);
  });
});

describe("startLesson", () => {
  // Grammar lessons at course positions 0, 2, 5 (topics in between); last lesson 7.
  const grammarAt = [0, 2, 5];
  it("starts at the first grammar lesson not passed, topics before it done", () => {
    expect(startLesson(grammarAt, 0, 7)).toBe(0);
    expect(startLesson(grammarAt, 2, 7)).toBe(5);
  });
  it("starts at the last lesson when all grammar is passed", () => {
    expect(startLesson(grammarAt, 3, 7)).toBe(7);
  });
});
