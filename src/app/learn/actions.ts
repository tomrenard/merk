"use server";

import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { CHECK_SIZE, unitById, unitScores } from "@/lib/course";
import { startUnitCard } from "@/lib/review";
import { requireSession } from "@/lib/session";

/** Saves a unit check; the first time, the unit also gets its review card. */
export async function recordUnit(unitId: string, score: number) {
  await requireSession();
  const unit = unitById(String(unitId));
  if (!unit || !Number.isInteger(score) || score < 0 || score > CHECK_SIZE)
    throw new Error("Bad unit result");
  const first = !(await unitScores()).has(unit.id);
  await db().insert(activityLogs).values({ kind: "unit", ref: unit.id, score, total: CHECK_SIZE });
  if (first) await startUnitCard(unit);
}
