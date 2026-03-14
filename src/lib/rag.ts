import { embedText } from "./embeddings";
import { queryIndex } from "./pinecone";
import type { Source } from "@/types/chat.types";

const SCORE_THRESHOLD = 0.3;

export interface RagResult {
  context: string;
  sources: Source[];
}

export async function retrieveContext(
  query: string,
  userId: string,
  options: { fileIds?: string[]; topK?: number } = {},
): Promise<RagResult> {
  const { fileIds, topK = 4 } = options;

  const vector = await embedText(query);

  const filter =
    fileIds && fileIds.length > 0
      ? { fileId: { $in: fileIds } }
      : undefined;

  const result = await queryIndex(userId, vector, { topK, filter });
  const matches = result.matches ?? [];

  // Filter by relevance threshold
  const relevant = matches.filter((m) => (m.score ?? 0) >= SCORE_THRESHOLD);

  if (relevant.length === 0) {
    return {
      context: "No relevant content found in the uploaded documents.",
      sources: [],
    };
  }

  // Build sources — deduplicated by fileId (highest score per file)
  const sourceMap = new Map<string, Source>();
  for (const m of relevant) {
    const meta = m.metadata ?? {};
    const source: Source = {
      fileId: meta.fileId as string,
      fileName: meta.fileName as string,
      fileType: meta.fileType as string,
      folderPath: meta.folderPath as string,
      size: (meta.size as number) ?? 0,
      preview: meta.preview as string,
      chunkIndex: meta.chunkIndex as number,
      score: m.score!,
    };
    const existing = sourceMap.get(source.fileId);
    if (!existing || existing.score < source.score) {
      sourceMap.set(source.fileId, source);
    }
  }

  // Build context using content stored in Pinecone metadata
  // Falls back to preview for vectors upserted before this change
  const context = relevant
    .map((m, i) => {
      const content = (m.metadata?.content ?? m.metadata?.preview) as string;
      return `[${i + 1}] File: ${m.metadata?.fileName}\n${content}`;
    })
    .join("\n\n---\n\n");

  return {
    context,
    sources: Array.from(sourceMap.values()),
  };
}

export function buildSystemPrompt(context: string): string {
  return `You are a document assistant for Parsed. Answer questions ONLY using the document excerpts provided below. Do not use any outside knowledge.

If the answer is not in the excerpts, say exactly: "I couldn't find that in the uploaded documents."

Do NOT mention document names, file names, or cite sources in your answer — source cards are shown automatically in the UI.

RELEVANT DOCUMENT EXCERPTS:
${context}`;
}
