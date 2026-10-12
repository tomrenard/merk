import { requireUser } from "@/lib/session";
import { placementPacket } from "./data";
import { Placement } from "./Placement";

export const dynamic = "force-dynamic";

export default async function PlacementPage() {
  await requireUser();
  return <Placement packet={await placementPacket()} />;
}
