CREATE INDEX IF NOT EXISTS "clients_user_id_created_at_idx" ON "clients" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_user_id_created_at_idx" ON "properties" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cost_seg_studies_user_id_created_at_idx" ON "cost_seg_studies" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_user_id_created_at_idx" ON "documents" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_logs_user_id_sent_at_idx" ON "email_logs" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loans_user_id_status_idx" ON "loans" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loans_user_id_created_at_idx" ON "loans" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_status_review_date_idx" ON "reviews" USING btree ("status","review_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_created_at_idx" ON "reviews" USING btree ("created_at");