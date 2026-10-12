import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * The signed-in person's id. Pages and server actions call this themselves: the proxy only
 * checks that a session cookie exists, and server actions are reachable as plain POSTs.
 */
export async function requireUser(): Promise<string> {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) redirect("/login");
  return current.user.id;
}
