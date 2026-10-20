ALTER TABLE "invoices" ALTER COLUMN "total" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "outstanding" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "furniture_items" ADD COLUMN "invoice_id" text;--> statement-breakpoint
ALTER TABLE "hour_entries" ADD COLUMN "invoice_id" text;--> statement-breakpoint
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_entries" ADD CONSTRAINT "hour_entries_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;