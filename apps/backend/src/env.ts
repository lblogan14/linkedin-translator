import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load the repo-root .env regardless of where the process is launched from.
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../../../.env") });
loadEnv(); // also pick up a local .env / real process env (no-op if absent)

/** Supported LLM providers. The app is provider-agnostic — pick one via env. */
export const PROVIDERS = ["google", "openai", "anthropic"] as const;
export type Provider = (typeof PROVIDERS)[number];

/** Per-provider sensible defaults: which API-key var, and a default model. */
const PROVIDER_DEFAULTS: Record<
  Provider,
  { apiKeyVar: string; defaultModel: string; nativeWebSearch: boolean }
> = {
  google: {
    apiKeyVar: "GOOGLE_API_KEY",
    defaultModel: "gemini-2.5-flash",
    nativeWebSearch: true,
  },
  openai: {
    apiKeyVar: "OPENAI_API_KEY",
    defaultModel: "gpt-4o-mini",
    nativeWebSearch: false,
  },
  anthropic: {
    apiKeyVar: "ANTHROPIC_API_KEY",
    defaultModel: "claude-haiku-4-5-20251001",
    nativeWebSearch: false,
  },
};

function readProvider(): Provider {
  const raw = (process.env.LLM_PROVIDER ?? "google").trim().toLowerCase();
  if (!PROVIDERS.includes(raw as Provider)) {
    throw new Error(
      `Unknown LLM_PROVIDER "${raw}". Supported: ${PROVIDERS.join(", ")}.`,
    );
  }
  return raw as Provider;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value.trim();
}

const provider = readProvider();
const defaults = PROVIDER_DEFAULTS[provider];

const requestedWebSearch =
  (process.env.ENABLE_WEB_SEARCH ?? "true").toLowerCase() !== "false";

export const env = {
  provider,
  /** API key for the selected provider. */
  apiKey: required(defaults.apiKeyVar),
  /** Model id — override with LLM_MODEL, else the provider default. */
  model: process.env.LLM_MODEL?.trim() || defaults.defaultModel,
  port: Number(process.env.PORT ?? 8787),
  maxOutputTokens: Number(process.env.LLM_MAX_TOKENS ?? 2048),
  /** Web-search grounding only runs when both requested AND the provider supports it. */
  enableWebSearch: requestedWebSearch && defaults.nativeWebSearch,
};

export type Env = typeof env;
