export type LLMProvider = "anthropic" | "openai" | "google" | "ollama";
export type EmbeddingProvider = "openai" | "ollama";

export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export const LLM_CONFIG = {
  provider: (process.env.LLM_PROVIDER ?? "anthropic") as LLMProvider,
  model: process.env.LLM_MODEL as string | undefined,
};

export const EMBEDDING_CONFIG = {
  provider: (process.env.EMBEDDING_PROVIDER ?? "openai") as EmbeddingProvider,
  model: process.env.EMBEDDING_MODEL as string | undefined,
};

export const DEFAULT_LLM_MODELS: Record<LLMProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o-mini",
  google: "gemini-2.0-flash",
  ollama: "llama3.2",
};

export const DEFAULT_EMBEDDING_MODELS: Record<EmbeddingProvider, string> = {
  openai: "text-embedding-3-small",
  ollama: "nomic-embed-text",
};
