-- Add LLC member/registered agent columns from Sunbiz
ALTER TABLE leads ADD COLUMN IF NOT EXISTS member_name text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS member_address text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS member_city text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS member_state text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS member_zip text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sunbiz_doc_number text;
