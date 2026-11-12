CREATE TYPE "public"."invoice_style" AS ENUM('gallery', 'ledger', 'atelier');--> statement-breakpoint
CREATE TABLE "account_settings" (
	"owner_id" uuid PRIMARY KEY NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"business_address" text DEFAULT '' NOT NULL,
	"business_email" text DEFAULT '' NOT NULL,
	"business_phone" text DEFAULT '' NOT NULL,
	"default_hourly_rate_cents" integer,
	"invoice_style" "invoice_style" DEFAULT 'gallery' NOT NULL,
	"payment_terms_days" integer DEFAULT 14 NOT NULL,
	"payment_note" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_settings_payment_terms_valid" CHECK ("account_settings"."payment_terms_days" between 0 and 365),
	CONSTRAINT "account_settings_hourly_rate_positive" CHECK ("account_settings"."default_hourly_rate_cents" is null or "account_settings"."default_hourly_rate_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "style" "invoice_style" DEFAULT 'gallery' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "from_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "from_details" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "account_settings" ADD CONSTRAINT "account_settings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Invoices made before this migration were printed with the "Maison" letterhead.
UPDATE "invoices" SET "from_name" = 'Maison' WHERE "from_name" = '';
