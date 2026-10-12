/** Saves every table to backups/<time>.json (git-ignored). Run before each migrate or import. */
import { mkdirSync, writeFileSync } from "node:fs";
import { connect } from "../src/db/client.ts";
import { cards, notes, reviewLogs, settings } from "../src/db/schema.ts";

const db = connect();
const dump = {
  notes: await db.select().from(notes),
  cards: await db.select().from(cards),
  reviewLogs: await db.select().from(reviewLogs),
  settings: await db.select().from(settings),
};
const dir = new URL("../backups/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const file = `${dir}${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(dump));
console.log(`${file}: ${dump.cards.length} cards, ${dump.reviewLogs.length} reviews`);
process.exit(0);
