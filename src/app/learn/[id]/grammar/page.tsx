import { notFound } from "next/navigation";
import { CHECK_SIZE, PASS, partAfter, unitById } from "@/lib/course";
import { Lesson } from "./Lesson";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ test?: string }>;
}) {
  const unit = unitById((await params).id);
  if (!unit) notFound();
  return (
    <Lesson
      unit={unit}
      checkSize={CHECK_SIZE}
      pass={PASS}
      next={partAfter(unit.id, "unit")}
      testOut={(await searchParams).test === "1"}
    />
  );
}
