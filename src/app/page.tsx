import Link from "next/link";
import {
  courseProgress,
  currentPart,
  lastUnitId,
  lessonDoneToday,
  levelName,
  levelProgress,
  nextStep,
} from "@/lib/course";
import { COURSES, shownId } from "@/lib/courses";
import type { T } from "@/lib/i18n";
import { getCourse, getQuiet, getT } from "@/lib/locale";
import { activity, counts, progress, wordLevels } from "@/lib/review";
import { requireUser } from "@/lib/session";
import { Go } from "./Nav";
import { moreNewWords } from "./review/actions";
import { TabBar } from "./TabBar";

export const dynamic = "force-dynamic";

type StatProps = { icon: string; tint: string; label: string; value: string | number };

function Stat({ icon, tint, label, value }: StatProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span aria-hidden="true" className={`icon ${tint}`}>
        {icon}
      </span>
      <span className="flex-1 font-bold">{label}</span>
      <span className="text-xl font-black">{value}</span>
    </div>
  );
}

/**
 * Where you are from A1 to B2: one bar per level (lessons done or skipped), the part you are in,
 * and the share of each level's words started.
 */
function LevelCard({
  part,
  levels,
  words,
  t,
}: {
  part: { id: string; level: string } | undefined;
  levels: ReturnType<typeof levelProgress>;
  words: Awaited<ReturnType<typeof wordLevels>>;
  t: T;
}) {
  const level = part?.level ?? levels.at(-1)?.level ?? "A1";
  const pct = (n: number, of: number) => (of ? Math.round((100 * n) / of) : 0);
  const here = levels.find((l) => l.level === level);
  return (
    <Link href={part ? `/learn#${part.id}` : "/learn"} className="card flex flex-col gap-3">
      <span className="flex items-baseline justify-between">
        <span className="text-2xl font-black">
          {level} <span className="muted text-base font-bold">{levelName(level, t)}</span>
        </span>
        <span className="muted text-sm font-bold">
          {part ? `${shownId(part.id)} ›` : `${t("All done")} ›`}
        </span>
      </span>
      <span
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${Math.max(levels.length, 1)}, 1fr)` }}
      >
        {levels.map((l) => (
          <span key={l.level} className="flex flex-col gap-1">
            {/* Done solid, then skipped by the placement test faded. */}
            <span className="flex h-2.5 overflow-hidden rounded-full bg-[var(--line)]">
              <span className="bg-[var(--brand)]" style={{ width: `${pct(l.done, l.total)}%` }} />
              <span
                className="bg-[var(--brand)] opacity-35"
                style={{ width: `${pct(l.skipped, l.total)}%` }}
              />
            </span>
            <span
              className={`text-xs font-extrabold ${l.level === level ? "text-[var(--brand)]" : "muted"}`}
            >
              {l.level}
              {l.passed && " ✓"}
            </span>
          </span>
        ))}
      </span>
      {here && (
        <span className="muted text-sm font-semibold">
          {t("{level}: {done} of {total} lessons done", {
            level: here.level,
            done: here.done,
            total: here.total,
          })}
          {here.skipped > 0 && ` · ${t("{n} skipped by the placement test", { n: here.skipped })}`}
        </span>
      )}
      {words.length > 0 && (
        <span className="muted text-sm font-semibold">
          {t("Words")}: {words.map((w) => `${w.level} ${pct(w.started, w.total)}%`).join(" · ")}
        </span>
      )}
    </Link>
  );
}

/** One row of today's plan: done or to do, with its own link. */
function PlanRow({
  done,
  icon,
  title,
  detail,
  href,
}: {
  done: boolean;
  icon: string;
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <Go href={href} className="flex items-center gap-3 py-3">
      <span
        aria-hidden="true"
        className={`icon ${done ? "bg-green-100 dark:bg-green-950" : "bg-[var(--field)]"}`}
      >
        {done ? "✓" : icon}
      </span>
      <span className="flex-1">
        <span className={`block font-extrabold ${done ? "muted line-through" : ""}`}>{title}</span>
        <span className="muted text-sm font-semibold">{detail}</span>
      </span>
      <span aria-hidden="true" className="muted text-2xl font-black">
        ›
      </span>
    </Go>
  );
}

/** About 8 seconds a card. */
const minutes = (cards: number) => Math.max(1, Math.round((cards * 8) / 60));

/** Today: a plan (reviews, new words, a lesson part) with one Continue, never a gate. */
export default async function Home() {
  const userId = await requireUser();
  const [t, courseId, quiet] = await Promise.all([getT(), getCourse(), getQuiet()]);
  const { flag, name, placement } = COURSES[courseId];
  const [
    { due: dueNow, repeats, newLeft, followUps, paused, backlog },
    { reviewsToday, streak },
    { remembered, known },
    course,
    last,
    lessonDone,
    words,
  ] = await Promise.all([
    counts(userId, courseId),
    activity(userId),
    progress(userId, courseId),
    courseProgress(userId, courseId),
    lastUnitId(userId, courseId),
    lessonDoneToday(userId, courseId),
    wordLevels(userId, courseId),
  ]);
  // Reviews include missed words coming back within minutes: the session shows them now.
  const due = dueNow + repeats;
  const cards = due + newLeft + followUps;
  const step = nextStep(course, last, t, courseId);
  const lessonHref = step?.href ?? "/learn";
  const allDone = cards === 0 && (lessonDone || !step);
  const part = currentPart(course, courseId);
  return (
    <main className="screen with-tabs">
      <header className="topbar">
        <h1 className="text-3xl font-black tracking-tight text-[var(--brand)]">merk</h1>
        <span className="flex items-center gap-2">
          {quiet && (
            <Go href="/settings#quiet" className="chip line border" aria-label={t("Quiet mode")}>
              🤫
            </Go>
          )}
          <Go href="/settings#course" className="chip line border" aria-label={t(name)}>
            {flag}
          </Go>
          <span className="chip bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
            🔥 {streak}
          </span>
          <Go href="/settings" className="chip line border" aria-label={t("Settings")}>
            ⚙️
          </Go>
        </span>
      </header>

      {placement &&
        course.size === 0 &&
        !course.skipped?.size &&
        known === 0 &&
        remembered === null &&
        reviewsToday === 0 && (
          <Go href="/placement" className="card flex items-center gap-3 border-[var(--brand)]">
            <span aria-hidden="true" className="icon bg-[var(--brand-soft)]">
              🧭
            </span>
            <span className="flex-1">
              <span className="block font-extrabold">{t("Find your level")}</span>
              <span className="muted text-sm font-semibold">
                {t("10 minutes, so you don't start too easy")}
              </span>
            </span>
            <span aria-hidden="true" className="muted text-2xl font-black">
              ›
            </span>
          </Go>
        )}

      <section className="card flex flex-col gap-1 pt-4 pb-2">
        <h2 className="text-2xl font-black">
          {allDone ? `${t("All done for today")} 🎉` : t("Today's plan")}
        </h2>
        <div className="divide-y divide-[var(--line)]">
          <PlanRow
            done={due === 0}
            icon="🔁"
            title={t("Reviews")}
            detail={
              due
                ? t("{n} waiting · about {min} min", { n: due, min: minutes(due) })
                : t("Nothing waiting")
            }
            href="/review"
          />
          <PlanRow
            done={newLeft + followUps === 0}
            icon="🌱"
            title={t("New words")}
            detail={
              paused
                ? t("Paused while more than {n} reviews pile up: reviews first", { n: backlog })
                : newLeft + followUps
                  ? `${t("{n} new", { n: newLeft })}${followUps ? ` · ${t("{n} to write", { n: followUps })}` : ""}`
                  : t("Today's new words are done")
            }
            href="/review"
          />
          {step && (
            <PlanRow
              done={lessonDone}
              icon={step.icon}
              title={
                lessonDone
                  ? t("Lesson done · next up")
                  : step.type === "exam"
                    ? t("Exam")
                    : t("Lesson")
              }
              detail={step.label}
              href={lessonHref}
            />
          )}
        </div>
        {!allDone && (
          <div className="flex flex-col gap-2 pt-2 pb-2">
            <Go href={cards ? "/review" : lessonHref} className="btn btn-primary">
              {t("Continue")}
            </Go>
            {cards > 15 && (
              <div className="flex items-center justify-center gap-2 text-sm font-bold">
                <span className="muted">{t("Short on time?")}</span>
                {[10, 30].map((limit) => (
                  <Go key={limit} href={`/review?limit=${limit}`} className="chip line border">
                    {minutes(limit)} min
                  </Go>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {allDone && (
        <section className="flex flex-col gap-2">
          <h2 className="muted text-sm font-extrabold">{t("Want more?")}</h2>
          <form action={moreNewWords}>
            <button type="submit" className="btn w-full">
              🌱 {t("+5 new words today")}
            </button>
          </form>
          <Go href="/practice?scope=tricky" className="btn">
            🧠 {t("Tricky words")}
          </Go>
          {step && (
            <Go href={lessonHref} className="btn">
              {step.icon} {step.label}
            </Go>
          )}
        </section>
      )}

      <section>
        <h2 className="muted mb-2 text-sm font-extrabold">{t("Your progress")}</h2>
        <div className="mb-3">
          <LevelCard part={part} levels={levelProgress(course, courseId)} words={words} t={t} />
        </div>
        <div className="card divide-y divide-[var(--line)] py-0">
          <Stat
            icon="✅"
            tint="bg-green-100 dark:bg-green-950"
            label={t("Reviews today")}
            value={reviewsToday}
          />
          {remembered !== null && (
            <Stat
              icon="🎯"
              tint="bg-sky-100 dark:bg-sky-950"
              label={t("Remembered · 30 days")}
              value={`${remembered}%`}
            />
          )}
          <Link href="/words?filter=known" className="block">
            <Stat
              icon="⭐"
              tint="bg-amber-100 dark:bg-amber-950"
              label={`${t("Words known")} ›`}
              value={known}
            />
          </Link>
        </div>
      </section>

      <TabBar active="/" />
    </main>
  );
}
