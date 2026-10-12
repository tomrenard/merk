import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";

const digest = (value: string) => createHash("sha256").update(value).digest();

async function login(form: FormData) {
  "use server";
  const expected = process.env.APP_PASSWORD;
  const given = String(form.get("password") ?? "");
  // Fails closed: the URL is public, so a short password would be guessable.
  if (!expected || expected.length < 16 || !timingSafeEqual(digest(given), digest(expected))) {
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
    <form action={login} className="card mx-auto mt-24 flex max-w-xs flex-col gap-3">
      <h1 className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 bg-clip-text text-center text-5xl font-extrabold text-transparent">
        merk
      </h1>
      <p className="muted mb-2 text-center text-sm font-semibold">
        Deutsch, ein Kärtchen nach dem anderen.
      </p>
      <input
        name="password"
        type="password"
        autoComplete="current-password"
        aria-label="Password"
        placeholder="Password"
        required
        className="field"
      />
      {error && <p className="text-sm font-semibold text-rose-600">Wrong password.</p>}
      <button type="submit" className="btn btn-primary">
        Log in
      </button>
    </form>
  );
}
