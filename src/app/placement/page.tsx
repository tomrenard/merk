import { redirect } from "next/navigation";
import { COURSES } from "@/lib/courses";
import { getCourse, getQuiet } from "@/lib/locale";
import { requireUser } from "@/lib/session";
import { placementPacket } from "./data";
import { Placement } from "./Placement";

export const dynamic = "force-dynamic";

export default async function PlacementPage() {
  await requireUser();
  if (!COURSES[await getCourse()].placement) redirect("/learn");
  return <Placement packet={await placementPacket(await getQuiet())} />;
}
