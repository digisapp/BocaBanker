CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"client_id" uuid,
	"direction" text NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text,
	"body_text" text,
	"template" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"resend_id" text,
	"thread_id" uuid,
	"in_reply_to_id" uuid,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emails_user_id_idx" ON "emails" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "emails_client_id_idx" ON "emails" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "emails_direction_idx" ON "emails" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "emails_status_idx" ON "emails" USING btree ("status");--> statement-breakpoint
CREATE INDEX "emails_thread_id_idx" ON "emails" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "emails_from_email_idx" ON "emails" USING btree ("from_email");--> statement-breakpoint
CREATE INDEX "emails_is_read_idx" ON "emails" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "emails_created_at_idx" ON "emails" USING btree ("created_at");