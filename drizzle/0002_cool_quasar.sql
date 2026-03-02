CREATE TABLE IF NOT EXISTS "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"borrower_name" text NOT NULL,
	"borrower_email" text,
	"borrower_phone" text,
	"property_address" text NOT NULL,
	"property_city" text,
	"property_state" text DEFAULT 'FL',
	"property_zip" text,
	"purchase_price" numeric,
	"loan_amount" numeric NOT NULL,
	"loan_type" text NOT NULL,
	"interest_rate" numeric,
	"term" integer,
	"status" text DEFAULT 'pre_qual',
	"arive_link" text,
	"arive_link_sent_at" timestamp,
	"estimated_closing_date" date,
	"actual_closing_date" date,
	"commission_bps" integer,
	"commission_amount" numeric,
	"lender_id" text,
	"lender_name" text,
	"lead_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"arive_link" text,
	"arive_company_name" text,
	"rate_alert_enabled" boolean DEFAULT false,
	"rate_alert_threshold_bps" numeric,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mortgage_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_of" date NOT NULL,
	"rate_30yr" numeric,
	"rate_15yr" numeric,
	"rate_5_arm" numeric,
	"source" text DEFAULT 'freddie_mac_pmms',
	"fetched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "loan_amount" numeric;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "interest_rate" numeric;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "loan_term_years" integer;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "monthly_payment" numeric;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "loan_type" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "lender_name" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "loan_origination_date" date;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "member_name" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "member_address" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "member_city" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "member_state" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "member_zip" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sunbiz_doc_number" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "loans" ADD CONSTRAINT "loans_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;