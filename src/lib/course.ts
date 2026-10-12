import { and, eq, gte, max, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import a101 from "../../data/units/a1-01.json";
import a102 from "../../data/units/a1-02.json";
import a103 from "../../data/units/a1-03.json";
import a104 from "../../data/units/a1-04.json";
import a105 from "../../data/units/a1-05.json";
import { DAY_START, type ReviewItem } from "./review";
import type { Unit, UnitItem } from "./units";

/** The course in teaching order. Add a unit: write data/units/<id>.json, import it here. */
export const UNITS = [a101, a102, a103, a104, a105] as Unit[];

/** Right answers out of CHECK_SIZE needed to count a unit as done. */
export const CHECK_SIZE = 6;
export const PASS = 5;

export function unitById(id: string): Unit | undefined {
  return UNITS.find((unit) => unit.id === id);
}

/** Best check score per unit tried so far. */
export async function unitScores(): Promise<Map<string, number>> {
  const rows = await db()
    .select({ ref: activityLogs.ref, best: max(activityLogs.score) })
    .from(activityLogs)
    .where(eq(activityLogs.kind, "unit"))
    .groupBy(activityLogs.ref);
  return new Map(rows.map((row) => [row.ref, row.best ?? 0]));
}

/**
 * The unit to do next: the first one not passed yet. Soft gate: a unit tried once (passed or
 * not) no longer blocks the next one, so a hard unit can't stop the course; it stays marked to
 * retry. Null when the course is done.
 */
export function nextUnit(scores: Map<string, number>): Unit | null {
  return (
    UNITS.find((unit) => !scores.has(unit.id)) ??
    UNITS.find((unit) => (scores.get(unit.id) ?? 0) < PASS) ??
    null
  );
}

/** True if a unit check was done today (the lesson step of the daily path). */
export async function lessonDoneToday(): Promise<boolean> {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(and(eq(activityLogs.kind, "unit"), gte(activityLogs.at, DAY_START)));
  return (row?.n ?? 0) > 0;
}

export type ReviewCard = ReviewItem & { exercise?: UnitItem };

/** A unit review card shows one random exercise of its unit. */
export function withExercise(item: ReviewItem | null): ReviewCard | null {
  if (item?.direction !== "unit") return item;
  const items = unitById(item.note.id.replace(/^unit:/, ""))?.items ?? [];
  return { ...item, exercise: items[Math.floor(Math.random() * items.length)] };
}
