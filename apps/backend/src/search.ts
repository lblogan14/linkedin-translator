import type { GroundingSource } from "@linkedin-translator/shared";
import { makeModel } from "./llm.js";
import { env } from "./env.js";

/**
 * Best-effort web-search grounding using the provider's native search tool.
 * Only providers that expose a built-in search tool support this (see
 * `env.enableWebSearch`); for everything else we degrade gracefully and return
 * nothing rather than failing the whole request.
 */
export async function groundWithSearch(
  topic: string,
): Promise<{ context: string; sources: GroundingSource[] }> {
  if (!env.enableWebSearch) return { context: "", sources: [] };

  try {
    const model = await makeModel({ temperature: 0.2 });
    // The "google" provider exposes web search as a built-in tool. The model
    // wrapper passes unknown tool specs straight through to the provider API.
    const searchTool =
      env.provider === "google" ? [{ googleSearch: {} } as never] : [];
    if (searchTool.length === 0) return { context: "", sources: [] };

    const grounded = model.bindTools?.(searchTool) ?? model;

    const res = await grounded.invoke(
      `Give me one or two concrete, current, citable facts or statistics relevant to: "${topic}". ` +
        `Reply with just the facts in 1-3 short sentences.`,
    );

    const context =
      typeof res.content === "string"
        ? res.content
        : Array.isArray(res.content)
          ? res.content
              .map((c) => (typeof c === "string" ? c : "text" in c ? c.text : ""))
              .join(" ")
          : "";

    const sources = extractSources(res);
    return { context: context.trim(), sources };
  } catch {
    // Grounding unavailable (provider/key without search, network, etc.) — skip.
    return { context: "", sources: [] };
  }
}

/** Dig grounding citations out of the response metadata, defensively. */
function extractSources(res: unknown): GroundingSource[] {
  const meta =
    (res as { response_metadata?: Record<string, unknown> })?.response_metadata ??
    (res as { additional_kwargs?: Record<string, unknown> })?.additional_kwargs ??
    {};
  const grounding =
    (meta as Record<string, unknown>)["groundingMetadata"] ??
    (meta as Record<string, unknown>)["grounding_metadata"];
  const chunks = (grounding as { groundingChunks?: unknown[] })?.groundingChunks;
  if (!Array.isArray(chunks)) return [];

  const out: GroundingSource[] = [];
  for (const chunk of chunks) {
    const web = (chunk as { web?: { uri?: string; title?: string } })?.web;
    if (web?.uri) {
      out.push({ url: web.uri, title: web.title || web.uri });
    }
  }
  return out.slice(0, 5);
}
