import { notFound } from "next/navigation";
import { partAfter, unitById } from "@/lib/course";
import { Listen } from "./Listen";

export default async function ListenPage({ params }: { params: Promise<{ id: string }> }) {
  const unit = unitById((await params).id);
  if (!unit) notFound();
  return <Listen unit={unit} after={partAfter(unit.id, "listen")} />;
}
