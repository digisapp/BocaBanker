CREATE TABLE "platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb DEFAULT 'true'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "emails" ALTER COLUMN "subject" SET DEFAULT '(no subject)';--> statement-breakpoint
ALTER TABLE "emails" ALTER COLUMN "status" SET DEFAULT 'received';--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "to_name" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "reply_to" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "cc" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "bcc" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "sent_by" uuid;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "read_at" timestamp;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "replied_at" timestamp;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "ai_draft_html" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "ai_draft_text" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "ai_category" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "ai_confidence" real;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "ai_processed_at" timestamp;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emails_to_email_idx" ON "emails" USING btree ("to_email");--> statement-breakpoint
CREATE INDEX "emails_resend_id_idx" ON "emails" USING btree ("resend_id");