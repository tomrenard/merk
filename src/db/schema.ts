import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { CardInput } from "ts-fsrs";

/* Better Auth's tables (email + password accounts). Field names are Better Auth's. */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One word or phrase. Its id comes from the source deck, so re-imports update in place. */
export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  /** Set only on words someone added themselves; list words, phrases and units are shared. */
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
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
  /** Case or preposition a verb takes, e.g. "auf + Akk." for warten. */
  governs: text("governs"),
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
    /** Whose card this is. Null only for cards made before accounts, until claimed. */
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    /** de_en shows German; en_de asks for it; unit reviews a grammar unit with one of its exercises. */
    direction: text("direction", { enum: ["de_en", "en_de", "unit"] }).notNull(),
    fsrs: jsonb("fsrs").$type<CardInput>(),
    due: timestamp("due", { withTimezone: true }),
    introducedAt: timestamp("introduced_at", { withTimezone: true }),
  },
  (t) => [
    index("cards_due_idx").on(t.userId, t.due),
    index("cards_note_idx").on(t.noteId),
    uniqueIndex("cards_user_note_direction").on(t.userId, t.noteId, t.direction),
  ],
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: serial("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    state: smallint("state").notNull(),
    durationMs: integer("duration_ms"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("review_logs_card_idx").on(t.cardId, t.reviewedAt),
    index("review_logs_user_idx").on(t.userId, t.reviewedAt),
  ],
);

/** Things you did outside flashcards: a grammar unit finished (kind "unit", ref = unit id). */
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    ref: text("ref").notNull(),
    score: integer("score"),
    total: integer("total"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_logs_kind_idx").on(t.userId, t.kind, t.ref)],
);

/** Per person; a missing row means the defaults. */
export const settings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /** New words (German→English cards) per day; their English→German cards follow a day later. */
  newPerDay: smallint("new_per_day").notNull().default(7),
});

/** AI results per person (feedback, transcripts), kept so the same input never costs twice. */
export const aiResults = pgTable(
  "ai_results",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    key: text("key").notNull(),
    result: jsonb("result").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ai_results_key_idx").on(t.userId, t.kind, t.key)],
);

/**
 * AI calls per person and day, counted before each call (one atomic statement), so parallel
 * requests and failed calls count against the daily limit too.
 */
export const aiUsage = pgTable(
  "ai_usage",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    kind: text("kind").notNull(),
    n: integer("n").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day, t.kind] })],
);
