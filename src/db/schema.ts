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
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    pineconeId: varchar("pinecone_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    fileIdIdx: index("file_chunks_file_id_idx").on(t.fileId),
    userIdIdx: index("file_chunks_user_id_idx").on(t.userId),
    pineconeIdIdx: index("file_chunks_pinecone_id_idx").on(t.pineconeId),
  }),
);

export type FileChunk = typeof fileChunks.$inferSelect;
export type NewFileChunk = typeof fileChunks.$inferInsert;
