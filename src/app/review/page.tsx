import { nextCard } from "@/lib/review";
import { Review } from "./Review";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  return <Review first={await nextCard()} />;
}
