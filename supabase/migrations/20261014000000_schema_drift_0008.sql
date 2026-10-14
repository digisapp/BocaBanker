-- Drizzle 0008 items that never reached prod (drizzle-kit history is stale).
-- Found 2026-10-11, still missing 2026-10-14. All tables are postgres-owned.
-- Safe at time of writing: 0 study_assets rows, 0 clients (so no orphaned
-- converted_client_id), 55 mortgage_rates rows with 55 distinct week_of.

-- Residential assets use a 27.5-year recovery period; integer can't hold it
ALTER TABLE "study_assets" ALTER COLUMN "recovery_period" SET DATA TYPE real;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_converted_client_id_clients_id_fk') THEN
    ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_client_id_clients_id_fk"
      FOREIGN KEY ("converted_client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "leads_user_id_status_idx" ON "leads" USING btree ("user_id", "status");
CREATE INDEX IF NOT EXISTS "leads_user_id_created_at_idx" ON "leads" USING btree ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "leads_member_name_idx" ON "leads" USING btree ("member_name");
CREATE UNIQUE INDEX IF NOT EXISTS "mortgage_rates_week_of_unique" ON "mortgage_rates" USING btree ("week_of");
