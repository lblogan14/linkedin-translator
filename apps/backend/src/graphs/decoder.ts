import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import {
  cringeLabelFor,
  DecodeResultSchema,
  type DecodeResult,
} from "@linkedin-translator/shared";
import { makeModel } from "../llm.js";
import { DECODER_SYSTEM, decoderUserPrompt } from "../prompts.js";

// The LLM returns everything except the derived cringeLabel (we compute that
// deterministically from the score so it always matches our scale).
const DecodeLlmSchema = DecodeResultSchema.omit({ cringeLabel: true });

const DecoderState = Annotation.Root({
  text: Annotation<string>(),
  result: Annotation<DecodeResult | null>(),
});

async function analyze(state: typeof DecoderState.State) {
  const model = (await makeModel({ temperature: 0.4 })).withStructuredOutput<
    z.infer<typeof DecodeLlmSchema>
  >(DecodeLlmSchema as unknown as z.ZodType<z.infer<typeof DecodeLlmSchema>>, {
    name: "decoded_post",
  });

  const raw = await model.invoke([
    new SystemMessage(DECODER_SYSTEM),
    new HumanMessage(decoderUserPrompt(state.text)),
  ]);

  // Keep only genuinely-present tactics and clamp the score.
  const score = Math.max(0, Math.min(100, Math.round(raw.cringeScore)));
  const result: DecodeResult = {
    ...raw,
    cringeScore: score,
    cringeLabel: cringeLabelFor(score),
    tactics: raw.tactics.filter((t) => t.severity >= 15),
  };
  return { result };
}

const compiled = new StateGraph(DecoderState)
  .addNode("analyze", analyze, { retryPolicy: { maxAttempts: 2 } })
  .addEdge(START, "analyze")
  .addEdge("analyze", END)
  .compile();

export async function decodePost(text: string): Promise<DecodeResult> {
  const out = await compiled.invoke({ text });
  if (!out.result) throw new Error("Decoder produced no result.");
  return out.result;
}
