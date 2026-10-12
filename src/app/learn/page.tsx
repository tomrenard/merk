import Link from "next/link";
import { nextUnit, PASS, UNITS, unitScores } from "@/lib/course";
import { TabBar } from "../TabBar";

export const dynamic = "force-dynamic";

export default async function CoursePage() {
  const scores = await unitScores();
  const next = nextUnit(scores);
  return (
    <main className="screen with-tabs">
      <header>
        <h1 className="text-3xl font-black">Course</h1>
        <p className="muted font-semibold">Grammar for everyday life, one short unit a day.</p>
      </header>
      <ol className="flex flex-col gap-3">
        {UNITS.map((unit, i) => {
          const best = scores.get(unit.id);
          const state =
            best === undefined
              ? unit === next
                ? "next"
                : "todo"
              : best >= PASS
                ? "done"
                : "retry";
          return (
            <li key={unit.id}>
              <Link
                href={`/learn/${unit.id}`}
                className={`card flex items-center gap-3 ${state === "next" ? "border-[var(--brand)]" : ""}`}
              >
                <span
                  className={`icon text-xl font-black ${
                    state === "done"
                      ? "bg-green-100 dark:bg-green-950"
                      : state === "next"
                        ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                        : "bg-[var(--field)]"
                  }`}
                >
                  {state === "done" ? "✓" : state === "retry" ? "↻" : i + 1}
                </span>
                <span className="flex-1">
                  <span className="block font-extrabold">{unit.title}</span>
                  <span className="muted text-sm font-semibold">
                    {unit.situation}
                    {best !== undefined && ` · best ${best}/6`}
                  </span>
                </span>
                <span className="muted text-2xl font-black">›</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <TabBar active="/learn" />
    </main>
  );
}
