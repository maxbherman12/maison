ALTER TABLE "furniture_items" ADD COLUMN "markup_bps" integer;--> statement-breakpoint
ALTER TABLE "furniture_items" ADD COLUMN "client_price_cents" integer;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD COLUMN "cost_cents" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "markup_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_markup_valid" CHECK ("furniture_items"."markup_bps" is null or "furniture_items"."markup_bps" between 0 and 100000);--> statement-breakpoint
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_client_price_valid" CHECK ("furniture_items"."client_price_cents" is null or "furniture_items"."client_price_cents" >= 0);--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_cost_valid" CHECK ("invoice_line_items"."cost_cents" is null or "invoice_line_items"."cost_cents" >= 0);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_markup_valid" CHECK ("projects"."markup_bps" between 0 and 100000);--> statement-breakpoint
-- Every invoice before this migration billed furniture at trade, so the frozen
-- client price and the cost snapshot both equal what was billed.
UPDATE "furniture_items" SET "client_price_cents" = "trade_cents" WHERE "invoice_id" IS NOT NULL;--> statement-breakpoint
UPDATE "invoice_line_items" SET "cost_cents" = "amount_cents" WHERE "kind" = 'furniture';
