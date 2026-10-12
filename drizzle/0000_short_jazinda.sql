CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"direction" text NOT NULL,
	"fsrs" jsonb,
	"due" timestamp with time zone,
	"introduced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"cefr" text NOT NULL,
	"ord" integer NOT NULL,
	"de" text NOT NULL,
	"example_de" text,
	"en" text NOT NULL,
	"example_en" text,
	"fr" text,
	"example_fr" text,
	"hint" text,
	"explain_en" text,
	"explain_fr" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"rating" smallint NOT NULL,
	"state" smallint NOT NULL,
	"duration_ms" integer,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"explain_lang" text DEFAULT 'both' NOT NULL,
	"new_per_day" smallint DEFAULT 15 NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_due_idx" ON "cards" USING btree ("due");--> statement-breakpoint
CREATE INDEX "cards_note_idx" ON "cards" USING btree ("note_id");