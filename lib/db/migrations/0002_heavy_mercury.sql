CREATE TABLE "invoice_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"title" text NOT NULL,
	"amount" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "due_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_line_items_source_unique" ON "invoice_line_items" USING btree ("invoice_id","source","source_id");--> statement-breakpoint
CREATE INDEX "invoices_project_id_idx" ON "invoices" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "invoices_created_at_idx" ON "invoices" USING btree ("created_at");--> statement-breakpoint
-- Hand-written: renumber duplicate invoice numbers before enforcing
-- uniqueness. Duplicates move above the current maximum so they cannot collide
-- with existing rows.
WITH duplicates AS (
	SELECT id, row_number() OVER (PARTITION BY number ORDER BY created_at, id) AS rn
	FROM invoices
),
max_number AS (
	SELECT COALESCE(MAX(substring(number from '[0-9]+')::int), 1041) AS value
	FROM invoices
)
UPDATE invoices AS i
SET number = '#' || (m.value + d.rn - 1)
FROM duplicates AS d, max_number AS m
WHERE i.id = d.id AND d.rn > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_unique" ON "invoices" USING btree ("number");--> statement-breakpoint
-- Hand-written backfill: snapshot the source rows each existing invoice was
-- generated from. Current titles/amounts are used because the historical values
-- are not recoverable. Invoices with no resolvable rows stay legacy totals.
INSERT INTO invoice_line_items (id, invoice_id, source, source_id, title, amount, created_at)
SELECT gen_random_uuid()::text, i.id, 'hours', h.id, h.title, h.amount, i.created_at
FROM invoices AS i
JOIN hour_entries AS h ON h.invoice_id = i.id
ON CONFLICT (invoice_id, source, source_id) DO NOTHING;--> statement-breakpoint
INSERT INTO invoice_line_items (id, invoice_id, source, source_id, title, amount, created_at)
SELECT gen_random_uuid()::text, i.id, 'furniture', f.id, f.name, f.trade, i.created_at
FROM invoices AS i
JOIN furniture_items AS f ON f.invoice_id = i.id
ON CONFLICT (invoice_id, source, source_id) DO NOTHING;