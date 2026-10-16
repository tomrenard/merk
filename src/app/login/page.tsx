import { and, count, eq, gte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { activityLogs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { translator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { LanguageSwitch } from "../language";

/** After this many wrong passwords for one email in 15 minutes, logging in waits. */
const MAX_FAILS = 5;

async function login(form: FormData) {
  "use server";
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
  // Better Auth's own rate limit only runs on its HTTP routes (not on this direct call) and per
  // server instance: count failures in the database instead.
  const [recent] = await db()
    .select({ fails: count() })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.kind, "login-fail"),
        eq(activityLogs.ref, email),
        gte(activityLogs.at, sql`now() - interval '15 minutes'`),
      ),
    );
  if ((recent?.fails ?? 0) >= MAX_FAILS) redirect("/login?error=wait");
  let ok = false;
  try {
    await auth.api.signInEmail({
      body: { email, password: String(form.get("password") ?? "") },
      headers: await headers(),
    });
    ok = true;
  } catch {
    await db().insert(activityLogs).values({ kind: "login-fail", ref: email });
    // Wrong email or password: the same message for both, and a pause that slows guessing.
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  redirect(ok ? "/" : "/login?error=1");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const locale = await getLocale();
  const t = translator(locale);
  return (
    <main className="screen max-w-xs justify-center gap-3">
      <form action={login} className="flex flex-col gap-3">
        <span className="icon mx-auto size-20 bg-[var(--brand-soft)] text-5xl">🇩🇪</span>
        <h1 className="text-center text-4xl font-black text-[var(--brand)]">merk</h1>
        <p className="muted mb-2 text-center text-sm font-semibold">
          {t("Learn a language, one card at a time.")}
        </p>
        <input
          name="email"
          type="email"
          autoComplete="email"
          aria-label={t("Email")}
          placeholder={t("Email")}
          required
          className="field"
        />
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          aria-label={t("Password")}
          placeholder={t("Password")}
          required
          className="field"
        />
        {error && (
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            {error === "wait"
              ? t("Too many tries. Wait 15 minutes, then try again.")
              : t("Wrong email or password.")}
          </p>
        )}
        <button type="submit" className="btn btn-primary">
          {t("Log in")}
        </button>
        <Link href="/signup" className="muted text-center text-sm font-bold">
          {t("Invited? Create your account")}
        </Link>
      </form>
      <LanguageSwitch current={locale} label={t("Language")} />
    </main>
  );
}
