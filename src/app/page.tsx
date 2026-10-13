import Link from "next/link";
import {
  courseProgress,
  currentPart,
  lastUnitId,
  lessonDoneToday,
  nextStep,
  partProgress,
} from "@/lib/course";
import { activity, counts, progress } from "@/lib/review";
import { requireUser } from "@/lib/session";
import { Push } from "./Nav";
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
    <Push href={href} className="flex items-center gap-3 py-3">
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
    </Push>
  );
}

/** About 8 seconds a card. */
const minutes = (cards: number) => Math.max(1, Math.round((cards * 8) / 60));

/** Today: a plan (reviews, new words, a lesson part) with one Continue, never a gate. */
export default async function Home() {
  const userId = await requireUser();
  const [
    { due: dueNow, repeats, newLeft, followUps, paused, backlog },
    { reviewsToday, streak },
    { remembered, known },
    course,
    last,
    lessonDone,
  ] = await Promise.all([
    counts(userId),
    activity(userId),
    progress(userId),
    courseProgress(userId),
    lastUnitId(userId),
    lessonDoneToday(userId),
  ]);
  // Reviews include missed words coming back within minutes: the session shows them now.
  const due = dueNow + repeats;
  const cards = due + newLeft + followUps;
  const step = nextStep(course, last);
  const lessonHref = step?.href ?? "/learn";
  const allDone = cards === 0 && (lessonDone || !step);
  const part = currentPart(course);
  const partDone = part && partProgress(course, part);
  return (
    <main className="screen with-tabs">
      <header className="topbar">
        <h1 className="text-3xl font-black tracking-tight text-[var(--brand)]">merk</h1>
        <span className="flex items-center gap-2">
          <span className="chip bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
            🔥 {streak}
          </span>
          <Push href="/settings" className="chip line border" aria-label="Settings">
            ⚙️
          </Push>
        </span>
      </header>

      {course.size === 0 && known === 0 && remembered === null && reviewsToday === 0 && (
        <Push href="/placement" className="card flex items-center gap-3 border-[var(--brand)]">
          <span aria-hidden="true" className="icon bg-[var(--brand-soft)]">
            🧭
          </span>
          <span className="flex-1">
            <span className="block font-extrabold">Find your level</span>
            <span className="muted text-sm font-semibold">
              10 minutes, so you don't start too easy
            </span>
          </span>
          <span aria-hidden="true" className="muted text-2xl font-black">
            ›
          </span>
        </Push>
      )}

      <section className="card flex flex-col gap-1 pt-4 pb-2">
        <h2 className="text-2xl font-black">
          {allDone ? "All done for today 🎉" : "Today's plan"}
        </h2>
        <div className="divide-y divide-[var(--line)]">
          <PlanRow
            done={due === 0}
            icon="🔁"
            title="Reviews"
            detail={due ? `${due} waiting · about ${minutes(due)} min` : "Nothing waiting"}
            href="/review"
          />
          <PlanRow
            done={newLeft + followUps === 0}
            icon="🌱"
            title="New words"
            detail={
              paused
                ? `Paused while more than ${backlog} reviews pile up: reviews first`
                : newLeft + followUps
                  ? `${newLeft} new${followUps ? ` · ${followUps} to write` : ""}`
                  : "Today's new words are done"
            }
            href="/review"
          />
          {step && (
            <PlanRow
              done={lessonDone}
              icon={step.icon}
              title={
                lessonDone ? "Lesson done · next up" : step.type === "exam" ? "Exam" : "Lesson"
              }
              detail={step.label}
              href={lessonHref}
            />
          )}
        </div>
        {!allDone && (
          <div className="flex flex-col gap-2 pt-2 pb-2">
            <Push href={cards ? "/review" : lessonHref} className="btn btn-primary">
              Continue
            </Push>
            {cards > 15 && (
              <div className="flex items-center justify-center gap-2 text-sm font-bold">
                <span className="muted">Short on time?</span>
                {[10, 30].map((limit) => (
                  <Push key={limit} href={`/review?limit=${limit}`} className="chip line border">
                    {minutes(limit)} min
                  </Push>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {allDone && (
        <section className="flex flex-col gap-2">
          <h2 className="muted text-sm font-extrabold">Want more?</h2>
          <form action={moreNewWords}>
            <button type="submit" className="btn w-full">
              🌱 +5 new words today
            </button>
          </form>
          <Push href="/practice?scope=tricky" className="btn">
            🧠 Tricky words
          </Push>
          {step && (
            <Push href={lessonHref} className="btn">
              {step.icon} {step.label}
            </Push>
          )}
        </section>
      )}

      <section>
        <h2 className="muted mb-2 text-sm font-extrabold">Your progress</h2>
        <div className="card divide-y divide-[var(--line)] py-0">
          {part && partDone && (
            <Link href={`/learn#${part.id}`} className="block">
              <Stat
                icon="🧭"
                tint="bg-[var(--brand-soft)]"
                label={`Course · ${part.id} ›`}
                value={`${partDone.done}/${partDone.total}`}
              />
            </Link>
          )}
          <Stat
            icon="✅"
            tint="bg-green-100 dark:bg-green-950"
            label="Reviews today"
            value={reviewsToday}
          />
          {remembered !== null && (
            <Stat
              icon="🎯"
              tint="bg-sky-100 dark:bg-sky-950"
              label="Remembered · 30 days"
              value={`${remembered}%`}
            />
          )}
          <Link href="/words?filter=known" className="block">
            <Stat
              icon="⭐"
              tint="bg-amber-100 dark:bg-amber-950"
              label="Words known ›"
              value={known}
            />
          </Link>
        </div>
      </section>

      <TabBar active="/" />
    </main>
  );
}
