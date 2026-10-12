import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";

const digest = (value: string) => createHash("sha256").update(value).digest();

async function login(form: FormData) {
  "use server";
  const expected = process.env.APP_PASSWORD;
  const given = String(form.get("password") ?? "");
  if (!expected || !timingSafeEqual(digest(given), digest(expected))) {
    // Slows guessing; there is one user, so no per-IP bookkeeping.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    redirect("/login?error=1");
  }
  (await cookies()).set(SESSION_COOKIE, await signSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  redirect("/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <form action={login} className="mx-auto mt-24 flex max-w-xs flex-col gap-3">
      <h1 className="text-center text-3xl font-semibold">merk</h1>
      <input
        name="password"
        type="password"
        autoComplete="current-password"
        aria-label="Password"
        placeholder="Password"
        required
        className="field"
      />
      {error && <p className="text-sm text-red-600">Wrong password.</p>}
      <button type="submit" className="btn btn-primary">
        Log in
      </button>
    </form>
  );
}
