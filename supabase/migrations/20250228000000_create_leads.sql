-- Create leads table for Florida commercial property leads
CREATE TABLE IF NOT EXISTS "leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "property_address" text NOT NULL,
  "property_city" text,
  "property_county" text,
  "property_state" text DEFAULT 'FL',
  "property_zip" text,
  "property_type" text NOT NULL,
  "sale_price" numeric,
  "sale_date" date,
  "parcel_id" text,
  "deed_book_page" text,
  "buyer_name" text,
  "buyer_company" text,
  "buyer_email" text,
  "buyer_phone" text,
  "seller_name" text,
  "square_footage" integer,
  "year_built" integer,
  "building_value" numeric,
  "land_value" numeric,
  "status" text DEFAULT 'new',
  "priority" text DEFAULT 'medium',
  "source" text,
  "notes" text,
  "tags" text[] DEFAULT '{}'::text[],
  "contacted_at" timestamp,
  "converted_client_id" uuid,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Add foreign key to users table
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- Grant permissions to app_user
GRANT ALL PRIVILEGES ON TABLE "leads" TO app_user;
