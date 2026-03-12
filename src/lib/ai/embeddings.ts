import OpenAI from "openai";
import {
  EMBEDDING_CONFIG,
  DEFAULT_EMBEDDING_MODELS,
  OLLAMA_BASE_URL,
} from "./config";

const BATCH_SIZE = 100;

function buildEmbeddingClient(): { client: OpenAI; model: string } {
  const { provider, model } = EMBEDDING_CONFIG;
  const resolvedModel = model ?? DEFAULT_EMBEDDING_MODELS[provider];

  switch (provider) {
    case "ollama":
      return {
        client: new OpenAI({
          baseURL: `${OLLAMA_BASE_URL}/v1`,
          apiKey: "ollama",
        }),
        model: resolvedModel,
      };

    case "openai":
    default:
      return {
        client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
        model: resolvedModel,
      };
  }
}

const { client, model: EMBEDDING_MODEL } = buildEmbeddingClient();

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
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
