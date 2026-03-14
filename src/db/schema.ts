import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

// ── Folders ─────────────────────────────────────────────────────────────────

export const folders = pgTable(
  "folders",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references(
      (): AnyPgColumn => folders.id,
      { onDelete: "cascade" },
    ),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userIdIdx: index("folders_user_id_idx").on(t.userId),
    parentIdIdx: index("folders_parent_id_idx").on(t.parentId),
  }),
);

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;

// ── Files ────────────────────────────────────────────────────────────────────

export const files = pgTable(
  "files",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    folderId: text("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    type: varchar("type", { length: 10 }).notNull(), // pdf | docx | txt | md
    size: integer("size").notNull(), // bytes
    blobUrl: text("blob_url").notNull(),
    status: text("status").default("uploading").notNull(), // uploading | processing | ready | error
    tags: text("tags").array().default([]).notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userIdIdx: index("files_user_id_idx").on(t.userId),
    folderIdIdx: index("files_folder_id_idx").on(t.folderId),
    statusIdx: index("files_status_idx").on(t.status),
    userStatusIdx: index("files_user_status_idx").on(t.userId, t.status),
  }),
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

// ── File Chunks ──────────────────────────────────────────────────────────────

export const fileChunks = pgTable(
  "file_chunks",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    pineconeId: varchar("pinecone_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    fileIdIdx: index("file_chunks_file_id_idx").on(t.fileId),
    pineconeIdIdx: index("file_chunks_pinecone_id_idx").on(t.pineconeId),
  }),
);

export type FileChunk = typeof fileChunks.$inferSelect;
export type NewFileChunk = typeof fileChunks.$inferInsert;

// ── Chats ─────────────────────────────────────────────────────────────────────

export const chats = pgTable(
  "chats",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userIdUpdatedAtIdx: index("chats_user_id_updated_at_idx").on(t.userId, t.updatedAt),
  }),
);

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;

// ── Chat Messages ─────────────────────────────────────────────────────────────

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant
    content: text("content").notNull(),
    sources: text("sources"), // JSON string, null for user messages
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    chatIdCreatedAtIdx: index("chat_messages_chat_id_created_at_idx").on(t.chatId, t.createdAt),
  }),
);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

// ── Web Crawl Jobs ────────────────────────────────────────────────────────────

export const webCrawlJobs = pgTable(
  "web_crawl_jobs",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    folderId: text("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    rootUrl: text("root_url").notNull(),
    status: text("status").default("pending").notNull(), // pending | crawling | processing | done | error
    totalPages: integer("total_pages").default(0).notNull(),
    processedPages: integer("processed_pages").default(0).notNull(),
    fileId: text("file_id").references(() => files.id, { onDelete: "set null" }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userIdIdx: index("web_crawl_jobs_user_id_idx").on(t.userId),
  }),
);

export type WebCrawlJob = typeof webCrawlJobs.$inferSelect;
export type NewWebCrawlJob = typeof webCrawlJobs.$inferInsert;
