import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import {
  LLM_CONFIG,
  DEFAULT_LLM_MODELS,
  OLLAMA_BASE_URL,
} from "./config";

export function getLLMModel(): LanguageModel {
  const { provider, model } = LLM_CONFIG;
  const resolvedModel = model ?? DEFAULT_LLM_MODELS[provider];

  switch (provider) {
    case "anthropic":
      return anthropic(resolvedModel);

    case "openai":
      return createOpenAI()(resolvedModel);

    case "google":
      return google(resolvedModel);

    case "ollama": {
      const ollamaProvider = createOpenAI({
        baseURL: `${OLLAMA_BASE_URL}/v1`,
        apiKey: "ollama",
      });
      return ollamaProvider(resolvedModel);
    }

    default:
      throw new Error(
        `Unsupported LLM provider: "${provider}". Valid options: anthropic, openai, google, ollama`,
      );
  }
}
