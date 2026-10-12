CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"ref" text NOT NULL,
	"score" integer,
	"total" integer,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "activity_logs_kind_idx" ON "activity_logs" USING btree ("kind","ref");