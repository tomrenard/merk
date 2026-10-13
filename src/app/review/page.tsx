import { courseProgress, lastUnitId, lessonDoneToday, nextStep, withExercise } from "@/lib/course";
import { counts, nextCard, sessionLeft } from "@/lib/review";
import { requireUser } from "@/lib/session";
import { Review } from "./Review";

export const dynamic = "force-dynamic";

/** `?limit=10|30|60`: a short session; whatever is left stays due for later. */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const userId = await requireUser();
  const asked = (await searchParams).limit;
  const limit = [10, 30, 60].find((n) => String(n) === asked) ?? null;
  const [first, left, progress, last, lessonDone] = await Promise.all([
    nextCard(userId),
    counts(userId),
    courseProgress(userId),
    lastUnitId(userId),
    lessonDoneToday(userId),
  ]);
  const step = lessonDone ? null : nextStep(progress, last);
  return (
    <Review
      first={withExercise(first)}
      left={sessionLeft(left)}
      limit={limit}
      lesson={step && { href: step.href, label: step.label }}
    />
  );
}
