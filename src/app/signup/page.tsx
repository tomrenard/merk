import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ERRORS: Record<string, string> = {
  invite: "This email isn't invited. Ask Tom to add it.",
  taken: "There is already an account with this email. Log in instead.",
  password: "Check the email, and use a password of 10 or more characters.",
  other: "Something went wrong. Try again.",
};

async function signup(form: FormData) {
  "use server";
  let error: keyof typeof ERRORS | null = null;
  try {
    await auth.api.signUpEmail({
      body: {
        name: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      },
      headers: await headers(),
    });
  } catch (e) {
    const status = e instanceof APIError ? String(e.status) : "";
    const codes: Record<string, keyof typeof ERRORS> = {
      FORBIDDEN: "invite",
      UNPROCESSABLE_ENTITY: "taken",
      BAD_REQUEST: "password",
    };
    error = codes[status] ?? "other";
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  redirect(error ? `/signup?error=${error}` : "/");
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <form action={signup} className="screen max-w-xs justify-center gap-3">
      <span className="icon mx-auto size-20 bg-[var(--brand-soft)] text-5xl">👋</span>
      <h1 className="text-center text-3xl font-black">Create your account</h1>
      <input
        name="name"
        autoComplete="given-name"
        aria-label="Your first name"
        placeholder="First name"
        required
        maxLength={60}
        className="field"
      />
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
        autoComplete="new-password"
        aria-label="Password"
        placeholder="Password (10+ characters)"
        minLength={10}
        required
        className="field"
      />
      {error && (
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          {ERRORS[error] ?? ERRORS.other}
        </p>
      )}
      <button type="submit" className="btn btn-primary">
        Create account
      </button>
      <Link href="/login" className="muted text-center text-sm font-bold">
        Already have one? Log in
      </Link>
    </form>
  );
}
