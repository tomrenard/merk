import { withExercise } from "@/lib/course";
import { nextCard } from "@/lib/review";
import { requireUser } from "@/lib/session";
import { Review } from "./Review";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  return <Review first={withExercise(await nextCard(await requireUser()))} />;
}
