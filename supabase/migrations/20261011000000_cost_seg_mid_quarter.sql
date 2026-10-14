-- cost_seg_studies.mid_quarter_convention (schema added in the platform bug sweep).
-- Additive with a default, so it is safe to apply before the code that reads it ships.
-- cost_seg_studies is postgres-owned: apply with `npx supabase db push --linked`.
ALTER TABLE "cost_seg_studies" ADD COLUMN IF NOT EXISTS "mid_quarter_convention" boolean NOT NULL DEFAULT false;
