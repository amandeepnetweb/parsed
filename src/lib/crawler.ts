import * as cheerio from "cheerio";

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    // Remove trailing slash for dedup (except root)
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

export async function discoverUrls(rootUrl: string, maxPages = 50): Promise<string[]> {
  const root = new URL(rootUrl);
  const visited = new Set<string>();
  const queue: string[] = [normalizeUrl(rootUrl)];
  const discovered: string[] = [];

  while (queue.length > 0 && discovered.length < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    let html: string;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Parsed-Crawler/1.0 (document indexer)" },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) continue;
      html = await res.text();
    } catch {
      continue;
    }

    discovered.push(url);

    const $ = cheerio.load(html);
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || shouldSkip(href)) return;
      try {
        const abs = new URL(href, url);
        if (abs.hostname !== root.hostname) return;
        abs.hash = "";
        const normalized = normalizeUrl(abs.toString());
        if (!visited.has(normalized) && !queue.includes(normalized)) {
          queue.push(normalized);
        }
      } catch {
        // invalid URL, skip
      }
    });
  }

  return discovered;
}
