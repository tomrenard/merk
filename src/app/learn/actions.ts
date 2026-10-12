"use server";

import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { CHECK_SIZE, PASS, type PartKind, unitById } from "@/lib/course";
import { startUnitCard } from "@/lib/review";
import { requireUser } from "@/lib/session";

/** Saves a unit check and makes sure the unit has its review card (created once, safe to repeat). */
export async function recordUnit(unitId: string, score: number, testOut = false) {
  const userId = await requireUser();
  const unit = unitById(String(unitId));
  if (!unit || !Number.isInteger(score) || score < 0 || score > CHECK_SIZE)
    throw new Error("Bad unit result");
  await db()
    .insert(activityLogs)
    .values({ userId, kind: "unit", ref: unit.id, score, total: CHECK_SIZE });
  // A passed test-out counts the unit's other parts as done too.
  if (testOut === true && score >= PASS) {
    await db()
      .insert(activityLogs)
      .values({ userId, kind: "tested", ref: unit.id, score, total: CHECK_SIZE });
  }
  await startUnitCard(userId, unit);
}

/** Saves a finished listen, speak or write part (score: right answers, or 1 for done). */
export async function recordPart(unitId: string, kind: PartKind, score: number, total: number) {
  const userId = await requireUser();
  const unit = unitById(String(unitId));
  const valid =
    unit &&
    ["listen", "speak", "write"].includes(kind) &&
    Number.isInteger(score) &&
    Number.isInteger(total) &&
    score >= 0 &&
    total >= 1 &&
    total <= 20 &&
    score <= total;
  if (!valid) throw new Error("Bad part result");
  await db().insert(activityLogs).values({ userId, kind, ref: unit.id, score, total });
}
