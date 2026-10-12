import { asc, eq, ilike, or, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { cards, notes } from "@/db/schema";
import { articleColor } from "@/lib/german";

export const dynamic = "force-dynamic";

export default async function WordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const words = await db()
    .select({ id: notes.id, de: notes.de, en: notes.en, cefr: notes.cefr, due: cards.due })
    .from(notes)
    .leftJoin(cards, eq(cards.id, sql`${notes.id} || ':de_en'`))
    .where(q ? or(ilike(notes.de, `%${q}%`), ilike(notes.en, `%${q}%`)) : undefined)
    .orderBy(asc(notes.ord))
    .limit(100);
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <header className="flex justify-between text-sm opacity-60">
        <Link href="/">← merk</Link>
        <span>{q ? `${words.length}${words.length === 100 ? "+" : ""} found` : "first 100"}</span>
      </header>
      <form>
        <input
          name="q"
          type="search"
          defaultValue={q}
          lang="de"
          autoCapitalize="off"
          placeholder="Search German or English…"
          aria-label="Search words"
          className="field w-full"
        />
      </form>
      <ul className="flex flex-col divide-y divide-current/10">
        {words.map((word) => (
          <li key={word.id}>
            <Link
              href={`/words/${encodeURIComponent(word.id)}`}
              className="flex items-baseline justify-between gap-3 py-2"
            >
              <span>
                <span className={`font-medium ${articleColor(word.de)}`}>{word.de}</span>{" "}
                <span className="opacity-70">{word.en}</span>
              </span>
              <span className="shrink-0 text-xs opacity-50">
                {word.cefr} · {word.due ? word.due.toLocaleDateString("de-DE") : "new"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
