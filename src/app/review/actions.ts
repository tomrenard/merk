"use server";

import { Rating } from "ts-fsrs";
import { grade, nextCard } from "@/lib/review";

const GRADES = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;

export async function gradeAndNext(cardId: string, rating: number, durationMs: number) {
  const valid = GRADES.find((g) => g === rating);
  if (valid === undefined || typeof cardId !== "string") throw new Error("Bad grade");
  await grade(cardId, valid, Number(durationMs) || 0);
  return nextCard();
}
