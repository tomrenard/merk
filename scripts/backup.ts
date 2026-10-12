/** Saves every table to backups/<time>.json (git-ignored). Run before each migrate or import. */
import { mkdirSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { connect } from "../src/db/client.ts";

const db = connect();
// select *, not the schema: the backup runs before a migration, when the two can differ.
// Every table with data worth keeping, as far as it exists yet (settings became user_settings).
const TABLES = [
  "notes",
  "cards",
  "review_logs",
  "activity_logs",
  "settings",
  "user_settings",
  "user",
  "account",
];
const existing = await db.execute(
  sql`select table_name from information_schema.tables where table_schema = 'public' and table_name in ${TABLES}`,
);
const dump: Record<string, unknown[]> = {};
for (const { table_name } of existing) {
  dump[String(table_name)] = [
    ...(await db.execute(sql`select * from ${sql.identifier(String(table_name))}`)),
  ];
}
const dir = new URL("../backups/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const file = `${dir}${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(dump));
console.log(`${file}: ${dump.cards?.length ?? 0} cards, ${dump.review_logs?.length ?? 0} reviews`);
process.exit(0);
