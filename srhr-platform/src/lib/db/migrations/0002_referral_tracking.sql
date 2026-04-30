ALTER TABLE "submissions" ADD COLUMN "referred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "referred_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "referral_note" text;
