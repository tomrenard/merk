import { notFound } from "next/navigation";
import { CHECK_SIZE, PASS, partAfter, unitById } from "@/lib/course";
import { courseOfId } from "@/lib/courses";
import { getT } from "@/lib/locale";
import { topicWords } from "@/lib/review";
import { requireUser } from "@/lib/session";
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
  const words = unit.words?.length
    ? await topicWords(await requireUser(), unit.words, courseOfId(unit.id))
    : [];

  return (
    <Lesson
      unit={unit}
      words={words}
      checkSize={CHECK_SIZE}
      pass={PASS}
      next={partAfter(unit.id, "unit", await getT())}
      testOut={(await searchParams).test === "1"}
    />
  );
}
