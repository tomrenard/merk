import Link from "next/link";
import { activity, counts } from "@/lib/review";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ due, newLeft }, { reviewsToday, streak }] = await Promise.all([counts(), activity()]);
  return (
    <main className="mx-auto mt-16 flex max-w-xs flex-col gap-6 p-4 text-center">
      <h1 className="text-4xl font-semibold">merk</h1>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm opacity-60">Due</dt>
          <dd className="text-3xl text-sky-600">{due}</dd>
        </div>
        <div>
          <dt className="text-sm opacity-60">New today</dt>
          <dd className="text-3xl text-green-600">{newLeft}</dd>
        </div>
      </dl>
      <p className="text-sm opacity-60">
        {reviewsToday} review{reviewsToday === 1 ? "" : "s"} today ·{" "}
        {streak > 0 ? `🔥 ${streak}-day streak` : "no streak yet"}
      </p>
      <Link href="/review" className="btn btn-primary">
        {due + newLeft > 0 ? "Lernen" : "Review anyway"}
      </Link>
      <nav className="flex justify-center gap-6 text-sm opacity-60">
        <Link href="/words">Words</Link>
        <Link href="/settings">Settings</Link>
      </nav>
    </main>
  );
}
