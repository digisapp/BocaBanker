DROP INDEX "emails_resend_id_idx";--> statement-breakpoint
-- defensive cleanup so the FK and unique indexes below apply on existing data
UPDATE "leads" SET "converted_client_id" = NULL WHERE "converted_client_id" IS NOT NULL AND "converted_client_id" NOT IN (SELECT "id" FROM "clients");--> statement-breakpoint
DELETE FROM "emails" a USING "emails" b WHERE a."resend_id" IS NOT NULL AND a."resend_id" = b."resend_id" AND a."created_at" > b."created_at";--> statement-breakpoint
DELETE FROM "mortgage_rates" a USING "mortgage_rates" b WHERE a."week_of" = b."week_of" AND a."fetched_at" > b."fetched_at";--> statement-breakpoint
ALTER TABLE "study_assets" ALTER COLUMN "recovery_period" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_client_id_clients_id_fk" FOREIGN KEY ("converted_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "emails_resend_id_unique" ON "emails" USING btree ("resend_id") WHERE resend_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "leads_user_id_status_idx" ON "leads" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "leads_user_id_created_at_idx" ON "leads" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "leads_member_name_idx" ON "leads" USING btree ("member_name");--> statement-breakpoint
CREATE UNIQUE INDEX "mortgage_rates_week_of_unique" ON "mortgage_rates" USING btree ("week_of");