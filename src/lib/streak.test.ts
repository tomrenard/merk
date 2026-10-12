import { describe, expect, it } from "vitest";
import { streakLength } from "./streak.ts";

describe("streakLength", () => {
  it.each([
    [[], "2026-10-12", 0],
    [["2026-10-12"], "2026-10-12", 1],
    [["2026-10-12", "2026-10-11", "2026-10-10"], "2026-10-12", 3],
    [["2026-10-11", "2026-10-10"], "2026-10-12", 2],
    [["2026-10-12", "2026-10-10"], "2026-10-12", 1],
    [["2026-10-10"], "2026-10-12", 0],
    [["2026-03-01", "2026-02-28"], "2026-03-01", 2],
  ])("%j on %s → %i", (days, today, streak) => expect(streakLength(days, today)).toBe(streak));
});
