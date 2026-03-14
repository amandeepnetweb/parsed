ALTER TABLE "folders" ADD COLUMN "widget_token" text;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_widget_token_unique" UNIQUE("widget_token");