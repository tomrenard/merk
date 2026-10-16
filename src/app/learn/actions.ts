"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { CHECK_SIZE, courseOfUnit, PASS, type PartKind, unitById } from "@/lib/course";
import { freshPages } from "@/lib/fresh";
import { learnTopicWords, startUnitCard } from "@/lib/review";
import { requireUser } from "@/lib/session";

/** Saves a unit check and makes sure the unit has its review card (created once, safe to repeat). */
export async function recordUnit(unitId: string, score: number, testOut = false) {
  const userId = await requireUser();
  const unit = unitById(String(unitId));
  if (!unit || !Number.isInteger(score) || score < 0 || score > CHECK_SIZE)
    throw new Error("Bad unit result");
  const course = courseOfUnit(unit);
  await db()
    .insert(activityLogs)
    .values({ userId, course, kind: "unit", ref: unit.id, score, total: CHECK_SIZE });
  // A passed test-out counts the unit's other parts as done too.
  if (testOut === true && score >= PASS) {
    await db()
      .insert(activityLogs)
      .values({ userId, course, kind: "tested", ref: unit.id, score, total: CHECK_SIZE });
  }
  await startUnitCard(userId, unit, course);
  freshPages();
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
  await db()
    .insert(activityLogs)
    .values({ userId, course: courseOfUnit(unit), kind, ref: unit.id, score, total });
  freshPages();
}

/** A topic lesson's words, not started yet, come up in the next review session. */
export async function learnWords(form: FormData) {
  const userId = await requireUser();
  const unit = unitById(String(form.get("unit")));
  if (!unit?.words?.length) throw new Error("No words for this lesson");
  await learnTopicWords(userId, unit.words, courseOfUnit(unit));

  freshPages();
  redirect("/review");
}
