CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"sources" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_messages_chat_id_idx" ON "chat_messages" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "chats_user_id_idx" ON "chats" USING btree ("user_id");