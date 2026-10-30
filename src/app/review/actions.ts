"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { freshPages } from "@/lib/fresh";
import { getCourse } from "@/lib/locale";
import { DAY_START } from "@/lib/review";
import { requireUser } from "@/lib/session";

/** At most this many extra new words a day, however often "+5" is tapped. */
const MAX_EXTRA = 20;

/** "+5 new words today": raises today's new-word budget (up to MAX_EXTRA), then starts a session. */
export async function moreNewWords() {
  const userId = await requireUser();
  const course = await getCourse();
  const [row] = await db()
    .select({ extra: sql<number>`coalesce(sum(${activityLogs.score}), 0)::int` })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        eq(activityLogs.course, course),
        eq(activityLogs.kind, "extra_new"),
        gte(activityLogs.at, DAY_START),
      ),
    );
  if ((row?.extra ?? 0) < MAX_EXTRA) {
    await db()
      .insert(activityLogs)
      .values({ userId, course, kind: "extra_new", ref: "today", score: 5 });
  }
  freshPages();
  redirect("/review");
}
