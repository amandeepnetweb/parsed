import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest";
import { pusher } from "@/lib/pusher";
import { db } from "@/lib/database";
import { files, fileChunks, folders, webCrawlJobs } from "@/db/schema";
import { crawlAndExtract } from "@/lib/crawler";
import type { PageData } from "@/lib/extractor";
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

// Builds a lightweight site summary for Blob storage.
// Contact info + page index only — full content lives in per-page Pinecone chunks.
function buildSiteSummary(rootUrl: string, pages: PageData[]): string {
  const domain = new URL(rootUrl).hostname;

  const allEmails = [...new Set(pages.flatMap((p) => p.emails))];
  const allPhones = [...new Set(pages.flatMap((p) => p.phones))];
  const allSocials: Record<string, string> = {};
  for (const page of pages) {
    for (const [name, url] of Object.entries(page.socials)) {
      if (!allSocials[name]) allSocials[name] = url;
    }
  }

  const lines: string[] = [
    `# ${pages[0]?.title || domain}`,
    ``,
    `URL: ${rootUrl}`,
    `Crawled: ${new Date().toISOString()}`,
    `Pages: ${pages.length}`,
    ``,
  ];

  if (allEmails.length > 0 || allPhones.length > 0 || Object.keys(allSocials).length > 0) {
    lines.push(`## Contact`);
    if (allEmails.length > 0) lines.push(`Emails: ${allEmails.join(", ")}`);
    if (allPhones.length > 0) lines.push(`Phones: ${allPhones.join(", ")}`);
    for (const [name, url] of Object.entries(allSocials)) lines.push(`${name}: ${url}`);
    lines.push(``);
  }

  lines.push(`## Pages`);
  for (const page of pages) {
    lines.push(`- [${page.title}](${page.url})`);
  }

  return lines.join("\n");
}

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

    await db.update(webCrawlJobs).set({ status: "crawling" }).where(eq(webCrawlJobs.id, jobId));
    await emit(jobId, { step: "discover", message: "Crawling pages…" });

    // ── Step 1: Crawl + extract (one fetch per page) ──────────────────────────
    const allPageData = await step.run("crawl-pages", async () => {
      return crawlAndExtract(rootUrl, maxPages, async (processed, estimated) => {
        await emit(jobId, {
          step: "extracting",
          message: `Crawled ${processed} of ~${estimated} pages…`,
          processedPages: processed,
          totalPages: estimated,
        });
      });
    });

    const total = allPageData.length;

    await db
      .update(webCrawlJobs)
      .set({ status: "processing", totalPages: total })
      .where(eq(webCrawlJobs.id, jobId));

    await emit(jobId, {
      step: "store",
      message: `Found ${total} page${total === 1 ? "" : "s"} — saving…`,
      totalPages: total,
      processedPages: total,
    });

    // ── Step 2: Upload site summary + create DB records ───────────────────────
    // Full page content goes into per-page Pinecone chunks (step 3).
    // Blob stores only a lightweight index: contact info + page list.
    const { fileId, folderId } = await step.run("store-file", async () => {
      const domain = new URL(rootUrl).hostname;
      const safeDomain = domain.replace(/[^a-z0-9]/gi, "-");
      const summary = buildSiteSummary(rootUrl, allPageData);

      const encoder = new TextEncoder();
      const buffer = encoder.encode(summary).buffer as ArrayBuffer;
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
          size: encoder.encode(summary).length,
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

    // ── Step 3: Per-page chunk → embed → upsert ───────────────────────────────
    // Each page is chunked independently so chunks are semantically coherent
    // and source attribution points to the specific page, not just the domain.
    await step.run("embed-and-store", async () => {
      const domain = new URL(rootUrl).hostname;

      // Chunk all pages in parallel (CPU-bound, no I/O)
      const pageChunkResults = await Promise.all(
        allPageData
          .filter((p) => p.bodyText.trim())
          .map(async (page) => ({
            page,
            chunks: await chunkText(page.bodyText, "md"),
          })),
      );

      // Flatten into one array with per-page metadata attached
      const allChunks = pageChunkResults.flatMap(({ page, chunks }) =>
        chunks.map((content) => ({
          content,
          pageUrl: page.url,
          pageTitle: page.title || domain,
        })),
      );

      // Prepend a dedicated contact-info chunk so emails/phones/socials are
      // retrievable even though they don't appear in Readability body text.
      const allEmails = [...new Set(allPageData.flatMap((p) => p.emails))];
      const allPhones = [...new Set(allPageData.flatMap((p) => p.phones))];
      const allSocials: Record<string, string> = {};
      for (const page of allPageData) {
        for (const [name, url] of Object.entries(page.socials)) {
          if (!allSocials[name]) allSocials[name] = url;
        }
      }
      if (allEmails.length > 0 || allPhones.length > 0 || Object.keys(allSocials).length > 0) {
        const lines = [`Contact information for ${domain}:`];
        if (allEmails.length > 0) lines.push(`Emails: ${allEmails.join(", ")}`);
        if (allPhones.length > 0) lines.push(`Phones: ${allPhones.join(", ")}`);
        for (const [name, url] of Object.entries(allSocials)) lines.push(`${name}: ${url}`);
        allChunks.unshift({ content: lines.join("\n"), pageUrl: rootUrl, pageTitle: domain });
      }

      if (allChunks.length === 0) throw new Error("No content to embed");

      // Single batch embedding call across all chunks from all pages
      const embeddings = await embedTexts(allChunks.map((c) => c.content));

      const vectors = allChunks.map((chunk, i) => ({
        id: `${fileId}-chunk-${i}`,
        values: embeddings[i],
        metadata: {
          fileId,
          fileName: chunk.pageTitle,  // specific page title, not just domain
          fileType: "web",
          folderId,
          folderPath: domain,
          chunkIndex: i,
          tags: [],
          size: new TextEncoder().encode(chunk.content).length,
          content: chunk.content,
          pageUrl: chunk.pageUrl,     // specific page URL for source attribution
        } satisfies ChunkMetadata,
      }));

      await upsertChunks(userId, vectors);

      const dbRows = allChunks.map((chunk, i) => ({
        fileId,
        content: chunk.content,
        chunkIndex: i,
        pineconeId: `${fileId}-chunk-${i}`,
      }));

      await db.insert(fileChunks).values(dbRows);
      await db.update(files).set({ status: "ready" }).where(eq(files.id, fileId));
      await db
        .update(webCrawlJobs)
        .set({ status: "done", processedPages: total })
        .where(eq(webCrawlJobs.id, jobId));
    });

    await emit(jobId, {
      step: "done",
      message: `${total} pages imported — ready to chat!`,
      processedPages: total,
      totalPages: total,
      fileId,
      folderId,
      done: true,
    });

    return { jobId, fileId, pages: total };
  },
);
