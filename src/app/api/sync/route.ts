import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { Grade } from "ts-fsrs";
import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { CHECK_SIZE, PASS, reviewCard, unitById } from "@/lib/course";
import { courseOfId } from "@/lib/courses";
import { freshPages } from "@/lib/fresh";
import { getCourse, getQuiet } from "@/lib/locale";
import { counts, grade, reviewBatch, sessionLeft, startUnitCard } from "@/lib/review";

/**
 * What the phone did, possibly offline: review grades, finished lesson parts and checks, in the
 * order they happened. `at` is the phone's clock (ms) when it happened.
 */
export type SyncEvent =
  | {
      type: "grade";
      at: number;
      cardId: string;
      rating: number;
      durationMs: number;
      seenReps: number;
    }
  | { type: "part"; at: number; unitId: string; kind: string; score: number; total: number }
  | { type: "unit"; at: number; unitId: string; score: number; testOut: boolean };

/** Sent with a batch request: the session's next cards and what is left. */
export type SyncBatch = {
  cards: NonNullable<Awaited<ReturnType<typeof reviewCard>>>[];
  left: ReturnType<typeof sessionLeft>;
};

/** A part or check is saved once: a queue resent after a lost reply finds it already there. */
async function logOnce(
  userId: string,
  values: { course: string; kind: string; ref: string; score: number; total: number; at: Date },
) {
  // ponytail: check-then-insert, not a unique key; one phone flushes one queue at a time.
  const [found] = await db()
    .select({ id: activityLogs.id })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        eq(activityLogs.kind, values.kind),
        eq(activityLogs.ref, values.ref),
        eq(activityLogs.at, values.at),
      ),
    );
  if (found) return false;
  await db()
    .insert(activityLogs)
    .values({ userId, ...values });
  return true;
}

async function apply(userId: string, event: SyncEvent) {
  // An offline answer can't be from the future, nor older than a week.
  const at = new Date(
    Math.min(Math.max(Number(event.at) || 0, Date.now() - 7 * 86_400_000), Date.now()),
  );
  if (event.type === "grade") {
    const { cardId, rating, durationMs, seenReps } = event;
    if (typeof cardId !== "string" || ![1, 2, 3, 4].includes(rating) || !Number.isInteger(seenReps))
      return;
    await grade(userId, cardId, rating as Grade, Number(durationMs) || 0, seenReps, at);
    return;
  }
  const unit = unitById(String(event.unitId));
  if (!unit) return;
  const course = courseOfId(unit.id);
  const { score } = event;
  if (event.type === "unit") {
    if (!Number.isInteger(score) || score < 0 || score > CHECK_SIZE) return;
    const result = { course, ref: unit.id, score, total: CHECK_SIZE, at };
    await logOnce(userId, { ...result, kind: "unit" });
    // A passed test-out counts the unit's other parts as done too.
    if (event.testOut === true && score >= PASS)
      await logOnce(userId, { ...result, kind: "tested" });
    await startUnitCard(userId, unit, course);
    return;
  }
  const { kind, total } = event;
  const valid =
    ["listen", "speak", "write"].includes(kind) &&
    Number.isInteger(score) &&
    Number.isInteger(total) &&
    score >= 0 &&
    total >= 1 &&
    total <= 20 &&
    score <= total;
  if (valid) await logOnce(userId, { course, kind, ref: unit.id, score, total, at });
}

/**
 * Applies the phone's queued events in order (a bad one is skipped, not retried forever) and,
 * with `batch`, answers with the next review cards. A route, not a server action: action ids
 * change with each deploy, and a queue can outlive one.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Signed out" }, { status: 401 });
  const userId = session.user.id;
  const body = (await request.json().catch(() => null)) as {
    events?: SyncEvent[];
    batch?: boolean;
  } | null;
  const events = Array.isArray(body?.events) ? body.events.slice(0, 500) : [];
  for (const event of events) {
    // One that can't apply (a card of an account signed out since) must not block the rest.
    if (event && typeof event === "object") await apply(userId, event).catch(console.error);
  }
  if (events.some((event) => event?.type !== "grade")) freshPages();
  if (!body?.batch) return Response.json({});
  const [course, quiet] = await Promise.all([getCourse(), getQuiet()]);
  const [items, left] = await Promise.all([reviewBatch(userId, course), counts(userId, course)]);
  const cards = await Promise.all(items.map((item) => reviewCard(item, quiet)));
  return Response.json({
    batch: { cards: cards.filter((card) => card !== null), left: sessionLeft(left) },
  });
}
