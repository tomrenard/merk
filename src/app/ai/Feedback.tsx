"use client";

import type { Failure, Feedback } from "@/lib/ai";
import { CHEERS } from "@/lib/courses";
import { useCourse, useT } from "../Locale";

const WHY = {
  limit: "You've used today's AI checks. They come back tomorrow.",
  budget: "AI feedback is paused until next month (its monthly budget is used up).",
  error: "AI feedback didn't work this time. Try again in a moment.",
};

/** Why there is no AI feedback right now; the screen keeps working without it. */
export function AiFailure({ failure }: { failure: Failure }) {
  const t = useT();
  return (
    <p role="status" className="muted text-sm font-semibold">
      {t(WHY[failure.reason])}
    </p>
  );
}

/** The teacher's feedback: score, corrections, a better version and one tip. */
export function FeedbackCard({ feedback, heard }: { feedback: Feedback; heard?: string }) {
  const t = useT();
  const course = useCourse();
  return (
    <section className="card flex flex-col gap-3" aria-label={t("AI feedback")}>
      <div className="flex items-center justify-between">
        <p className="font-extrabold">{t("Feedback")}</p>
        <p className="text-xl font-black text-[var(--brand)]">{feedback.score}/100</p>
      </div>
      {heard !== undefined && (
        <p className="rounded-xl bg-[var(--field)] p-3 font-semibold">
          {t("Heard:")} „{heard || "…"}“
        </p>
      )}
      {feedback.corrections.length ? (
        <ul className="flex flex-col gap-2">
          {feedback.corrections.map((c) => (
            <li key={`${c.wrong}>${c.right}`} className="flex flex-col">
              <span className="font-semibold">
                <s className="text-rose-600 dark:text-rose-400">{c.wrong}</s> →{" "}
                <span className="text-green-700 dark:text-green-400">{c.right}</span>
              </span>
              <span className="muted text-sm">{c.why}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-semibold text-green-700 dark:text-green-400">
          {t("No mistakes.")} {CHEERS[course].veryGood}
        </p>
      )}
      <div>
        <p className="muted text-sm font-extrabold">{t("Better")}</p>

        <p className="font-semibold leading-relaxed" lang={course === "ary" ? "fr" : "de"}>
          {feedback.better}
        </p>
      </div>
      <p className="text-sm font-semibold">💡 {feedback.tip}</p>
    </section>
  );
}
