import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "merk_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 chars");
  return new TextEncoder().encode(value);
}

export function signSession(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

/** Server actions are reachable as plain POSTs, so each checks the session itself. */
export async function requireSession(): Promise<void> {
  if (!(await isValidSession((await cookies()).get(SESSION_COOKIE)?.value))) {
    throw new Error("Unauthorized");
  }
}
