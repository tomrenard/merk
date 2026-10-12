import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { cards, notes } from "@/db/schema";
import { KNOWN } from "@/lib/review";
import { Headword } from "../review/German";
import { TabBar } from "../TabBar";

export const dynamic = "force-dynamic";

export default async function WordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; known?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const known = params.known === "1";
  // Matched literally: % and _ would otherwise be ILIKE wildcards.
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const words = await db()
    .select({ id: notes.id, de: notes.de, en: notes.en, cefr: notes.cefr, due: cards.due })
    .from(notes)
    .leftJoin(cards, eq(cards.id, sql`${notes.id} || ':de_en'`))
    .where(
      and(
        q ? or(ilike(notes.de, pattern), ilike(notes.en, pattern)) : undefined,
        known ? KNOWN : undefined,
      ),
    )
    .orderBy(asc(notes.ord));
  return (
    <main className="screen with-tabs">
      <header className="topbar">
        <h1 className="text-3xl font-black">Words</h1>
        <span className="muted font-bold">
          {words.length} {q ? "found" : known ? "known" : "words"}
        </span>
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
      <nav className="flex gap-2">
        {[
          { href: "/words", label: "All", on: !known },
          { href: "/words?known=1", label: "⭐ Known", on: known },
        ].map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`chip border-2 ${f.on ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "line muted"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <ul className="card flex flex-col divide-y-2 divide-[var(--line)] py-0">
        {words.map((word) => (
          <li key={word.id}>
            <Link
              href={`/words/${encodeURIComponent(word.id)}`}
              className="flex items-baseline justify-between gap-3 py-3"
            >
              <span>
                <Headword de={word.de} className="font-extrabold" />{" "}
                <span className="muted">{word.en}</span>
              </span>
              <span className="muted shrink-0 text-xs font-bold">
                {word.cefr} · {word.due ? word.due.toLocaleDateString("de-DE") : "new"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <TabBar active="/words" />
    </main>
  );
}
