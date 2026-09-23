CREATE INDEX IF NOT EXISTS "chat_conversations_user_id_updated_at_idx" ON "chat_conversations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_created_at_idx" ON "chat_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_logs_resend_id_idx" ON "email_logs" USING btree ("resend_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emails_user_id_direction_created_at_idx" ON "emails" USING btree ("user_id","direction","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emails_metadata_message_id_idx" ON "emails" USING btree (("metadata"->>'messageId'));