import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export function connect(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set");
  // Neon's pooled endpoint is a transaction pooler: no prepared statements.
  return drizzle(postgres(url, { prepare: false, max: 1 }), { schema });
}

const shared = globalThis as { merkDb?: ReturnType<typeof connect> };

export function db() {
  shared.merkDb ??= connect();
  return shared.merkDb;
}
