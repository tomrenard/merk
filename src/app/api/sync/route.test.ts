import { beforeEach, describe, expect, it, vi } from "vitest";
import { activityLogs, reviewLogs } from "@/db/schema";
import { seedWords, testDb } from "@/test/db";

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: async () => ({ user: { id: "u1" } }) } },
}));

const { POST } = await import("./route");

let db: Awaited<ReturnType<typeof testDb>>;
beforeEach(async () => {
  db = await testDb();
  await seedWords(db, ["eins"]);
});

const sync = async (events: object[]) =>
  (
    await POST(
      new Request("http://x/api/sync", { method: "POST", body: JSON.stringify({ events }) }),
    )
  ).json();

describe("sync", () => {
  it("applies in order, skips what can never apply, and saves a resent part once", async () => {
    const at = Date.now() - 60_000;
    const part = { type: "part", at, unitId: "a1-01", kind: "listen", score: 3, total: 4 };
    const events = [
      { type: "grade", at, cardId: "eins:de_en", rating: 3, durationMs: 1000, seenReps: 0 },
      { type: "grade", at, cardId: "u2/other:de_en", rating: 3, durationMs: 1000, seenReps: 0 },
      part,
    ];
    expect(await sync(events)).toEqual({ applied: 3 });
    // The reply was lost: the phone sends it all again.
    expect(await sync(events)).toEqual({ applied: 3 });
    expect(await db.$count(reviewLogs)).toBe(1);
    expect(await db.$count(activityLogs)).toBe(1);
  });

  it("skips an event from a phone clock a day ahead", async () => {
    const at = Date.now() + 2 * 86_400_000;
    await sync([{ type: "part", at, unitId: "a1-01", kind: "listen", score: 3, total: 4 }]);
    expect(await db.$count(activityLogs)).toBe(0);
  });
});
