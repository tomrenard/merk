/** Saves every table to backups/<time>.json (git-ignored). Run before each migrate or import. */
import { mkdirSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { connect } from "../src/db/client.ts";

const db = connect();
// select *, not the schema: the backup runs before a migration, when the two can differ.
const table = (name: string) => db.execute(sql`select * from ${sql.identifier(name)}`);
const dump = {
  notes: await table("notes"),
  cards: await table("cards"),
  reviewLogs: await table("review_logs"),
  settings: await table("settings"),
};
const dir = new URL("../backups/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const file = `${dir}${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(dump));
console.log(`${file}: ${dump.cards.length} cards, ${dump.reviewLogs.length} reviews`);
process.exit(0);
