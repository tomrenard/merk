import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import { account, session, user, verification } from "@/db/schema";
import { claimUnowned, ensureCards } from "@/lib/review";

/** Comma-separated env list, compared lowercased. */
const emails = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

/**
 * Email + password accounts. Only invited emails (ALLOWED_EMAILS) can sign up: the URL is
 * public. OWNER_EMAIL's account takes over the progress made before accounts existed.
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
          if (!emails(process.env.ALLOWED_EMAILS).includes(newUser.email.toLowerCase())) {
            throw new APIError("FORBIDDEN", { message: "This email isn't invited." });
          }
        },
        after: async (newUser) => {
          if (emails(process.env.OWNER_EMAIL).includes(newUser.email.toLowerCase())) {
            await claimUnowned(newUser.id);
          }
          await ensureCards(newUser.id);
        },
      },
    },
  },
  // Lets server actions set the session cookie.
  plugins: [nextCookies()],
});
