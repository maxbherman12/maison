CREATE TABLE "furniture_items" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"vendor" text,
	"retail" real NOT NULL,
	"trade" real NOT NULL,
	"link" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hour_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"hours" real NOT NULL,
	"amount" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"number" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"total" integer NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"pathname" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"client" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"hourly_rate" real NOT NULL,
	"color" text DEFAULT 'sage' NOT NULL,
	"initials" text NOT NULL,
	"outstanding" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_entries" ADD CONSTRAINT "hour_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;