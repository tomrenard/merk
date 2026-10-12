import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

async function login(form: FormData) {
  "use server";
  let ok = false;
  try {
    await auth.api.signInEmail({
      body: {
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      },
      headers: await headers(),
    });
    ok = true;
  } catch {
    // Wrong email or password, or too many tries: the same message for all.
  }
  redirect(ok ? "/" : "/login?error=1");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <form action={login} className="screen max-w-xs justify-center gap-3">
      <span className="icon mx-auto size-20 bg-[var(--brand-soft)] text-5xl">🇩🇪</span>
      <h1 className="text-center text-4xl font-black text-[var(--brand)]">merk</h1>
      <p className="muted mb-2 text-center text-sm font-semibold">
        Deutsch, ein Kärtchen nach dem anderen.
      </p>
      <input
        name="email"
        type="email"
        autoComplete="email"
        aria-label="Email"
        placeholder="Email"
        required
        className="field"
      />
      <input
        name="password"
        type="password"
        autoComplete="current-password"
        aria-label="Password"
        placeholder="Password"
        required
        className="field"
      />
      {error && (
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          Wrong email or password.
        </p>
      )}
      <button type="submit" className="btn btn-primary">
        Log in
      </button>
      <Link href="/signup" className="muted text-center text-sm font-bold">
        Invited? Create your account
      </Link>
    </form>
  );
}
