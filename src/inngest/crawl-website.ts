import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest";
import { pusher } from "@/lib/pusher";
import { db } from "@/lib/database";
import { files, fileChunks, folders, webCrawlJobs } from "@/db/schema";
import { discoverUrls } from "@/lib/crawler";
import { extractPageData, compileSiteMarkdown } from "@/lib/extractor";
import { uploadToBlob } from "@/lib/storage";
import { chunkText } from "@/lib/chunker";
import { embedTexts } from "@/lib/embeddings";
import { upsertChunks, deleteChunksByIds } from "@/lib/pinecone";
import type { ChunkMetadata } from "@/lib/pinecone";

export type CrawlProgressData = {
  step: string;
  message: string;
  processedPages?: number;
  totalPages?: number;
  fileId?: string;
  folderId?: string;
  done?: boolean;
  error?: string;
};

const emit = (jobId: string, data: CrawlProgressData) =>
  pusher.trigger(`crawl-${jobId}`, "progress", data);

export const crawlWebsite = inngest.createFunction(
  {
    id: "crawl-website",
    retries: 1,
    onFailure: async ({ event, error }) => {
      const { jobId } = event.data.event.data as { jobId: string };
      await db
        .update(webCrawlJobs)
        .set({ status: "error", errorMessage: error.message ?? "Crawl failed" })
        .where(eq(webCrawlJobs.id, jobId));
      await pusher.trigger(`crawl-${jobId}`, "progress", {
        step: "error",
        message: error.message ?? "Crawl failed",
        error: error.message ?? "Crawl failed",
      } satisfies CrawlProgressData);
    },
  },
  { event: "url/crawl.start" },
  async ({ event, step }) => {
    const { jobId, userId, rootUrl, maxPages = 25 } = event.data as {
      jobId: string;
      userId: string;
      rootUrl: string;
      maxPages?: number;
    };

    await emit(jobId, { step: "discover", message: "Discovering pages…" });

    // ── Step 1: Discover all URLs via BFS ─────────────────────────────────────
    const urls = await step.run("discover-urls", async () => {
      await db.update(webCrawlJobs).set({ status: "crawling" }).where(eq(webCrawlJobs.id, jobId));
      return discoverUrls(rootUrl, maxPages);
    });

    const total = urls.length;
    await emit(jobId, {
      step: "discovered",
      message: `Found ${total} page${total === 1 ? "" : "s"} — extracting content…`,
      totalPages: total,
      processedPages: 0,
    });

    await step.run("update-total", async () => {
      await db
        .update(webCrawlJobs)
        .set({ status: "processing", totalPages: total })
        .where(eq(webCrawlJobs.id, jobId));
    });

    // ── Step 2: Fetch + extract all pages ─────────────────────────────────────
    // Process in batches of 5 concurrently, emit progress after each batch
    const BATCH = 5;
    const allPageData = await step.run("extract-pages", async () => {
      const results = [];

      for (let i = 0; i < urls.length; i += BATCH) {
        const batch = urls.slice(i, i + BATCH);

        const batchResults = await Promise.allSettled(
          batch.map(async (pageUrl) => {
            const res = await fetch(pageUrl, {
              headers: { "User-Agent": "Parsed-Crawler/1.0" },
              signal: AbortSignal.timeout(12000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();
            return extractPageData(html, pageUrl);
          }),
        );

        for (const r of batchResults) {
          if (r.status === "fulfilled") results.push(r.value);
        }

        const processed = Math.min(i + BATCH, urls.length);
        await pusher.trigger(`crawl-${jobId}`, "progress", {
          step: "extracting",
          message: `Extracted ${processed} of ${urls.length} pages…`,
          processedPages: processed,
          totalPages: urls.length,
        } satisfies CrawlProgressData);
      }

      return results;
    });

    await emit(jobId, { step: "compile", message: "Compiling site document…" });

    // ── Step 3: Compile all pages into one document — no truncation, full content
    const markdown = await step.run("compile-markdown", async () => {
      return compileSiteMarkdown(rootUrl, allPageData);
    });

    await emit(jobId, { step: "store", message: "Saving document…" });

    // ── Step 4: Upload to Vercel Blob + create folder + file record ──────────
    const { fileId, folderId } = await step.run("store-file", async () => {
      const domain = new URL(rootUrl).hostname;
      const encoder = new TextEncoder();
      const buffer = encoder.encode(markdown).buffer as ArrayBuffer;
      const safeDomain = domain.replace(/[^a-z0-9]/gi, "-");

      const blobUrl = await uploadToBlob(`web/${safeDomain}.md`, buffer, "text/markdown");

      const [folder] = await db
        .insert(folders)
        .values({ userId, name: domain, parentId: null })
        .returning();

      const [row] = await db
        .insert(files)
        .values({
          userId,
          folderId: folder.id,
          name: `web-scraping-${safeDomain}`,
          originalName: `web-scraping-${safeDomain}.md`,
          type: "web",
          size: encoder.encode(markdown).length,
          blobUrl,
          status: "processing",
          tags: [],
        })
        .returning();

      await db
        .update(webCrawlJobs)
        .set({ fileId: row.id, folderId: folder.id })
        .where(eq(webCrawlJobs.id, jobId));

      return { fileId: row.id, folderId: folder.id };
    });

    await emit(jobId, { step: "embed", message: "Embedding content…" });

    // ── Step 5: Chunk → Embed → Upsert ───────────────────────────────────────
    await step.run("embed-and-store", async () => {
      const chunks = await chunkText(markdown, "md");
      if (chunks.length === 0) throw new Error("No content to embed");

      const embeddings = await embedTexts(chunks);

      const vectors = chunks.map((chunk, i) => ({
        id: `${fileId}-chunk-${i}`,
        values: embeddings[i],
        metadata: {
          fileId,
          fileName: new URL(rootUrl).hostname,
          fileType: "web",
          folderId,
          folderPath: new URL(rootUrl).hostname,
          chunkIndex: i,
          tags: [],
          size: new TextEncoder().encode(markdown).length,
          preview: chunk.slice(0, 200),
          content: chunk,
        } satisfies ChunkMetadata,
      }));

      await upsertChunks(userId, vectors);

      const dbRows = chunks.map((chunk, i) => ({
        fileId,
        content: chunk,
        chunkIndex: i,
        pineconeId: `${fileId}-chunk-${i}`,
      }));
      await db.insert(fileChunks).values(dbRows);
      await db.update(files).set({ status: "ready" }).where(eq(files.id, fileId));
      await db
        .update(webCrawlJobs)
        .set({ status: "done", processedPages: allPageData.length })
        .where(eq(webCrawlJobs.id, jobId));
    });

    await emit(jobId, {
      step: "done",
      message: `${allPageData.length} pages imported — ready to chat!`,
      processedPages: allPageData.length,
      totalPages: total,
      fileId,
      folderId,
      done: true,
    });

    return { jobId, fileId, pages: allPageData.length };
  },
);
