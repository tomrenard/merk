import Link from "next/link";
import {
  COURSE,
  type CourseExam,
  courseProgress,
  currentPart,
  examPassed,
  examScore,
  lastUnitId,
  nextStep,
  PARTS,
  type Progress,
  partIcon,
  partProgress,
  UNITS,
  unitDone,
} from "@/lib/course";
import { requireUser } from "@/lib/session";
import { Push } from "../Nav";
import { TabBar } from "../TabBar";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "path", label: "Path", icon: "🧭" },
  ...PARTS.map((p) => ({
    key: p.path,
    label: p.kind === "unit" ? "Lessons" : p.label,
    icon: p.icon,
  })),
];

const LEVEL_NAME: Record<string, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper intermediate",
};

function ExamCard({
  exam,
  progress,
  isNext,
}: {
  exam: CourseExam;
  progress: Progress;
  isNext: boolean;
}) {
  const score = examScore(progress, exam);
  const passed = examPassed(progress, exam);
  return (
    <Push
      href={`/exam/${exam.id}`}
      className={`card flex items-center gap-3 ${isNext ? "border-[var(--brand)]" : ""} ${exam.type === "level" ? "bg-[var(--brand-soft)]" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`icon ${passed ? "bg-green-100 dark:bg-green-950" : "bg-amber-100 dark:bg-amber-950"}`}
      >
        {passed ? "✓" : exam.type === "level" ? "🏆" : "📝"}
      </span>
      <span className="flex-1">
        <span className="block font-extrabold">
          {exam.type === "level" ? `${exam.level} exam (like the Goethe exam)` : `${exam.id} exam`}
        </span>
        <span className="muted text-sm font-semibold">
          {passed
            ? `Passed · best ${score}%`
            : score !== undefined
              ? `Best ${score}% · ${exam.pass}% to pass`
              : `${exam.pass}% to pass`}
        </span>
      </span>
      <span aria-hidden="true" className="muted text-2xl font-black">
        ›
      </span>
    </Push>
  );
}

/** The whole course by part (A1.1 …), each closed by an exam; or one skill across all lessons. */
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
  const current = currentPart(progress);
  return (
    <main className="screen with-tabs">
      <header>
        <h1 className="text-3xl font-black">Course</h1>
        <p className="muted font-semibold">
          A1 → B2 for everyday life. Follow the path or pick anything.
        </p>
        <Push href="/placement" className="text-sm font-bold text-[var(--brand)]">
          Not sure where to start? Find your level ›
        </Push>
      </header>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Course views">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "path" ? "/learn" : `/learn?view=${v.key}`}
            className={`chip shrink-0 border ${v.key === view ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "line muted"}`}
          >
            <span aria-hidden="true">{v.icon}</span> {v.label}
          </Link>
        ))}
      </nav>
      {COURSE.map((section, i) => {
        const finished = part
          ? section.units.filter((unit) => progress.get(unit.id)?.has(part.kind)).length
          : partProgress(progress, section).done;
        const passed = partProgress(progress, section).passed;
        const newLevel = COURSE[i - 1]?.level !== section.level;
        return (
          <section key={section.id} id={section.id} className="flex flex-col gap-3">
            {newLevel && (
              <h2 className="mt-2 text-2xl font-black">
                {section.level}{" "}
                <span className="muted text-base font-bold">{LEVEL_NAME[section.level]}</span>
              </h2>
            )}
            {/* Only the part you are in is open; the others fold to one line. */}
            <details
              open={
                section.id === current?.id ||
                (next?.type === "lesson" && section.units.includes(next.unit))
              }
              className="group"
            >
              <summary className="card flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                <span className="flex-1">
                  <span className="block font-extrabold">
                    {section.id}
                    {passed && !part && " ✓"}
                  </span>
                  <span className="mt-1 block h-2 overflow-hidden rounded-full bg-[var(--line)]">
                    <span
                      className="block h-full rounded-full bg-[var(--brand)]"
                      style={{ width: `${Math.round((100 * finished) / section.units.length)}%` }}
                    />
                  </span>
                </span>
                <span className="muted text-sm font-bold">
                  {finished}/{section.units.length}
                </span>
                <span
                  aria-hidden="true"
                  className="muted text-xl font-black transition-transform group-open:rotate-90"
                >
                  ›
                </span>
              </summary>
              <ol className="mt-3 flex flex-col gap-3">
                {section.units.map((unit) => {
                  const done = progress.get(unit.id) ?? new Map();
                  const isDone = part ? done.has(part.kind) : unitDone(progress, unit);
                  const isNext =
                    next?.type === "lesson" && next.unit === unit && (!part || next.part === part);
                  const href = part ? `/learn/${unit.id}/${part.path}` : `/learn/${unit.id}`;
                  return (
                    <li key={unit.id}>
                      <Push
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
                          {isDone ? "✓" : partIcon(unit, part ?? PARTS[0])}
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
                      </Push>
                    </li>
                  );
                })}
                {!part &&
                  section.exams.map((exam) => (
                    <li key={exam.id}>
                      <ExamCard
                        exam={exam}
                        progress={progress}
                        isNext={next?.type === "exam" && next.exam.id === exam.id}
                      />
                    </li>
                  ))}
              </ol>
            </details>
          </section>
        );
      })}
      {UNITS.length === 0 && <p className="card text-center font-bold">No lessons yet.</p>}
      <TabBar active="/learn" />
    </main>
  );
}
