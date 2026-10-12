"use server";

import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { CHECK_SIZE, unitById } from "@/lib/course";
import { startUnitCard } from "@/lib/review";
import { requireUser } from "@/lib/session";

/** Saves a unit check and makes sure the unit has its review card (created once, safe to repeat). */
export async function recordUnit(unitId: string, score: number) {
  const userId = await requireUser();
  const unit = unitById(String(unitId));
  if (!unit || !Number.isInteger(score) || score < 0 || score > CHECK_SIZE)
    throw new Error("Bad unit result");
  await db()
    .insert(activityLogs)
    .values({ userId, kind: "unit", ref: unit.id, score, total: CHECK_SIZE });
  await startUnitCard(userId, unit);
}
