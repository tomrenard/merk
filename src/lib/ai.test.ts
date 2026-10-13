import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiUsage } from "@/db/schema";
import { testDb } from "@/test/db";

const calls = vi.hoisted(() => ({ n: 0, fail: null as Error | null }));
vi.mock("ai", () => ({
  gateway: { transcriptionModel: (id: string) => id },
  Output: { object: () => ({}) },
  transcribe: async () => {
    calls.n++;
    return { text: "" };
  },
  generateText: async () => {
    calls.n++;
    if (calls.fail) throw calls.fail;
    const right = { wrong: "x", right: "x", why: "" };
    return { output: { score: 80, corrections: [right], better: "Gut.", tip: "", checklist: [] } };
  },
}));

const { feedback, LIMITS, transcript } = await import("./ai");
const task = { task: "Write to a friend", level: "A2" };
let db: Awaited<ReturnType<typeof testDb>>;

beforeEach(async () => {
  db = await testDb();
  calls.n = 0;
  calls.fail = null;
});

describe("AI gates", () => {
  it("pays once for the same input and drops corrections that change nothing", async () => {
    const first = await feedback("u1", task, "Hallo Lisa");
    const again = await feedback("u1", task, "Hallo Lisa");
    expect(calls.n).toBe(1);
    expect(again).toEqual(first);
    expect(first.ok && first.result.corrections).toEqual([]);
  });

  it("stops at the daily limit, parallel requests and failures included", async () => {
    calls.fail = new Error("boom");
    const tries = await Promise.all(
      Array.from({ length: LIMITS.feedback + 5 }, (_, i) => feedback("u1", task, `Text ${i}`)),
    );
    expect(tries.filter((t) => !t.ok && t.reason === "limit")).toHaveLength(5);
    expect(calls.n).toBe(LIMITS.feedback);
    const [row] = await db.select().from(aiUsage);
    expect(row?.n).toBe(LIMITS.feedback);
    // Someone else's limit is their own.
    calls.fail = null;
    expect((await feedback("u2", task, "neu")).ok).toBe(true);
  });

  it("serves an empty transcript from the cache too", async () => {
    const audio = new Uint8Array([1, 2, 3]);
    await transcript("u1", audio, "clip");
    expect(await transcript("u1", audio, "clip")).toEqual({ ok: true, result: "" });
    expect(calls.n).toBe(1);
  });

  it("reports a spent gateway budget as such", async () => {
    calls.fail = new Error("quota_for_entity_exceeded: Project budget exceeded");
    expect(await feedback("u1", task, "Hallo")).toEqual({ ok: false, reason: "budget" });
  });
});
