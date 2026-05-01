import { embed, embedMany } from "ai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { EmbeddingModel } from "ai";
import {
  EMBEDDING_CONFIG,
  DEFAULT_EMBEDDING_MODELS,
  OLLAMA_BASE_URL,
} from "./config";

const BATCH_SIZE = 100;

function getEmbeddingModel(): EmbeddingModel {
  const { provider, model } = EMBEDDING_CONFIG;
  const resolvedModel = model ?? DEFAULT_EMBEDDING_MODELS[provider];

  switch (provider) {
    case "openai":
      return openai.embedding(resolvedModel);
    case "google":
      return google.embedding(resolvedModel);
    case "ollama":
      return createOpenAI({
        baseURL: `${OLLAMA_BASE_URL}/v1`,
        apiKey: "ollama",
      }).embedding(resolvedModel);
    default:
      throw new Error(`Unsupported embedding provider: "${provider}"`);
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const model = getEmbeddingModel();
  const all: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const { embeddings } = await embedMany({
      model,
      values: texts.slice(i, i + BATCH_SIZE),
    });
    all.push(...embeddings);
  }

  return all;
}

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: getEmbeddingModel(), value: text });
  return embedding;
}
