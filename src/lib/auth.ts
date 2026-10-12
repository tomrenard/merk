import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { account, cards, session, user, verification } from "@/db/schema";
import { ensureCards } from "@/lib/review";

/** Comma-separated env list, compared lowercased. */
const emails = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

/**
 * Email + password accounts. Only invited emails (ALLOWED_EMAILS) can sign up: the URL is
 * public. Progress from before accounts is claimed by hand (scripts/claim.ts), never on sign-up:
 * anyone who knew the owner's email could otherwise sign up first and take it.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db(), {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  session: { expiresIn: 60 * 60 * 24 * 365, updateAge: 60 * 60 * 24 },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          const email = newUser.email.toLowerCase();
          if (!emails(process.env.ALLOWED_EMAILS).includes(email)) {
            throw new APIError("FORBIDDEN", { message: "This email isn't invited." });
          }
        },
        after: async (newUser) => {
          await ensureCards(newUser.id);
        },
      },
    },
  },
  // Lets server actions set the session cookie.
  plugins: [nextCookies()],
});
