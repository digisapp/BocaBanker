-- Inbox folders for /email: spam (recoverable, out of the inbox) and starred.
-- `emails` is owned by app_user: apply with
--   psql "$DATABASE_URL" -f drizzle/0011_add_inbox_flags.sql
-- (see memory: db-table-ownership). Idempotent; safe to re-run.
ALTER TABLE "emails" ADD COLUMN IF NOT EXISTS "is_spam" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN IF NOT EXISTS "is_starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emails_direction_spam_read_idx" ON "emails" USING btree ("direction","is_spam","is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emails_is_starred_idx" ON "emails" USING btree ("is_starred");--> statement-breakpoint
-- Backfill: the old webhook flagged spam in metadata only.
UPDATE "emails" SET "is_spam" = true WHERE "is_spam" = false AND "metadata"->>'spamFiltered' = 'true';
