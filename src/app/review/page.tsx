import { getSettings, nextCard } from "@/lib/review";
import { Review } from "./Review";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const [first, { explainLang }] = await Promise.all([nextCard(), getSettings()]);
  return <Review first={first} explainLang={explainLang} />;
}
