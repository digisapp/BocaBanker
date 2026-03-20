CREATE TABLE "received_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"client_id" uuid,
	"from_email" text NOT NULL,
	"from_name" text,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text,
	"body_text" text,
	"resend_id" text,
	"in_reply_to_resend_id" text,
	"is_read" boolean DEFAULT false,
	"received_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "received_emails" ADD CONSTRAINT "received_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "received_emails" ADD CONSTRAINT "received_emails_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "received_emails_user_id_idx" ON "received_emails" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "received_emails_client_id_idx" ON "received_emails" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "received_emails_from_email_idx" ON "received_emails" USING btree ("from_email");--> statement-breakpoint
CREATE INDEX "received_emails_is_read_idx" ON "received_emails" USING btree ("is_read");