"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { unitsOf } from "@/lib/course";

import { freshPages } from "@/lib/fresh";
import { markKnown, startUnitCards } from "@/lib/review";
import { requireUser } from "@/lib/session";
import { wordBands } from "./data";

/** Placement exists for German only (see src/lib/courses.ts). */
const UNITS = unitsOf("de");

/**
 * Applies a placement result: one "placed" row with the start lesson, so lessons before it (and
 * exams of parts before it) count as skipped, even ones added to the course later. Each skipped
 * lesson gets a review card so gaps show up. If asked, known words are scheduled weeks out:
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
  await db()
    .insert(activityLogs)
    .values({ userId, kind: "placed", ref: UNITS[start]?.id ?? "end" });
  await startUnitCards(userId, UNITS.slice(0, start), 27);
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
  freshPages();
  return { ok: true as const };
}
