import { migrate } from "drizzle-orm/postgres-js/migrator";
import { connect } from "../src/db/client.ts";

await migrate(connect(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL), {
  migrationsFolder: new URL("../drizzle", import.meta.url).pathname,
});
console.log("migrated");
process.exit(0);
