CREATE TABLE "web_crawl_jobs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"folder_id" text,
	"root_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_pages" integer DEFAULT 0 NOT NULL,
	"processed_pages" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "web_crawl_jobs" ADD CONSTRAINT "web_crawl_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_crawl_jobs" ADD CONSTRAINT "web_crawl_jobs_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "web_crawl_jobs_user_id_idx" ON "web_crawl_jobs" USING btree ("user_id");