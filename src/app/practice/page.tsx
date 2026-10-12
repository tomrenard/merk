import Link from "next/link";
import { type PracticeScope, practiceWords } from "@/lib/review";
import { Practice } from "./Practice";

export const dynamic = "force-dynamic";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const scope: PracticeScope = (await searchParams).scope === "all" ? "all" : "today";
  const words = await practiceWords(scope);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="topbar">
        <Link href="/" className="pill">
          ← merk
        </Link>
        <nav className="flex gap-1 rounded-full p-1" style={{ background: "var(--glass)" }}>
          {(["today", "all"] as const).map((s) => (
            <a
              key={s}
              href={`/practice?scope=${s}`}
              className={`rounded-full px-3 py-1 ${s === scope ? "bg-violet-600 text-white" : "muted"}`}
            >
              {s === "today" ? "Today" : "All"}
            </a>
          ))}
        </nav>
      </header>
      {words.length ? (
        <Practice words={words} scope={scope} />
      ) : (
        <p className="card mt-24 text-center font-semibold">
          {scope === "today" ? "Nothing studied today yet." : "No words studied yet."}
        </p>
      )}
    </main>
  );
}
