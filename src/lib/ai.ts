import { gateway, generateText, Output, transcribe } from "ai";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { aiResults, aiUsage } from "@/db/schema";
import { audioKey } from "./audio";
import type { Locale } from "./i18n";

/**
 * AI help through Vercel AI Gateway (the deployment's OIDC token; the merk project has a monthly
 * budget there). Every call is gated: a daily limit per person, a size limit on the input, and
 * a cache so the same input never costs twice.
 */
export const LIMITS = { feedback: 30, transcript: 40 } as const;
export const MAX_TEXT = 1500;
/** A minute at the 32 kbps the app records with, plus headroom (a crafted low-bitrate file can
 * be longer: at most ~10 minutes, ~$0.03 of speech-to-text; the daily limit bounds the rest). */
export const MAX_AUDIO = 600_000;

const FEEDBACK_MODEL = "anthropic/claude-haiku-5.5";
const TRANSCRIBE_MODEL = "openai/gpt-4o-mini-transcribe";

export type Failure = { ok: false; reason: "limit" | "budget" | "error" };
type Kind = keyof typeof LIMITS;

async function cached(userId: string, kind: Kind, key: string) {
  const [row] = await db()
    .select({ result: aiResults.result })
    .from(aiResults)
    .where(and(eq(aiResults.userId, userId), eq(aiResults.kind, kind), eq(aiResults.key, key)));
  return row?.result;
}

/** Today in merk's day (Berlin, starting at 4 am), as in the review counts. */
const TODAY = sql`(date_trunc('day', (now() at time zone 'Europe/Berlin') - interval '4 hours'))::date`;

/**
 * Takes one of today's calls in a single statement (the row lock makes parallel requests wait
 * their turn); false when the limit is reached. Taken before the call, so failures count too.
 */
async function takeCall(userId: string, kind: Kind) {
  const rows = await db()
    .insert(aiUsage)
    .values({ userId, kind, day: sql`${TODAY}`, n: 1 })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.day, aiUsage.kind],
      set: { n: sql`${aiUsage.n} + 1` },
      setWhere: sql`${aiUsage.n} < ${LIMITS[kind]}`,
    })
    .returning({ n: aiUsage.n });
  return rows.length > 0;
}

const isBudget = (error: unknown) =>
  (error as { statusCode?: number }).statusCode === 402 ||
  /quota_for_entity_exceeded|budget exceeded/i.test(String(error));

/** Cache first, then a call from today's limit; a spent gateway budget is reported as such. */
async function gated<T>(
  userId: string,
  kind: Kind,
  key: string,
  call: () => Promise<T>,
): Promise<{ ok: true; result: T } | Failure> {
  const hit = await cached(userId, kind, key);
  if (hit !== undefined) return { ok: true, result: hit as T };
  if (!(await takeCall(userId, kind))) return { ok: false, reason: "limit" };
  try {
    const result = await call();
    await db()
      .insert(aiResults)
      .values({ userId, kind, key, result: result as object })
      .onConflictDoNothing();
    return { ok: true, result };
  } catch (error) {
    if (isBudget(error)) return { ok: false, reason: "budget" };
    // Not the error itself: it carries the learner's text.
    const { name, statusCode } = error as { name?: string; statusCode?: number };
    console.error("AI call failed", name, statusCode);
    return { ok: false, reason: "error" };
  }
}

const Feedback = z.object({
  score: z.number().int().min(0).max(100),
  corrections: z.array(z.object({ wrong: z.string(), right: z.string(), why: z.string() })).max(6),
  better: z.string(),
  tip: z.string(),
  checklist: z.array(z.boolean()),
});
export type Feedback = z.infer<typeof Feedback>;

// Short and fixed, so every call pays for as few tokens as possible. `why` and `tip` are in the
// learner's UI language.
const system = (
  lang: string,
) => `You are a strict, kind German teacher. The learner is a French native speaker.
Mark their answer to the task at the given CEFR level.
- score: 0-100 for task done + correct, natural German at that level.
- corrections: only real mistakes (max 6, none if it is correct), wrong -> right, why in at most 12 ${lang} words.
- better: their answer corrected and made natural, keeping their ideas and length.
- tip: one short ${lang} sentence, the most useful next step.
- checklist: one true/false per checklist point, in order; empty if none.`;
const LANGUAGE: Record<Locale, string> = { en: "English", fr: "French" };

export type Task = { task: string; level: string; checklist?: string[] };

function prompt({ task, level, checklist }: Task, answer: string, spoken: boolean) {
  const points = checklist?.length
    ? `\nChecklist:\n${checklist.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
    : "";
  return `Level: ${level}\nTask: ${task}${points}\n${spoken ? "Spoken answer (transcript)" : "Written answer"}:\n${answer}`;
}

/** Feedback on a written or spoken (transcribed) answer to a task. */
export function feedback(
  userId: string,
  task: Task,
  answer: string,
  spoken = false,
  locale: Locale = "en",
) {
  const text = answer.slice(0, MAX_TEXT).trim();
  // English keeps the old v1 keys, so its cached results still count.
  const lang = locale === "en" ? "" : `${locale}|`;
  return gated(
    userId,
    "feedback",
    audioKey(`v1|${lang}${spoken}|${task.level}|${task.task}|${text}`),
    async () => {
      const { output } = await generateText({
        model: FEEDBACK_MODEL,
        system: system(LANGUAGE[locale]),

        prompt: prompt(task, text, spoken),
        output: Output.object({ schema: Feedback }),
        maxOutputTokens: 700,
        providerOptions: { anthropic: { thinking: { type: "disabled" } } },
      });
      return { ...output, corrections: output.corrections.filter((c) => c.wrong !== c.right) };
    },
  );
}

/** What was said in a German recording. */
export function transcript(userId: string, audio: Uint8Array, key: string) {
  return gated(userId, "transcript", key, async () => {
    const { text } = await transcribe({
      model: gateway.transcriptionModel(TRANSCRIBE_MODEL),
      audio,
      providerOptions: { openai: { language: "de" } },
    });
    return text.trim();
  });
}
