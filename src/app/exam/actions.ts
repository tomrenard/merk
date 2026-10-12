"use server";

import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { examById } from "@/lib/course";
import { requireUser } from "@/lib/session";

/** Saves an exam result as a percentage (passed when at or above the exam's pass mark). */
export async function recordExam(examId: string, percent: number) {
  const userId = await requireUser();
  const exam = examById(String(examId));
  if (!exam || !Number.isInteger(percent) || percent < 0 || percent > 100)
    throw new Error("Bad exam result");
  await db()
    .insert(activityLogs)
    .values({ userId, kind: "exam", ref: `exam:${exam.id}`, score: percent, total: 100 });
}
