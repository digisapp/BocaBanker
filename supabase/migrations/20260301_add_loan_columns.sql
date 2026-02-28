-- Add mortgage/loan fields to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS loan_amount numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS interest_rate numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS loan_term_years integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS monthly_payment numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS loan_type text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lender_name text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS loan_origination_date date;
