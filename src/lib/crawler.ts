import * as cheerio from "cheerio";
import { extractPageData } from "./extractor";
import type { PageData } from "./extractor";

const CONCURRENCY = 5;

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return raw;
  }
}

function shouldSkip(href: string): boolean {
  const lower = href.toLowerCase();
  return (
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("javascript:") ||
    lower.endsWith(".pdf") ||
    lower.endsWith(".zip") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".svg") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".mp3")
  );
}

/**
 * Crawls a website via BFS and extracts page content in a single pass.
 * Each URL is fetched exactly once — links are discovered and content is
 * extracted from the same HTML response. Fetches up to CONCURRENCY pages
 * in parallel per batch.
 *
 * @param onProgress - called after each batch with (processed, estimated total)
 */
export async function crawlAndExtract(
  rootUrl: string,
  maxPages: number,
  onProgress?: (processed: number, estimated: number) => Promise<void>,
): Promise<PageData[]> {
  const root = new URL(rootUrl);
  const visited = new Set<string>();
  const queued = new Set<string>(); // O(1) dedup — avoids O(n) queue.includes()
  const queue: string[] = [normalizeUrl(rootUrl)];
  queued.add(normalizeUrl(rootUrl));

  const results: PageData[] = [];

  while (queue.length > 0 && results.length < maxPages) {
    // Drain up to CONCURRENCY unvisited URLs from the front of the queue
    const batch: string[] = [];
    while (queue.length > 0 && batch.length < CONCURRENCY) {
      const url = queue.shift()!;
      if (!visited.has(url)) {
        visited.add(url);
        batch.push(url);
      }
    }
    if (batch.length === 0) continue;

    const batchResults = await Promise.allSettled(
      batch.map(async (pageUrl) => {
        const res = await fetch(pageUrl, {
          headers: { "User-Agent": "Parsed-Crawler/1.0 (document indexer)" },
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html")) throw new Error("Not HTML");
        const html = await res.text();

        // Discover outbound links from this page
        const $ = cheerio.load(html);
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href");
          if (!href || shouldSkip(href)) return;
          try {
            const abs = new URL(href, pageUrl);
            if (abs.hostname !== root.hostname) return;
            abs.hash = "";
            const normalized = normalizeUrl(abs.toString());
            if (!visited.has(normalized) && !queued.has(normalized)) {
              queue.push(normalized);
              queued.add(normalized);
            }
          } catch {
            // invalid URL — skip
          }
        });

        // Extract structured content from same HTML response — no second fetch
        return extractPageData(html, pageUrl);
      }),
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled" && results.length < maxPages) {
        results.push(r.value);
      }
    }

    if (onProgress) {
      const estimated = Math.min(results.length + queue.length, maxPages);
      await onProgress(results.length, estimated);
    }
  }

  return results;
}
