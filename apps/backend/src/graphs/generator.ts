import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import {
  GenerateResultSchema,
  TacticSchema,
  type GenerateRequest,
  type GenerateResult,
  type GroundingSource,
} from "@linkedin-translator/shared";
import { makeModel } from "../llm.js";
import { env } from "../env.js";
import { groundWithSearch } from "../search.js";
import {
  GENERATOR_SYSTEM,
  generatorUserPrompt,
  LABELER_SYSTEM,
  labelerUserPrompt,
} from "../prompts.js";

const LabelSchema = z.object({
  tacticsApplied: z.array(TacticSchema),
  hashtags: z.array(z.string()),
});

const GeneratorState = Annotation.Root({
  request: Annotation<GenerateRequest>(),
  enrichment: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  sources: Annotation<GroundingSource[]>({ reducer: (_, b) => b, default: () => [] }),
  post: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  result: Annotation<GenerateResult | null>({ reducer: (_, b) => b, default: () => null }),
});

type State = typeof GeneratorState.State;

/** Optional node: pull a real, current fact via Google Search grounding. */
async function enrich(state: State) {
  const { context, sources } = await groundWithSearch(state.request.text);
  return { enrichment: context, sources };
}

/** Draft the LinkedIn post in the requested style/intensity. */
async function draft(state: State) {
  const model = await makeModel({ temperature: 0.9 });
  const res = await model.invoke([
    new SystemMessage(GENERATOR_SYSTEM),
    new HumanMessage(generatorUserPrompt(state.request, state.enrichment)),
  ]);
  return { post: contentToString(res.content).trim() };
}

/**
 * Reflection pass: a fresh critic nudges the draft toward the requested
 * intensity (punchier hook, tighter line breaks) without changing the meaning.
 * This is the loop that makes the LangGraph worthwhile vs. a single call.
 */
async function refine(state: State) {
  const model = await makeModel({ temperature: 0.8 });
  const res = await model.invoke([
    new SystemMessage(GENERATOR_SYSTEM),
    new HumanMessage(
      `Here is a draft LinkedIn post at intensity ${state.request.intensity}/5:\n\n"""\n${state.post}\n"""\n\n` +
        `Tighten it: make the first line a stronger scroll-stopping hook, keep the line breaks crisp, ` +
        `and ensure it matches intensity ${state.request.intensity}/5. Keep the same core message and constraints. ` +
        `Return only the improved post text.`,
    ),
  ]);
  return { post: contentToString(res.content).trim() };
}

/** Final structured pass: label which tactics ended up in the post. */
async function label(state: State) {
  const model = (await makeModel({ temperature: 0 })).withStructuredOutput<
    z.infer<typeof LabelSchema>
  >(LabelSchema as unknown as z.ZodType<z.infer<typeof LabelSchema>>, {
    name: "post_labels",
  });
  let labels: z.infer<typeof LabelSchema> = { tacticsApplied: [], hashtags: [] };
  try {
    labels = await model.invoke([
      new SystemMessage(LABELER_SYSTEM),
      new HumanMessage(labelerUserPrompt(state.post)),
    ]);
  } catch {
    // Labeling is non-essential — fall back to scraping hashtags from text.
    labels.hashtags = [...state.post.matchAll(/#[\p{L}\d_]+/gu)].map((m) => m[0]);
  }

  const result = GenerateResultSchema.parse({
    post: state.post,
    styleUsed: state.request.style,
    intensity: state.request.intensity,
    hashtags: labels.hashtags,
    tacticsApplied: labels.tacticsApplied,
    sources: state.sources,
  });
  return { result };
}

/** Route from START: enrich first only when search is requested and enabled. */
function entryRoute(state: State): "enrich" | "draft" {
  return state.request.useWebSearch && env.enableWebSearch ? "enrich" : "draft";
}

const compiled = new StateGraph(GeneratorState)
  .addNode("enrich", enrich, { retryPolicy: { maxAttempts: 2 } })
  .addNode("draft", draft, { retryPolicy: { maxAttempts: 2 } })
  .addNode("refine", refine, { retryPolicy: { maxAttempts: 2 } })
  .addNode("label", label)
  .addConditionalEdges(START, entryRoute, ["enrich", "draft"])
  .addEdge("enrich", "draft")
  .addEdge("draft", "refine")
  .addEdge("refine", "label")
  .addEdge("label", END)
  .compile();

export async function generatePost(req: GenerateRequest): Promise<GenerateResult> {
  const out = await compiled.invoke({ request: req });
  if (!out.result) throw new Error("Generator produced no result.");
  return out.result;
}

function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === "string" ? c : c && "text" in c ? (c as { text: string }).text : ""))
      .join("");
  }
  return "";
}
