import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*  Cringe tactics — the recognizable LinkedIn manipulation patterns.         */
/* -------------------------------------------------------------------------- */

export const TACTICS = [
  "broetry",
  "humblebrag",
  "hustle-porn",
  "faux-vulnerability",
  "engagement-bait",
  "buzzword-salad",
  "name-dropping",
  "fake-story",
  "virtue-signaling",
  "the-pivot",
] as const;

export const TacticSchema = z.enum(TACTICS);
export type Tactic = z.infer<typeof TacticSchema>;

/** Human-friendly metadata for each tactic — shared by API and UI. */
export const TACTIC_INFO: Record<
  Tactic,
  { label: string; blurb: string; emoji: string }
> = {
  broetry: {
    label: "Broetry",
    blurb: "Bro-poetry: one sentence per line to milk the algorithm's 'read more'.",
    emoji: "📝",
  },
  humblebrag: {
    label: "Humblebrag",
    blurb: "A boast disguised as humility or a complaint.",
    emoji: "😇",
  },
  "hustle-porn": {
    label: "Hustle Porn",
    blurb: "Glorifying overwork and 5am grind as moral virtue.",
    emoji: "💪",
  },
  "faux-vulnerability": {
    label: "Faux Vulnerability",
    blurb: "Performed emotion ('I cried...') engineered to land a flex.",
    emoji: "🥲",
  },
  "engagement-bait": {
    label: "Engagement Bait",
    blurb: "'Agree?', 'Comment YES', polls and cliffhangers to game reach.",
    emoji: "🎣",
  },
  "buzzword-salad": {
    label: "Buzzword Salad",
    blurb: "Synergy, leverage, disrupt, paradigm — words doing no work.",
    emoji: "🥗",
  },
  "name-dropping": {
    label: "Name Dropping",
    blurb: "Casually mentioning big companies or important people for status.",
    emoji: "🏷️",
  },
  "fake-story": {
    label: "Suspicious Story",
    blurb: "A too-perfect parable ('a janitor taught me about leadership').",
    emoji: "📖",
  },
  "virtue-signaling": {
    label: "Virtue Signaling",
    blurb: "Loudly advertising one's own goodness or values.",
    emoji: "😇",
  },
  "the-pivot": {
    label: "The Pivot",
    blurb: "The dramatic turn: '...and then everything changed. Here's why:'.",
    emoji: "↩️",
  },
};

/* -------------------------------------------------------------------------- */
/*  Feature 1: Decode a LinkedIn post → plain English.                        */
/* -------------------------------------------------------------------------- */

export const DecodeRequestSchema = z.object({
  text: z.string().min(1, "Paste a post to decode.").max(8000),
});
export type DecodeRequest = z.infer<typeof DecodeRequestSchema>;

export const DetectedTacticSchema = z.object({
  type: TacticSchema,
  /** 0–100 how strongly this tactic shows up. */
  severity: z.number().min(0).max(100),
  /** Short quote from the post that demonstrates the tactic. */
  evidence: z.string(),
  /** One sentence on what the author is actually doing here. */
  explanation: z.string(),
});
export type DetectedTactic = z.infer<typeof DetectedTacticSchema>;

export const DecodeResultSchema = z.object({
  /** The honest, deflated version of the post in plain language. */
  plainMeaning: z.string(),
  /** One-line "what they actually want you to know". */
  tldr: z.string(),
  /** 0–100 overall cringe rating. */
  cringeScore: z.number().min(0).max(100),
  /** A short verdict label, e.g. "Mild seasoning" → "Five-alarm broetry". */
  cringeLabel: z.string(),
  tactics: z.array(DetectedTacticSchema),
});
export type DecodeResult = z.infer<typeof DecodeResultSchema>;

/* -------------------------------------------------------------------------- */
/*  Feature 2: Generate a LinkedIn post ← plain sentence.                     */
/* -------------------------------------------------------------------------- */

export const STYLES = [
  "broetry",
  "thought-leader",
  "story-time",
  "hot-take",
  "gratitude",
  "hiring",
] as const;

export const StyleSchema = z.enum(STYLES);
export type Style = z.infer<typeof StyleSchema>;

export const STYLE_INFO: Record<Style, { label: string; blurb: string }> = {
  broetry: { label: "Broetry", blurb: "One line. At a time. For maximum reach." },
  "thought-leader": { label: "Thought Leader", blurb: "Sweeping lessons from a tiny anecdote." },
  "story-time": { label: "Story Time", blurb: "A little narrative with a business moral." },
  "hot-take": { label: "Hot Take", blurb: "Contrarian opinion engineered for debate." },
  gratitude: { label: "Gratitude Post", blurb: "Humbled and honored and blessed." },
  hiring: { label: "Hiring Announcement", blurb: "We're hiring rockstars / ninjas / family." },
};

/** 1 = barely seasoned, 5 = maximum cringe. */
export const IntensitySchema = z.number().int().min(1).max(5);
export type Intensity = z.infer<typeof IntensitySchema>;

export const GenerateRequestSchema = z.object({
  text: z.string().min(1, "Write a plain sentence to inflate.").max(4000),
  intensity: IntensitySchema.default(3),
  style: StyleSchema.default("broetry"),
  addHashtags: z.boolean().default(true),
  addEmojis: z.boolean().default(true),
  /** Pull in a real, current fact/stat via Google Search grounding. */
  useWebSearch: z.boolean().default(false),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const GroundingSourceSchema = z.object({
  title: z.string(),
  url: z.string(),
});
export type GroundingSource = z.infer<typeof GroundingSourceSchema>;

export const GenerateResultSchema = z.object({
  /** The finished LinkedIn-style post, ready to paste. */
  post: z.string(),
  styleUsed: StyleSchema,
  intensity: IntensitySchema,
  hashtags: z.array(z.string()).default([]),
  /** Which cringe tactics were deliberately applied. */
  tacticsApplied: z.array(TacticSchema).default([]),
  /** Sources, if web search grounding was used. */
  sources: z.array(GroundingSourceSchema).default([]),
});
export type GenerateResult = z.infer<typeof GenerateResultSchema>;

/* -------------------------------------------------------------------------- */
/*  API envelope                                                              */
/* -------------------------------------------------------------------------- */

export type ApiError = { error: string; details?: unknown };

export function cringeLabelFor(score: number): string {
  if (score < 15) return "Refreshingly human";
  if (score < 35) return "Mild seasoning";
  if (score < 55) return "Getting spicy";
  if (score < 75) return "Heavy broetry";
  if (score < 90) return "Peak LinkedIn";
  return "Five-alarm cringe";
}
