ALTER TABLE "settings" ALTER COLUMN "new_per_day" SET DEFAULT 7;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "governs" text;--> statement-breakpoint
-- Pace is now counted in words (German→English cards); 15 cards was about 7 words.
UPDATE "settings" SET "new_per_day" = 7;
