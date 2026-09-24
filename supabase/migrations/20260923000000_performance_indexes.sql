-- Performance indexes (drizzle 0009/0010) for postgres-owned tables.
-- Indexes on app_user-owned tables (emails, reviews) are applied as app_user.
CREATE INDEX IF NOT EXISTS "clients_user_id_created_at_idx" ON "clients" USING btree ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "properties_user_id_created_at_idx" ON "properties" USING btree ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "cost_seg_studies_user_id_created_at_idx" ON "cost_seg_studies" USING btree ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "documents_user_id_created_at_idx" ON "documents" USING btree ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "email_logs_user_id_sent_at_idx" ON "email_logs" USING btree ("user_id","sent_at");
CREATE INDEX IF NOT EXISTS "loans_user_id_status_idx" ON "loans" USING btree ("user_id","status");
CREATE INDEX IF NOT EXISTS "loans_user_id_created_at_idx" ON "loans" USING btree ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "chat_conversations_user_id_updated_at_idx" ON "chat_conversations" USING btree ("user_id","updated_at");
CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_created_at_idx" ON "chat_messages" USING btree ("conversation_id","created_at");
CREATE INDEX IF NOT EXISTS "email_logs_resend_id_idx" ON "email_logs" USING btree ("resend_id");
