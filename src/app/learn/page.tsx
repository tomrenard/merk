import Link from "next/link";
import {
  courseProgress,
  lastUnitId,
  nextStep,
  PARTS,
  PASS,
  type Progress,
  UNITS,
} from "@/lib/course";
import { requireUser } from "@/lib/session";
import type { Unit } from "@/lib/units";
import { TabBar } from "../TabBar";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "path", label: "Path", icon: "🧭" },
  ...PARTS.map((p) => ({ key: p.path, label: p.label, icon: p.icon })),
];
const LEVELS = ["A1", "A2", "B1"] as const;

const unitDone = (progress: Progress, unit: Unit) => {
  const done = progress.get(unit.id);
  return done?.size === PARTS.length && (done.get("unit") ?? 0) >= PASS;
};

/** The whole course, free to pick from: the guided path, or one skill across all units. */
export default async function CoursePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const userId = await requireUser();
  const [progress, last] = await Promise.all([courseProgress(userId), lastUnitId(userId)]);
  const asked = (await searchParams).view;
  const view = VIEWS.find((v) => v.key === asked)?.key ?? "path";
  const part = PARTS.find((p) => p.path === view);
  const next = nextStep(progress, last);
  return (
    <main className="screen with-tabs">
      <header>
        <h1 className="text-3xl font-black">Course</h1>
        <p className="muted font-semibold">
          A1 → B1 for everyday life. Follow the path or pick anything.
        </p>
        <Link href="/placement" className="text-sm font-bold text-[var(--brand)]">
          Not sure where to start? Find your level ›
        </Link>
      </header>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Course views">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "path" ? "/learn" : `/learn?view=${v.key}`}
            className={`chip shrink-0 border-2 ${v.key === view ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "line muted"}`}
          >
            <span aria-hidden="true">{v.icon}</span> {v.label}
          </Link>
        ))}
      </nav>
      {LEVELS.map((level) => {
        const units = UNITS.filter((unit) => unit.cefr === level);
        if (!units.length) return null;
        const finished = units.filter((unit) =>
          part ? progress.get(unit.id)?.has(part.kind) : unitDone(progress, unit),
        ).length;
        return (
          <section key={level} className="flex flex-col gap-3">
            <h2 className="muted flex justify-between text-sm font-extrabold tracking-wide uppercase">
              <span>{level}</span>
              <span>
                {finished}/{units.length} done
              </span>
            </h2>
            <ol className="flex flex-col gap-3">
              {units.map((unit) => {
                const done = progress.get(unit.id) ?? new Map();
                const isDone = part ? done.has(part.kind) : unitDone(progress, unit);
                const isNext = next?.unit === unit && (!part || next.part === part);
                const href = part ? `/learn/${unit.id}/${part.path}` : `/learn/${unit.id}`;
                return (
                  <li key={unit.id}>
                    <Link
                      href={href}
                      className={`card flex items-center gap-3 ${isNext ? "border-[var(--brand)]" : ""}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`icon text-xl font-black ${
                          isDone
                            ? "bg-green-100 dark:bg-green-950"
                            : isNext
                              ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                              : "bg-[var(--field)]"
                        }`}
                      >
                        {isDone ? "✓" : part ? part.icon : UNITS.indexOf(unit) + 1}
                      </span>
                      <span className="flex-1">
                        <span className="block font-extrabold">{unit.title}</span>
                        <span className="muted text-sm font-semibold">
                          {unit.situation}
                          {!part &&
                            done.size > 0 &&
                            !isDone &&
                            ` · ${done.size}/${PARTS.length} parts`}
                        </span>
                      </span>
                      <span aria-hidden="true" className="muted text-2xl font-black">
                        ›
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <TabBar active="/learn" />
    </main>
  );
}
