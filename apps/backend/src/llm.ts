import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { env } from "./env.js";

/**
 * Build a chat model for the configured provider. Providers are loaded lazily
 * so only the selected one needs to be importable at runtime. All providers
 * return a LangChain `BaseChatModel`, so the graphs stay provider-agnostic.
 *
 * `temperature` lets callers pick deterministic analysis vs. playful generation.
 */
export async function makeModel(
  opts: { temperature?: number } = {},
): Promise<BaseChatModel> {
  const temperature = opts.temperature ?? 0.7;
  const { apiKey, model, maxOutputTokens } = env;

  switch (env.provider) {
    case "google": {
      const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
      return new ChatGoogleGenerativeAI({
        apiKey,
        model,
        temperature,
        maxOutputTokens,
      });
    }
    case "openai": {
      const { ChatOpenAI } = await import("@langchain/openai");
      return new ChatOpenAI({
        apiKey,
        model,
        temperature,
        maxTokens: maxOutputTokens,
      });
    }
    case "anthropic": {
      const { ChatAnthropic } = await import("@langchain/anthropic");
      return new ChatAnthropic({
        apiKey,
        model,
        temperature,
        maxTokens: maxOutputTokens,
      });
    }
  }
}
