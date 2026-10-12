import { and, eq, gte, inArray, max, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { DAY_START, type ReviewItem } from "./review";
import { PARTS_OF_COURSE, type Unit, type UnitItem } from "./units";
import { UNITS as WRITTEN } from "./units-index";

/** The written lessons in course order (A1.1 … B2.2). */
export const UNITS: Unit[] = PARTS_OF_COURSE.flatMap((part) =>
  (part.lessons as readonly string[]).flatMap((id) => WRITTEN.filter((unit) => unit.id === id)),
);

/** Grammar unit, topic lesson (a theme's words) or story (a longer text). Old files have no kind. */
export const kindOf = (unit: Unit) => unit.kind ?? "grammar";

/**
 * A lesson's parts, one a day: the main lesson (logged as "unit"), then a dialogue with
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

/** The first part's name and icon depend on the lesson: a rule, a theme's words, or a story. */
const FIRST = {
  grammar: { label: "Grammar", icon: "🧩" },
  topic: { label: "Words & phrases", icon: "💬" },
  story: { label: "Story", icon: "📖" },
} as const;
export const partLabel = (unit: Unit, part: Part): string =>
  part.kind === "unit" ? FIRST[kindOf(unit)].label : part.label;
export const partIcon = (unit: Unit, part: Part): string =>
  part.kind === "unit" ? FIRST[kindOf(unit)].icon : part.icon;

/** Whole lessons marked done without doing the parts: a passed test-out, or the placement test. */
const SKIPPED = ["tested", "placement"];
const KINDS = [...PARTS.map((part) => part.kind), ...SKIPPED, "exam"];

/**
 * Per lesson, the best score of each part done (main lesson: the check; other parts: 1). Exams
 * are in the same map under "exam:<id>" with their best percentage as "unit".
 */
export type Progress = Map<string, Map<PartKind, number>>;

/** Right answers out of CHECK_SIZE needed to count a lesson's check as passed. */
export const CHECK_SIZE = 6;
export const PASS = 5;

/** An exam at the end of a part (A1.1…) or of a level (A1…, modelled on the Goethe exams). */
export type CourseExam = {
  id: string;
  level: string;
  type: "part" | "level";
  title: string;
  pass: number;
};

const partExam = (id: string): CourseExam => ({
  id,
  level: id.slice(0, 2),
  type: "part",
  title: `${id} exam`,
  pass: 70,
});
const levelExam = (level: string): CourseExam => ({
  id: level,
  level,
  type: "level",
  title: `${level} exam`,
  pass: 60,
});

/** The course's parts with their written lessons and the exams that close them. */
export const COURSE = PARTS_OF_COURSE.map((part, i) => {
  const level = part.id.slice(0, 2);
  const lastOfLevel = PARTS_OF_COURSE[i + 1]?.id.slice(0, 2) !== level;
  return {
    id: part.id,
    level,
    units: UNITS.filter((unit) => (part.lessons as readonly string[]).includes(unit.id)),
    exams: [partExam(part.id), ...(lastOfLevel ? [levelExam(level)] : [])],
  };
}).filter((part) => part.units.length > 0);

export function examById(id: string): CourseExam | undefined {
  return COURSE.flatMap((part) => part.exams).find((exam) => exam.id === id);
}

export function unitById(id: string): Unit | undefined {
  return UNITS.find((unit) => unit.id === id);
}

export function examScore(progress: Progress, exam: CourseExam): number | undefined {
  return progress.get(`exam:${exam.id}`)?.get("unit");
}

export const examPassed = (progress: Progress, exam: CourseExam) =>
  (examScore(progress, exam) ?? 0) >= exam.pass;

/** A lesson with all four parts done and its check passed. */
export const unitDone = (progress: Progress, unit: Unit) => {
  const done = progress.get(unit.id);
  return done?.size === PARTS.length && (done.get("unit") ?? 0) >= PASS;
};

export type CoursePart = (typeof COURSE)[number];

/** Lessons done in a part, and whether its exams are passed. */
export function partProgress(progress: Progress, part: CoursePart) {
  const done = part.units.filter((unit) => unitDone(progress, unit)).length;
  const passed = part.exams.every((exam) => examPassed(progress, exam));
  return { done, total: part.units.length, passed };
}

/**
 * The part you are in, by the same rule as nextStep: the first one with a lesson part left or
 * an exam not passed (a failed check doesn't hold you back; it comes back at the end).
 */
export function currentPart(progress: Progress): CoursePart | undefined {
  return COURSE.find(
    (part) =>
      part.units.some((unit) => (progress.get(unit.id)?.size ?? 0) < PARTS.length) ||
      !partProgress(progress, part).passed,
  );
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
    if (row.ref.startsWith("exam:")) {
      // An exam skipped by the placement test counts as passed.
      const score = SKIPPED.includes(row.kind) ? 100 : (row.best ?? 0);
      parts.set("unit", Math.max(parts.get("unit") ?? 0, score));
    } else if (SKIPPED.includes(row.kind)) {
      for (const part of PARTS) {
        parts.set(part.kind, Math.max(parts.get(part.kind) ?? 0, part.kind === "unit" ? PASS : 1));
      }
    } else {
      parts.set(
        row.kind as PartKind,
        Math.max(parts.get(row.kind as PartKind) ?? 0, row.best ?? 0),
      );
    }
    progress.set(row.ref, parts);
  }
  return progress;
}

export type Step =
  | { type: "lesson"; unit: Unit; part: Part; href: string; label: string; icon: string }
  | { type: "exam"; exam: CourseExam; href: string; label: string; icon: string };

const lessonStep = (unit: Unit, part: Part): Step => ({
  type: "lesson",
  unit,
  part,
  href: `/learn/${unit.id}/${part.path}`,
  label: `${unit.title} · ${partLabel(unit, part)}`,
  icon: partIcon(unit, part),
});

const examStep = (exam: CourseExam): Step => ({
  type: "exam",
  exam,
  href: `/exam/${exam.id}`,
  label: exam.type === "level" ? `${exam.title} (like the Goethe exam)` : exam.title,
  icon: exam.type === "level" ? "🏆" : "📝",
});

/**
 * What to do next on the guided path: the first undone lesson part in course order, and at the
 * end of each part its exam, then at the end of a level the level exam. The path waits at an
 * exam until it is passed (every lesson stays open for free choice). A lesson started out of
 * order is finished first. Then failed lesson checks come back. Null when all is done.
 */
export function nextStep(progress: Progress, lastUnitId?: string | null): Step | null {
  const last = UNITS.find((unit) => unit.id === lastUnitId);
  const lastPart = last && PARTS.find((p) => !progress.get(last.id)?.has(p.kind));
  if (last && lastPart) return lessonStep(last, lastPart);
  for (const part of COURSE) {
    for (const unit of part.units) {
      const undone = PARTS.find((p) => !progress.get(unit.id)?.has(p.kind));
      if (undone) return lessonStep(unit, undone);
    }
    const exam = part.exams.find((e) => !examPassed(progress, e));
    if (exam) return examStep(exam);
  }
  const retry = UNITS.find((unit) => (progress.get(unit.id)?.get("unit") ?? 0) < PASS);
  return retry ? lessonStep(retry, PARTS[0]) : null;
}

/** True if a lesson part was done today (the lesson step of the daily path). */
export async function lessonDoneToday(userId: string): Promise<boolean> {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        // Lessons, test-outs and exams; a placement is not today's lesson.
        inArray(activityLogs.kind, [...PARTS.map((p) => p.kind), "tested", "exam"]),
        gte(activityLogs.at, DAY_START),
      ),
    );
  return (row?.n ?? 0) > 0;
}

export type ReviewCard = ReviewItem & { exercise?: UnitItem };

/** A lesson review card shows one random exercise of its lesson. */
export function withExercise(item: ReviewItem | null): ReviewCard | null {
  if (item?.direction !== "unit") return item;
  const items = unitById(item.note.id.replace(/^unit:/, ""))?.items ?? [];
  return { ...item, exercise: items[Math.floor(Math.random() * items.length)] };
}

/** The lesson with the most recent activity, to resume it. */
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

/** Where a finished part leads: the lesson's next part, or the next lesson (or its part's exam). */
export function partAfter(unitId: string, kind: PartKind): { href: string; label: string } | null {
  const unit = unitById(unitId);
  const part = PARTS[PARTS.findIndex((p) => p.kind === kind) + 1];
  if (unit && part)
    return { href: `/learn/${unitId}/${part.path}`, label: `Next: ${partLabel(unit, part)}` };
  const course = COURSE.find((c) => c.units.some((u) => u.id === unitId));
  const next = course?.units[course.units.findIndex((u) => u.id === unitId) + 1];
  if (next) return { href: `/learn/${next.id}/grammar`, label: `Next: ${next.title}` };
  const exam = course?.exams[0];
  return exam ? { href: `/exam/${exam.id}`, label: `Next: ${exam.title}` } : null;
}
