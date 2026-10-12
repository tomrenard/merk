import Link from "next/link";
import { notFound } from "next/navigation";
import { CHECK_SIZE, courseProgress, PARTS, PASS, unitById } from "@/lib/course";
import { requireUser } from "@/lib/session";
import { TabBar } from "../../TabBar";

export const dynamic = "force-dynamic";

/** A unit's four parts, one a day: grammar, listen & read, speak, write. */
export default async function UnitPage({ params }: { params: Promise<{ id: string }> }) {
  const unit = unitById((await params).id);
  if (!unit) notFound();
  const done = (await courseProgress(await requireUser())).get(unit.id) ?? new Map();
  const next = PARTS.find((part) => !done.has(part.kind));
  return (
    <main className="screen with-tabs">
      <header className="topbar">
        <Link href="/learn" className="muted text-lg font-black" aria-label="Back to the course">
          ‹ Course
        </Link>
        <span className="chip muted line border-2">{unit.cefr}</span>
      </header>
      <div>
        <p className="muted text-sm font-extrabold tracking-wide uppercase">{unit.situation}</p>
        <h1 className="text-3xl font-black">{unit.title}</h1>
        <p className="muted mt-1 font-semibold">{unit.canDo}</p>
      </div>
      <ol className="flex flex-col gap-3">
        {PARTS.map((part) => {
          const score = done.get(part.kind);
          const retry = part.kind === "unit" && score !== undefined && score < PASS;
          return (
            <li key={part.kind}>
              <Link
                href={`/learn/${unit.id}/${part.path}`}
                className={`card flex items-center gap-3 ${part === next ? "border-[var(--brand)]" : ""}`}
              >
                <span
                  className={`icon ${score !== undefined && !retry ? "bg-green-100 dark:bg-green-950" : "bg-[var(--field)]"}`}
                >
                  {score !== undefined && !retry ? "✓" : part.icon}
                </span>
                <span className="flex-1 font-extrabold">
                  {part.label}
                  {retry && (
                    <span className="muted block text-sm font-semibold">
                      Check again: {score}/{CHECK_SIZE}
                    </span>
                  )}
                </span>
                <span className="muted text-2xl font-black">›</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="muted text-center text-sm font-semibold">
        One part a day is plenty. Redo any part any time.
      </p>
      {(done.get("unit") ?? 0) < PASS && (
        <Link href={`/learn/${unit.id}/grammar?test=1`} className="btn">
          Already know this? Take the check
        </Link>
      )}
      <TabBar active="/learn" />
    </main>
  );
}
