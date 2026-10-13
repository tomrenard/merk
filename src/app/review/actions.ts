"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { Grade } from "ts-fsrs";
import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { withExercise } from "@/lib/course";
import { counts, DAY_START, grade, nextCard, sessionLeft } from "@/lib/review";
import { requireUser } from "@/lib/session";

export async function gradeAndNext(
  cardId: string,
  rating: number,
  durationMs: number,
  seenReps: number,
) {
  const userId = await requireUser();
  if (typeof cardId !== "string" || ![1, 2, 3, 4].includes(rating) || !Number.isInteger(seenReps)) {
    throw new Error("Bad grade");
  }
  await grade(userId, cardId, rating as Grade, Number(durationMs) || 0, seenReps);
  const [next, left] = await Promise.all([nextCard(userId), counts(userId)]);
  return { item: withExercise(next), left: sessionLeft(left) };
}

/** At most this many extra new words a day, however often "+5" is tapped. */
const MAX_EXTRA = 20;

/** "+5 new words today": raises today's new-word budget (up to MAX_EXTRA), then starts a session. */
export async function moreNewWords() {
  const userId = await requireUser();
  const [row] = await db()
    .select({ extra: sql<number>`coalesce(sum(${activityLogs.score}), 0)::int` })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        eq(activityLogs.kind, "extra_new"),
        gte(activityLogs.at, DAY_START),
      ),
    );
  if ((row?.extra ?? 0) < MAX_EXTRA) {
    await db().insert(activityLogs).values({ userId, kind: "extra_new", ref: "today", score: 5 });
  }
  redirect("/review");
}
