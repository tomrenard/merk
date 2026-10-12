"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { UNITS } from "@/lib/course";
import { markKnown, startUnitCards } from "@/lib/review";
import { requireUser } from "@/lib/session";
import { wordBands } from "./data";

/**
 * Applies a placement result: units before `startUnit` count as done (kind "placement", each
 * with a review card so gaps show up), and, if asked, known words are scheduled weeks out:
 * whole bands the test is confident about plus each word confirmed by a meaning check.
 */
export async function applyPlacement(input: {
  startUnit: number;
  markWords: boolean;
  knownBands: number[];
  confirmedWords: string[];
  summary: string;
}) {
  const userId = await requireUser();
  // One placement per 10 minutes: each one writes many rows.
  const [recent] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        eq(activityLogs.kind, "placement-test"),
        gte(activityLogs.at, sql`now() - interval '10 minutes'`),
      ),
    );
  if ((recent?.n ?? 0) > 0) return { ok: false as const };
  const start = Number(input.startUnit);
  if (!Number.isInteger(start) || start < 0 || start > UNITS.length)
    throw new Error("Bad start unit");
  const knownBands = (Array.isArray(input.knownBands) ? input.knownBands : [])
    .filter(Number.isInteger)
    .slice(0, 20);
  const confirmed = (Array.isArray(input.confirmedWords) ? input.confirmedWords : [])
    .filter((id): id is string => typeof id === "string" && id.length <= 80)
    .slice(0, 200);
  const done = UNITS.slice(0, start);
  if (done.length) {
    await db()
      .insert(activityLogs)
      .values(
        done.map((unit) => ({ userId, kind: "placement", ref: unit.id, score: 1, total: 1 })),
      );
    await startUnitCards(userId, done, 27);
  }
  if (input.markWords) {
    const bands = await wordBands();
    const ids = new Set(confirmed);
    for (const { band, words } of bands) {
      if (knownBands.includes(band.id)) for (const word of words) ids.add(word.id);
    }
    await markKnown(userId, [...ids], { onlyUnstarted: true });
  }
  // Kept to tune the cut-offs later.
  await db()
    .insert(activityLogs)
    .values({ userId, kind: "placement-test", ref: String(input.summary).slice(0, 2000) });
  return { ok: true as const };
}
