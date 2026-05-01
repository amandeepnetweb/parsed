import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./database";
import { fileChunks, files } from "@/db/schema";
import { embedText } from "./embeddings";
import { queryIndex } from "./pinecone";

// How many candidates each search arm contributes before merging
const VECTOR_TOP_K = 15;
const KEYWORD_TOP_K = 10;

// RRF constant — higher value reduces the impact of rank differences
const RRF_K = 60;

export interface HybridMatch {
  pineconeId: string;
  content: string;
  fileId: string;
  fileName: string;
  fileType: string;
  size: number;
  chunkIndex: number;
  folderPath: string;
  rrfScore: number;
  pageUrl?: string; // set for web-crawl chunks — the specific crawled page
}

// ── Keyword search via PostgreSQL full-text ───────────────────────────────────

async function keywordSearch(
  query: string,
  userId: string,
  fileIds: string[] | undefined,
  limit: number,
): Promise<HybridMatch[]> {
  if (!query.trim()) return [];

  const rows = await db
    .select({
      pineconeId: fileChunks.pineconeId,
      content: fileChunks.content,
      fileId: fileChunks.fileId,
      fileName: files.originalName,
      fileType: files.type,
      size: files.size,
      chunkIndex: fileChunks.chunkIndex,
    })
    .from(fileChunks)
    .innerJoin(files, eq(fileChunks.fileId, files.id))
    .where(
      and(
        eq(files.userId, userId),
        fileIds && fileIds.length > 0 ? inArray(fileChunks.fileId, fileIds) : undefined,
        sql`to_tsvector('english', ${fileChunks.content}) @@ plainto_tsquery('english', ${query})`,
      ),
    )
    .orderBy(
      sql`ts_rank(
        to_tsvector('english', ${fileChunks.content}),
        plainto_tsquery('english', ${query})
      ) DESC`,
    )
    .limit(limit);

  return rows.map((r) => ({ ...r, folderPath: "", rrfScore: 0 }));
}

// ── Reciprocal Rank Fusion ────────────────────────────────────────────────────

function reciprocalRankFusion(
  vectorIds: string[],
  keywordIds: string[],
): Map<string, number> {
  const scores = new Map<string, number>();

  const add = (id: string, rank: number) => {
    scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + rank + 1));
  };

  vectorIds.forEach((id, rank) => add(id, rank));
  keywordIds.forEach((id, rank) => add(id, rank));

  return scores;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Retrieves relevant chunks using both vector similarity (Pinecone) and
 * full-text keyword search (PostgreSQL), then merges results with
 * Reciprocal Rank Fusion. Vector-only queries benefit from semantic
 * understanding; keyword-only queries benefit from exact term matching.
 * Together they handle both.
 */
export async function hybridSearch(
  query: string,
  userId: string,
  options: { fileIds?: string[]; topK?: number } = {},
): Promise<HybridMatch[]> {
  const { fileIds, topK = VECTOR_TOP_K } = options;

  const filter =
    fileIds && fileIds.length > 0 ? { fileId: { $in: fileIds } } : undefined;

  // Run both searches in parallel
  const [vectorResult, keywordMatches] = await Promise.all([
    embedText(query).then((vector) =>
      queryIndex(userId, vector, { topK: VECTOR_TOP_K, filter }),
    ),
    keywordSearch(query, userId, fileIds, KEYWORD_TOP_K),
  ]);

  const vectorMatches = vectorResult.matches ?? [];

  // Build lookup maps for O(1) access during merge
  const vectorById = new Map(vectorMatches.map((m) => [m.id, m]));
  const keywordById = new Map(keywordMatches.map((m) => [m.pineconeId, m]));

  // Merge rankings with RRF
  const rrfScores = reciprocalRankFusion(
    vectorMatches.map((m) => m.id),
    keywordMatches.map((m) => m.pineconeId),
  );

  // Sort all unique IDs by combined RRF score
  const rankedIds = Array.from(rrfScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, topK);

  const results: HybridMatch[] = [];

  for (const id of rankedIds) {
    const vec = vectorById.get(id);
    const kw = keywordById.get(id);

    if (vec?.metadata) {
      // Vector result — full metadata available from Pinecone
      results.push({
        pineconeId: id,
        content: (vec.metadata.content as string) ?? "",
        fileId: vec.metadata.fileId as string,
        fileName: vec.metadata.fileName as string,
        fileType: vec.metadata.fileType as string,
        size: (vec.metadata.size as number) ?? 0,
        chunkIndex: vec.metadata.chunkIndex as number,
        folderPath: (vec.metadata.folderPath as string) ?? "",
        pageUrl: (vec.metadata.pageUrl as string) ?? undefined,
        rrfScore: rrfScores.get(id)!,
      });
    } else if (kw) {
      // Keyword-only result — metadata from DB join (no pageUrl available)
      results.push({ ...kw, rrfScore: rrfScores.get(id)! });
    }
  }

  return results;
}
