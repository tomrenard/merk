"use server";

import { redirect } from "next/navigation";
import { unitById } from "@/lib/course";
import { courseOfId } from "@/lib/courses";
import { freshPages } from "@/lib/fresh";
import { learnTopicWords } from "@/lib/review";
import { requireUser } from "@/lib/session";

/** A topic lesson's words, not started yet, come up in the next review session. */
export async function learnWords(form: FormData) {
  const userId = await requireUser();
  const unit = unitById(String(form.get("unit")));
  if (!unit?.words?.length) throw new Error("No words for this lesson");
  await learnTopicWords(userId, unit.words, courseOfId(unit.id));

  freshPages();
  redirect("/review");
}
