ALTER TABLE "activity_logs" ADD COLUMN "course" text DEFAULT 'de' NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "course" text DEFAULT 'de' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "course" text DEFAULT 'de' NOT NULL;