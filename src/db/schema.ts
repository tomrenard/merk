import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { CardInput } from "ts-fsrs";

/** One word or phrase. Its id comes from the source deck, so re-imports update in place. */
export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  cefr: text("cefr").notNull(),
  ord: integer("ord").notNull(),
  de: text("de").notNull(),
  exampleDe: text("example_de"),
  en: text("en").notNull(),
  exampleEn: text("example_en"),
  fr: text("fr"),
  exampleFr: text("example_fr"),
  hint: text("hint"),
  explainEn: text("explain_en"),
  explainFr: text("explain_fr"),
  /** Set when you fix a note by hand, so re-imports leave it alone. */
  editedAt: timestamp("edited_at", { withTimezone: true }),
});

/** One direction of a note: `de_en` shows German, `en_de` asks for it. */
export const cards = pgTable(
  "cards",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    direction: text("direction", { enum: ["de_en", "en_de"] }).notNull(),
    fsrs: jsonb("fsrs").$type<CardInput>(),
    due: timestamp("due", { withTimezone: true }),
    introducedAt: timestamp("introduced_at", { withTimezone: true }),
  },
  (t) => [index("cards_due_idx").on(t.due), index("cards_note_idx").on(t.noteId)],
);

export const reviewLogs = pgTable("review_logs", {
  id: serial("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  rating: smallint("rating").notNull(),
  state: smallint("state").notNull(),
  durationMs: integer("duration_ms"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A single row: there is one user. */
export const settings = pgTable(
  "settings",
  {
    id: smallint("id").primaryKey().default(1),
    explainLang: text("explain_lang", { enum: ["en", "fr", "both"] })
      .notNull()
      .default("both"),
    newPerDay: smallint("new_per_day").notNull().default(15),
  },
  (t) => [check("settings_single_row", sql`${t.id} = 1`)],
);
