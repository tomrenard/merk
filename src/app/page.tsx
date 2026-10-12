import Link from "next/link";
import { activity, counts, progress } from "@/lib/review";

export const dynamic = "force-dynamic";

function Tile({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className={`rounded-3xl p-4 text-left text-white shadow-lg ${tone}`}>
      <p className="text-4xl font-extrabold tracking-tight">{value}</p>
      <p className="text-sm font-semibold opacity-90">{label}</p>
    </div>
  );
}

export default async function Home() {
  const [{ due, newLeft }, { reviewsToday, streak }, { remembered, known }] = await Promise.all([
    counts(),
    activity(),
    progress(),
  ]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-5 p-5 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <h1 className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
          merk
        </h1>
        <span className="pill text-sm font-bold">
          {streak > 0 ? `🔥 ${streak} day${streak === 1 ? "" : "s"}` : "🌱 day 1"}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Tile label="Due" value={due} tone="bg-gradient-to-br from-sky-400 to-blue-600" />
        <Tile
          label="New today"
          value={newLeft}
          tone="bg-gradient-to-br from-lime-400 to-emerald-600"
        />
        <Tile
          label="Remembered · 30d"
          value={remembered === null ? "–" : `${remembered}%`}
          tone="bg-gradient-to-br from-pink-400 to-rose-600"
        />
        <Tile
          label="Words known"
          value={known}
          tone="bg-gradient-to-br from-amber-400 to-orange-600"
        />
      </div>

      <p className="muted text-center text-sm font-medium">
        {reviewsToday} review{reviewsToday === 1 ? "" : "s"} today
      </p>

      <Link href="/review" className="btn btn-primary py-5 text-xl">
        {due + newLeft > 0 ? "Lernen →" : "Review anyway"}
      </Link>
      <Link href="/practice" className="btn">
        🎯 Practice
      </Link>

      <nav className="mt-auto flex justify-center gap-3 text-sm font-semibold">
        <Link href="/words" className="pill">
          📚 Words
        </Link>
        <Link href="/settings" className="pill">
          ⚙️ Settings
        </Link>
      </nav>
    </main>
  );
}
