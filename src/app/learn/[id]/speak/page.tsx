import { notFound } from "next/navigation";
import { nounsOf, partAfter, unitById } from "@/lib/course";
import { getT } from "@/lib/locale";
import { Speak } from "./Speak";

export default async function SpeakPage({ params }: { params: Promise<{ id: string }> }) {
  const unit = unitById((await params).id);
  if (!unit) notFound();
  return (
    <Speak unit={unit} nouns={nounsOf(unit)} after={partAfter(unit.id, "speak", await getT())} />
  );
}
