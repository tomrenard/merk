"use server";

import { redirect } from "next/navigation";
import type { Grade } from "ts-fsrs";
import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { withExercise } from "@/lib/course";
import { grade, nextCard } from "@/lib/review";
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
  return withExercise(await nextCard(userId));
}

/** "+5 new words today": raises today's new-word budget once, then starts a session. */
export async function moreNewWords() {
  const userId = await requireUser();
  await db().insert(activityLogs).values({ userId, kind: "extra_new", ref: "today", score: 5 });
  redirect("/review");
}
