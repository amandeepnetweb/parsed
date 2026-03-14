import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export function getPineconeIndex(userId: string) {
  return pc
    .index(process.env.PINECONE_INDEX_NAME ?? "parsed")
    .namespace(userId);
}

export interface ChunkMetadata {
  fileId: string;
  fileName: string;
  fileType: string;
  folderId: string; // empty string when no folder
  folderPath: string;
  chunkIndex: number;
  tags: string[];
  size: number;
  preview: string;
  content: string;
  [key: string]: string | number | boolean | string[];
}

export async function upsertChunks(
  userId: string,
  chunks: Array<{ id: string; values: number[]; metadata: ChunkMetadata }>,
): Promise<void> {
  const index = getPineconeIndex(userId);
  // Upsert in batches of 100
  const BATCH = 100;
  for (let i = 0; i < chunks.length; i += BATCH) {
    await index.upsert({ records: chunks.slice(i, i + BATCH) });
  }
}

export async function queryIndex(
  userId: string,
  vector: number[],
  options: { topK?: number; filter?: Record<string, unknown> } = {},
) {
  const { topK = 6, filter } = options;
  const index = getPineconeIndex(userId);
  return index.query({
    vector,
    topK,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
  });
}

export async function deleteChunksByIds(
  userId: string,
  pineconeIds: string[],
): Promise<void> {
  if (pineconeIds.length === 0) return;
  const index = getPineconeIndex(userId);
  const BATCH = 100;
  for (let i = 0; i < pineconeIds.length; i += BATCH) {
    await index.deleteMany(pineconeIds.slice(i, i + BATCH));
  }
}
