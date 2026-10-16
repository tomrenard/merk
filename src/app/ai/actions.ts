"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import { feedback, MAX_AUDIO, MAX_TEXT, type Task, transcript } from "@/lib/ai";
import { unitById } from "@/lib/course";
import { getLocale } from "@/lib/locale";
import { requireUser } from "@/lib/session";
import { LEVEL_EXAMS } from "../exam/data";

/** Where a task comes from: a lesson's writing task, or a level exam's writing/speaking task. */
const TaskRef = z.union([
  z.object({ unit: z.string().max(20) }),
  z.object({
    exam: z.string().max(4),
    part: z.enum(["schreiben", "sprechen"]),
    index: z.number().int().min(0).max(5),
  }),
]);
export type TaskRef = z.infer<typeof TaskRef>;

/** Tasks are looked up on the server: the phone only names them. */
function taskOf(input: unknown): Task | null {
  const parsed = TaskRef.safeParse(input);
  if (!parsed.success) return null;
  const ref = parsed.data;
  if ("unit" in ref) {
    const unit = unitById(String(ref.unit));
    return unit ? { task: unit.writing.task, level: unit.cefr } : null;
  }
  const exam = Object.hasOwn(LEVEL_EXAMS, ref.exam) ? LEVEL_EXAMS[ref.exam] : undefined;
  const task = exam?.[ref.part][ref.index];
  return exam && task ? { task: task.task, level: exam.cefr, checklist: task.checklist } : null;
}

/** Feedback on a written answer. */
export async function checkWriting(ref: TaskRef, text: string) {
  const userId = await requireUser();
  const task = taskOf(ref);
  if (!task || typeof text !== "string" || !text.trim() || text.length > MAX_TEXT)
    throw new Error("Bad writing check");
  return feedback(userId, task, text, false, await getLocale());
}

async function recording(form: FormData) {
  const file = form.get("audio");
  if (!(file instanceof File) || !file.size || file.size > MAX_AUDIO)
    throw new Error("Bad recording");
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { bytes, key: createHash("sha1").update(bytes).digest("hex") };
}

/** What a recording says (repeating a lesson line). */
export async function transcribeRecording(form: FormData) {
  const userId = await requireUser();
  const audio = await recording(form);
  return transcript(userId, audio.bytes, audio.key);
}

/** A spoken answer to an exam task: what was heard, then feedback on it. */
export async function checkSpeaking(form: FormData) {
  const userId = await requireUser();
  let ref: unknown = null;
  try {
    ref = JSON.parse(String(form.get("ref")));
  } catch {}
  const task = taskOf(ref);
  if (!task) throw new Error("Bad speaking check");
  const audio = await recording(form);
  const heard = await transcript(userId, audio.bytes, audio.key);
  if (!heard.ok) return heard;
  const marked = await feedback(
    userId,
    task,
    heard.result || "(nothing said)",
    true,
    await getLocale(),
  );

  return marked.ok ? { ...marked, heard: heard.result } : marked;
}
