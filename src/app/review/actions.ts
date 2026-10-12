"use server";

import type { Grade } from "ts-fsrs";
import { grade, nextCard } from "@/lib/review";
import { requireSession } from "@/lib/session";

export async function gradeAndNext(
  cardId: string,
  rating: number,
  durationMs: number,
  seenReps: number,
) {
  await requireSession();
  if (typeof cardId !== "string" || ![1, 2, 3, 4].includes(rating) || !Number.isInteger(seenReps)) {
    throw new Error("Bad grade");
  }
  await grade(cardId, rating as Grade, Number(durationMs) || 0, seenReps);
  return nextCard();
}
