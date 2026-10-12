import { and, eq, gte, inArray, max, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { DAY_START, type ReviewItem } from "./review";
import type { Unit, UnitItem } from "./units";
import { UNITS } from "./units-index";

export { UNITS };

/**
 * A unit's parts, one a day: the grammar lesson (logged as "unit"), then a dialogue with
 * questions and dictation, speaking, and a short text to write.
 */
export const PARTS = [
  { kind: "unit", path: "grammar", label: "Grammar", icon: "🧩" },
  { kind: "listen", path: "listen", label: "Listen & read", icon: "🎧" },
  { kind: "speak", path: "speak", label: "Speak", icon: "🎙️" },
  { kind: "write", path: "write", label: "Write", icon: "✍️" },
] as const;
export type Part = (typeof PARTS)[number];
export type PartKind = Part["kind"];
/** Whole units marked done without doing the parts: a passed test-out, or the placement test. */
const SKIPPED = ["tested", "placement"];
const KINDS = [...PARTS.map((part) => part.kind), ...SKIPPED];

/** Per unit, the best score of each part done (grammar: the check; other parts: 1). */
export type Progress = Map<string, Map<PartKind, number>>;

/** Right answers out of CHECK_SIZE needed to count a unit as done. */
export const CHECK_SIZE = 6;
export const PASS = 5;

export function unitById(id: string): Unit | undefined {
  return UNITS.find((unit) => unit.id === id);
}

export async function courseProgress(userId: string): Promise<Progress> {
  const rows = await db()
    .select({ ref: activityLogs.ref, kind: activityLogs.kind, best: max(activityLogs.score) })
    .from(activityLogs)
    .where(and(eq(activityLogs.userId, userId), inArray(activityLogs.kind, KINDS)))
    .groupBy(activityLogs.ref, activityLogs.kind);
  const progress: Progress = new Map();
  for (const row of rows) {
    const parts = progress.get(row.ref) ?? new Map();
    if (SKIPPED.includes(row.kind)) {
      for (const part of PARTS) {
        parts.set(part.kind, Math.max(parts.get(part.kind) ?? 0, part.kind === "unit" ? PASS : 1));
      }
    } else
      parts.set(
        row.kind as PartKind,
        Math.max(parts.get(row.kind as PartKind) ?? 0, row.best ?? 0),
      );
    progress.set(row.ref, parts);
  }
  return progress;
}

/**
 * What to do next: the first part not done yet, in course order. Soft gate: a grammar check
 * tried once (passed or not) doesn't block the rest; once everything was tried, failed grammar
 * checks come back. Null when the course is done.
 */
export function nextStep(
  progress: Progress,
  lastUnitId?: string | null,
): { unit: Unit; part: Part } | null {
  // Resume: a unit you started (perhaps out of order) is finished first.
  const last = UNITS.find((unit) => unit.id === lastUnitId);
  const lastPart = last && PARTS.find((p) => !progress.get(last.id)?.has(p.kind));
  if (last && lastPart) return { unit: last, part: lastPart };
  for (const unit of UNITS) {
    const part = PARTS.find((p) => !progress.get(unit.id)?.has(p.kind));
    if (part) return { unit, part };
  }
  const retry = UNITS.find((unit) => (progress.get(unit.id)?.get("unit") ?? 0) < PASS);
  return retry ? { unit: retry, part: PARTS[0] } : null;
}

/** True if a lesson part was done today (the lesson step of the daily path). */
export async function lessonDoneToday(userId: string): Promise<boolean> {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        // Lessons and test-outs; a placement is not today's lesson.
        inArray(activityLogs.kind, [...PARTS.map((p) => p.kind), "tested"]),
        gte(activityLogs.at, DAY_START),
      ),
    );
  return (row?.n ?? 0) > 0;
}

export type ReviewCard = ReviewItem & { exercise?: UnitItem };

/** A unit review card shows one random exercise of its unit. */
export function withExercise(item: ReviewItem | null): ReviewCard | null {
  if (item?.direction !== "unit") return item;
  const items = unitById(item.note.id.replace(/^unit:/, ""))?.items ?? [];
  return { ...item, exercise: items[Math.floor(Math.random() * items.length)] };
}

/** The unit with the most recent lesson activity, to resume it. */
export async function lastUnitId(userId: string): Promise<string | null> {
  const [row] = await db()
    .select({ ref: activityLogs.ref })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        inArray(
          activityLogs.kind,
          PARTS.map((p) => p.kind),
        ),
      ),
    )
    .orderBy(sql`${activityLogs.at} desc`)
    .limit(1);
  return row?.ref ?? null;
}

/** Where a finished part leads: the unit's next part, or the next unit's grammar. */
export function partAfter(unitId: string, kind: PartKind): { href: string; label: string } | null {
  const index = UNITS.findIndex((unit) => unit.id === unitId);
  const part = PARTS[PARTS.findIndex((p) => p.kind === kind) + 1];
  if (part) return { href: `/learn/${unitId}/${part.path}`, label: `Next: ${part.label}` };
  const unit = UNITS[index + 1];
  return unit ? { href: `/learn/${unit.id}/grammar`, label: `Next unit: ${unit.title}` } : null;
}
