import { notFound } from "next/navigation";
import { CHECK_SIZE, PASS, UNITS, unitById } from "@/lib/course";
import { Lesson } from "./Lesson";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const unit = unitById((await params).id);
  if (!unit) notFound();
  const next = UNITS[UNITS.indexOf(unit) + 1]?.id ?? null;
  return <Lesson unit={unit} checkSize={CHECK_SIZE} pass={PASS} next={next} />;
}
