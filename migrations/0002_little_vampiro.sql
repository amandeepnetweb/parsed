ALTER TABLE "file_chunks" DROP CONSTRAINT "file_chunks_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "chat_messages_chat_id_idx";--> statement-breakpoint
DROP INDEX "chats_user_id_idx";--> statement-breakpoint
DROP INDEX "file_chunks_user_id_idx";--> statement-breakpoint
CREATE INDEX "chat_messages_chat_id_created_at_idx" ON "chat_messages" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "chats_user_id_updated_at_idx" ON "chats" USING btree ("user_id","updated_at");--> statement-breakpoint
ALTER TABLE "file_chunks" DROP COLUMN "user_id";