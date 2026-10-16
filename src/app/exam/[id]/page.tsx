import { notFound } from "next/navigation";
import { courseProgress, examById, examScore } from "@/lib/course";
import { getQuiet } from "@/lib/locale";
import { requireUser } from "@/lib/session";
import { LEVEL_EXAMS, partExamPacket } from "../data";
import { LevelExam } from "../LevelExam";
import { PartExam } from "../PartExam";

export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUser();
  const exam = examById((await params).id);
  if (!exam) notFound();
  const best = examScore(await courseProgress(userId, exam.course), exam);

  if (exam.type === "level") {
    const content = LEVEL_EXAMS[exam.level];
    if (!content) notFound();
    return <LevelExam exam={exam} content={content} best={best} />;
  }
  const packet = partExamPacket(exam.id, await getQuiet());
  if (!packet) notFound();
  return <PartExam exam={exam} packet={packet} best={best} />;
}
