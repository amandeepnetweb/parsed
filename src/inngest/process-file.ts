import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest";
import { pusher } from "@/lib/pusher";
import { db } from "@/lib/database";
import { files, folders, fileChunks } from "@/db/schema";
import { parseFile } from "@/lib/parsers";
import { chunkText } from "@/lib/chunker";
import { embedTexts } from "@/lib/embeddings";
import { upsertChunks, deleteChunksByIds } from "@/lib/pinecone";
import type { ChunkMetadata } from "@/lib/pinecone";

export type FileProgressData = {
  step: string;
  message: string;
  progress: number;
  done?: boolean;
  error?: string; // set when step === "error"
};

const emit = (fileId: string, data: FileProgressData) =>
  pusher.trigger(`file-${fileId}`, "progress", data);

export const processFile = inngest.createFunction(
  {
    id: "process-file",
    retries: 3,
    onFailure: async ({ event, error }) => {
      const { fileId } = event.data.event.data as { fileId: string; userId: string };
      await db
        .update(files)
        .set({ status: "error", errorMessage: error.message ?? "Processing failed" })
        .where(eq(files.id, fileId));
      await pusher.trigger(`file-${fileId}`, "progress", {
        step: "error",
        message: "Processing failed",
        progress: 0,
        error: error.message ?? "Processing failed",
      } satisfies FileProgressData);
    },
  },
  { event: "file/uploaded" },
  async ({ event, step }) => {
    const { fileId, userId } = event.data as { fileId: string; userId: string };

    // ── Step 1: Mark processing ───────────────────────────────────────────────
    const file = await step.run("mark-processing", async () => {
      await db
        .update(files)
        .set({ status: "processing", errorMessage: null })
        .where(eq(files.id, fileId));

      const [row] = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
      if (!row) throw new Error("File not found");
      return row;
    });

    await emit(fileId, { step: "download", message: "Downloading file…", progress: 10 });

    // ── Step 2: Download from Vercel Blob ─────────────────────────────────────
    const buffer = await step.run("download-blob", async () => {
      const res = await fetch(file.blobUrl);
      if (!res.ok) throw new Error("Failed to download file from storage");
      const ab = await res.arrayBuffer();
      return Array.from(new Uint8Array(ab));
    });

    await emit(fileId, { step: "parse", message: "Extracting text…", progress: 25 });

    // ── Step 3: Parse text ────────────────────────────────────────────────────
    const text = await step.run("parse-text", async () => {
      const ab = new Uint8Array(buffer).buffer;
      const result = await parseFile(ab, file.type);
      if (!result.trim()) throw new Error("No text could be extracted from file");
      return result;
    });

    await emit(fileId, { step: "chunk", message: "Chunking text…", progress: 40 });

    // ── Step 4: Chunk text ────────────────────────────────────────────────────
    const chunks = await step.run("chunk-text", async () => {
      const result = await chunkText(text, file.type);
      if (result.length === 0) throw new Error("No chunks produced from file");
      return result;
    });

    await emit(fileId, { step: "resolve", message: "Resolving folder path…", progress: 50 });

    // ── Step 5: Resolve folder path ───────────────────────────────────────────
    const folderPath = await step.run("resolve-folder-path", async () => {
      if (!file.folderId) return "";
      const allFolders = await db.select().from(folders).where(eq(folders.userId, userId));
      const parts: string[] = [];
      let current = allFolders.find((f) => f.id === file.folderId);
      while (current) {
        parts.unshift(current.name);
        current = current.parentId
          ? allFolders.find((f) => f.id === current!.parentId)
          : undefined;
      }
      return parts.join(" / ");
    });

    await emit(fileId, { step: "cleanup", message: "Cleaning up old data…", progress: 55 });

    // ── Step 6: Delete existing chunks ───────────────────────────────────────
    await step.run("delete-existing-chunks", async () => {
      const existing = await db
        .select({ pineconeId: fileChunks.pineconeId })
        .from(fileChunks)
        .where(eq(fileChunks.fileId, fileId));

      if (existing.length > 0) {
        await deleteChunksByIds(userId, existing.map((c) => c.pineconeId));
        await db.delete(fileChunks).where(eq(fileChunks.fileId, fileId));
      }
    });

    await emit(fileId, { step: "embed", message: `Embedding ${chunks.length} chunks…`, progress: 65 });

    // ── Step 7: Embed all chunks ──────────────────────────────────────────────
    const embeddings = await step.run("embed-chunks", async () => embedTexts(chunks));

    await emit(fileId, { step: "upsert", message: "Storing in vector DB…", progress: 85 });

    // ── Step 8: Upsert to Pinecone ────────────────────────────────────────────
    await step.run("upsert-pinecone", async () => {
      const vectors = chunks.map((chunk, i) => ({
        id: `${fileId}-chunk-${i}`,
        values: embeddings[i],
        metadata: {
          fileId,
          fileName: file.name,
          fileType: file.type,
          folderId: file.folderId ?? "",
          folderPath,
          chunkIndex: i,
          tags: file.tags,
          size: file.size,
          preview: chunk.slice(0, 200),
          content: chunk,
        } satisfies ChunkMetadata,
      }));
      await upsertChunks(userId, vectors);
    });

    await emit(fileId, { step: "save", message: "Saving to database…", progress: 95 });

    // ── Step 9: Persist chunks + mark ready ──────────────────────────────────
    await step.run("save-to-db", async () => {
      const dbRows = chunks.map((chunk, i) => ({
        fileId,
        content: chunk,
        chunkIndex: i,
        pineconeId: `${fileId}-chunk-${i}`,
      }));
      await db.insert(fileChunks).values(dbRows);
      await db.update(files).set({ status: "ready" }).where(eq(files.id, fileId));
    });

    await emit(fileId, { step: "done", message: "Ready!", progress: 100, done: true });

    return { fileId, chunks: chunks.length };
  },
);
