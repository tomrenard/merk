import { notFound } from "next/navigation";
import { partAfter, unitById } from "@/lib/course";
import { Write } from "./Write";

export default async function WritePage({ params }: { params: Promise<{ id: string }> }) {
  const unit = unitById((await params).id);
  if (!unit) notFound();
  return <Write unit={unit} after={partAfter(unit.id, "write")} />;
}
