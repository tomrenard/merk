/**
 * Gives the progress made before accounts (cards, reviews, lessons, own words with no owner) to
 * one account, then fills in its missing cards. Run once, by hand, after checking that account
 * is really the owner's: pnpm claim you@example.com
 */
import { eq } from "drizzle-orm";
import { connect } from "../src/db/client.ts";
import { user } from "../src/db/schema.ts";
import { claimUnowned, ensureCards } from "../src/lib/review.ts";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error("Usage: pnpm claim <email>");
const [owner] = await connect().select().from(user).where(eq(user.email, email));
if (!owner) throw new Error(`No account for ${email}`);
await claimUnowned(owner.id);
await ensureCards(owner.id);
console.log(`claimed for ${owner.name} <${owner.email}> (${owner.id})`);
process.exit(0);
