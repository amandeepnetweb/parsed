import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { findPhoneNumbersInText } from "libphonenumber-js";

export interface PageData {
  url: string;
  title: string;
  description: string;
  emails: string[];
  phones: string[];
  socials: Record<string, string>;
  h1s: string[];
  h2s: string[];
  bodyText: string;
}

function getMeta($: cheerio.CheerioAPI, name: string): string {
  return (
    $(`meta[name="${name}"]`).attr("content") ??
    $(`meta[property="${name}"]`).attr("content") ??
    ""
  );
}

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Known social platforms: domain fragment → display name
const SOCIAL_PLATFORMS: Record<string, string> = {
  "facebook.com": "Facebook",
  "instagram.com": "Instagram",
  "twitter.com": "Twitter",
  "x.com": "Twitter",
  "linkedin.com": "LinkedIn",
  "youtube.com": "YouTube",
  "tiktok.com": "TikTok",
  "github.com": "GitHub",
  "pinterest.com": "Pinterest",
};

// Cloudflare Email Obfuscation encodes emails as a hex string in data-cfemail.
// The first byte is the XOR key; remaining bytes XOR'd with it yield the email.
function decodeCloudflareEmail(encoded: string): string {
  const bytes = encoded.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? [];
  if (bytes.length < 2) return "";
  const key = bytes[0];
  return bytes
    .slice(1)
    .map((b) => String.fromCharCode(b ^ key))
    .join("");
}

function extractEmails($: cheerio.CheerioAPI, visibleText: string): string[] {
  const collected: string[] = [];

  // 1. Plain text match
  collected.push(...(visibleText.match(EMAIL_RE) ?? []));

  // 2. mailto: href attributes
  $("a[href^='mailto:'], a[href^='MAILTO:']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const email = href.replace(/^mailto:/i, "").split("?")[0].trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) collected.push(email);
  });

  // 3. Cloudflare Email Obfuscation — data-cfemail attribute
  $("[data-cfemail]").each((_, el) => {
    const encoded = $(el).attr("data-cfemail") ?? "";
    if (encoded) {
      const email = decodeCloudflareEmail(encoded);
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) collected.push(email);
    }
  });

  return [...new Set(collected)];
}

function extractSocials($: cheerio.CheerioAPI): Record<string, string> {
  const result: Record<string, string> = {};
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    for (const [domain, name] of Object.entries(SOCIAL_PLATFORMS)) {
      if (href.includes(domain) && !result[name]) {
        result[name] = href;
      }
    }
  });
  return result;
}

function extractPhones(text: string): string[] {
  // libphonenumber-js finds all phone numbers in free text, validates them,
  // and formats to international standard (e.g. "+91 797 318 6756")
  try {
    return [
      ...new Set(
        findPhoneNumbersInText(text, "US")
          .filter((match) => match.number.isValid())
          .map((match) => match.number.formatInternational()),
      ),
    ];
  } catch {
    return [];
  }
}

export function extractPageData(html: string, url: string): PageData {
  // ── Cheerio pass: meta, title, headings, contact info ─────────────────────
  const $ = cheerio.load(html);

  const description = getMeta($, "description") || getMeta($, "og:description") || "";

  // Remove SVG before heading extraction — inline icons produce text artifacts
  $("svg").remove();

  const title =
    $("head title").first().text().trim() ||
    getMeta($, "og:title") ||
    $("h1").first().text().trim() ||
    url;

  const h1s: string[] = [];
  const h2s: string[] = [];
  $("h1").each((_, el) => {
    const t = $(el).text().trim();
    if (t) h1s.push(t);
  });
  $("h2").each((_, el) => {
    const t = $(el).text().trim();
    if (t) h2s.push(t);
  });

  // Extract contact info from visible text + href attributes
  // Clone body and strip scripts first so JSON-LD / tracking scripts don't pollute results
  const bodyClone = $("body").clone();
  bodyClone.find("script, style, noscript").remove();
  const visibleBodyText = bodyClone.text();
  const emails = extractEmails($, visibleBodyText);
  const phones = extractPhones(visibleBodyText);
  const socials = extractSocials($);

  // ── Readability pass: main content extraction ──────────────────────────────
  // Readability (Firefox Reader Mode algorithm) identifies the primary article
  // content and strips nav, sidebars, footers, ads automatically.
  let bodyText = "";
  try {
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();
    if (article?.textContent) {
      bodyText = article.textContent;
    }
  } catch {
    // Readability failed — fall back to cheerio element traversal
  }

  // Fallback: cheerio element traversal if Readability found nothing
  if (!bodyText) {
    $(
      "script, style, noscript, iframe, nav, header, footer, " +
        "[role='navigation'], [role='banner'], [role='contentinfo'], " +
        "[aria-hidden='true'], button, form, select, textarea",
    ).remove();

    const main = $("main, article, [role='main']").first();
    const contentEl = main.length ? main : $("body");

    const parts: string[] = [];
    contentEl.find("h1, h2, h3, h4, h5, h6, p, li").each((_, el) => {
      const tag = (el as { tagName?: string }).tagName?.toLowerCase();
      const text = $(el).text().trim();
      if (!text) return;
      parts.push(tag === "li" ? `- ${text}` : text);
    });
    bodyText = parts.length > 0 ? parts.join("\n") : contentEl.text();
  }

  // Clean up body text:
  // - Trim each line
  // - Drop very short lines (orphaned fragments)
  // - Drop pipe-heavy lines (nav breadcrumbs)
  // - Collapse multiple blank lines
  const cleanBodyText = bodyText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length < 3) return false;
      if ((line.match(/\|/g) ?? []).length >= 2) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { url, title, description, emails, phones, socials, h1s, h2s, bodyText: cleanBodyText };
}

