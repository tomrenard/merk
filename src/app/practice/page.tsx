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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="flex justify-between text-sm">
        <Link href="/" className="opacity-60">
          ← merk
        </Link>
        <nav className="flex gap-4">
          {(["today", "all"] as const).map((s) => (
            <a key={s} href={`/practice?scope=${s}`} className={s === scope ? "" : "opacity-60"}>
              {s === "today" ? "Today's words" : "All my words"}
            </a>
          ))}
        </nav>
      </header>
      {words.length ? (
        <Practice words={words} scope={scope} />
      ) : (
        <p className="mt-24 text-center opacity-60">
          {scope === "today" ? "Nothing studied today yet." : "No words studied yet."}
        </p>
      )}
    </main>
  );
}
