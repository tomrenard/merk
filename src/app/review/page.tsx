import { courseProgress, lastUnitId, lessonDoneToday, nextStep, reviewCard } from "@/lib/course";
import { getCourse, getQuiet, getT } from "@/lib/locale";
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
  const [t, course, quiet] = await Promise.all([getT(), getCourse(), getQuiet()]);
  const asked = (await searchParams).limit;
  const limit = [10, 30, 60].find((n) => String(n) === asked) ?? null;
  const [first, left, progress, last, lessonDone] = await Promise.all([
    nextCard(userId, course),
    counts(userId, course),
    courseProgress(userId, course),
    lastUnitId(userId, course),
    lessonDoneToday(userId, course),
  ]);
  const step = lessonDone ? null : nextStep(progress, last, t, course);

  return (
    <Review
      first={await reviewCard(first, quiet)}
      left={sessionLeft(left)}
      limit={limit}
      lesson={step && { href: step.href, label: step.label }}
    />
  );
}
