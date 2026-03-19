import OpenAI from "openai";
import { embedMany } from "ai";
import { google } from "@ai-sdk/google";
import {
  EMBEDDING_CONFIG,
  DEFAULT_EMBEDDING_MODELS,
  OLLAMA_BASE_URL,
} from "./config";

const BATCH_SIZE = 100;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { provider, model } = EMBEDDING_CONFIG;
  const resolvedModel = model ?? DEFAULT_EMBEDDING_MODELS[provider];

  if (provider === "google") {
    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const { embeddings: batchEmbeddings } = await embedMany({
        model: google.embedding(resolvedModel),
        values: batch,
        providerOptions: { google: { outputDimensionality: 768 } },
      });
      embeddings.push(...batchEmbeddings);
    }
    return embeddings;
  }

  // openai + ollama — both speak the OpenAI embeddings API
  const client =
    provider === "ollama"
      ? new OpenAI({ baseURL: `${OLLAMA_BASE_URL}/v1`, apiKey: "ollama" })
      : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await client.embeddings.create({
      model: resolvedModel,
      input: batch,
    });
    embeddings.push(...response.data.map((d) => d.embedding));
  }
  return embeddings;
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
