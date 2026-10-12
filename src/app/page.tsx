import Link from "next/link";
import { lessonDoneToday, nextUnit, unitScores } from "@/lib/course";
import { activity, counts, progress } from "@/lib/review";
import { TabBar } from "./TabBar";

export const dynamic = "force-dynamic";

type StatProps = { icon: string; tint: string; label: string; value: string | number };

function Stat({ icon, tint, label, value }: StatProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className={`icon ${tint}`}>{icon}</span>
      <span className="flex-1 font-bold">{label}</span>
      <span className="text-xl font-black">{value}</span>
    </div>
  );
}

export default async function Home() {
  const [
    { due, newLeft, followUps },
    { reviewsToday, streak },
    { remembered, known },
    scores,
    lessonDone,
  ] = await Promise.all([counts(), activity(), progress(), unitScores(), lessonDoneToday()]);
  const todo = due + newLeft + followUps;
  const unit = nextUnit(scores);
  return (
    <main className="screen with-tabs">
      <header className="topbar">
        <h1 className="text-3xl font-black tracking-tight text-[var(--brand)]">merk</h1>
        <span className="flex items-center gap-2">
          <span className="chip bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
            🔥 {streak}
          </span>
          <Link href="/settings" className="chip line border-2" aria-label="Settings">
            ⚙️
          </Link>
        </span>
      </header>

      <section className="card flex flex-col items-center gap-4 py-6 text-center">
        <span className="icon size-20 bg-[var(--brand-soft)] text-5xl">
          {todo > 0 ? "📚" : "🎉"}
        </span>
        <div>
          <h2 className="text-2xl font-black">
            {todo > 0 ? "Ready to learn" : "All done for today"}
          </h2>
          <p className="muted mt-1 font-semibold">
            {todo > 0
              ? `${due} to review · ${newLeft} new words${followUps ? ` · ${followUps} to write` : ""}`
              : "Come back tomorrow, or keep going"}
          </p>
        </div>
        <Link href="/review" className={`btn w-full ${todo > 0 ? "btn-primary" : ""}`}>
          {todo > 0 ? "Start" : "Review anyway"}
        </Link>
      </section>

      {unit && (
        <Link href={`/learn/${unit.id}`} className="card flex items-center gap-3">
          <span
            className={`icon ${lessonDone ? "bg-green-100 dark:bg-green-950" : "bg-sky-100 dark:bg-sky-950"}`}
          >
            {lessonDone ? "✓" : "🎓"}
          </span>
          <span className="flex-1">
            <span className="muted block text-sm font-extrabold tracking-wide uppercase">
              {lessonDone ? "Lesson done today · next" : "Today's lesson"}
            </span>
            <span className="block font-extrabold">{unit.title}</span>
          </span>
          <span className="muted text-2xl font-black">›</span>
        </Link>
      )}

      <section>
        <h2 className="muted mb-2 text-sm font-extrabold tracking-wide uppercase">Your progress</h2>
        <div className="card divide-y-2 divide-[var(--line)] py-0">
          <Stat
            icon="✅"
            tint="bg-green-100 dark:bg-green-950"
            label="Reviews today"
            value={reviewsToday}
          />
          <Stat
            icon="🎯"
            tint="bg-sky-100 dark:bg-sky-950"
            label="Remembered · 30 days"
            value={remembered === null ? "–" : `${remembered}%`}
          />
          <Link href="/words?known=1" className="block">
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
