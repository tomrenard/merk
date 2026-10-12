"use server";

import type { Grade } from "ts-fsrs";
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
