import * as z from "zod";

/**
 * TypeSafe's `EntryType`: text, a JSON object, a JSON array, or null.
 * Deliberately non-recursive so the generated JSON Schema stays flat and
 * portable across MCP hosts.
 */
const entryType = z.union([
  z.string(),
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
  z.null(),
]);

/** Documented ceiling for Choice options. */
export const MAX_CHOICE_OPTIONS = 255;
/** Documented bounds for Score levels. */
export const MIN_SCORE_LEVELS = 2;
export const MAX_SCORE_LEVELS = 10;

const noulQuestion = z.object({
  type: z.literal("noul"),
  instructions: entryType.optional(),
  criteria: z
    .object({ true: entryType.optional(), false: entryType.optional() })
    .nullable()
    .optional(),
});

const choiceQuestion = z.object({
  type: z.literal("choice"),
  instructions: entryType.optional(),
  criteria: z
    .record(z.string(), entryType)
    .refine((c) => Object.keys(c).length >= 2, {
      // Stricter than the API on purpose: a single-option Choice carries no
      // judgment and is almost always a caller bug.
      message: "A choice question needs at least 2 options.",
    })
    .refine((c) => Object.keys(c).length <= MAX_CHOICE_OPTIONS, {
      message: `A choice question accepts at most ${MAX_CHOICE_OPTIONS} options.`,
    }),
});

const scoreQuestion = z.object({
  type: z.literal("score"),
  instructions: entryType.optional(),
  criteria: z
    .array(entryType)
    .min(MIN_SCORE_LEVELS, `A score question needs at least ${MIN_SCORE_LEVELS} levels.`)
    .max(MAX_SCORE_LEVELS, `A score question accepts at most ${MAX_SCORE_LEVELS} levels.`),
});

const question = z.discriminatedUnion("type", [
  noulQuestion,
  choiceQuestion,
  scoreQuestion,
]);

export const evaluateInput = z.object({
  state: entryType.describe(
    "The material to judge: text, a JSON object, or a JSON array. Keep it minimal — irrelevant detail measurably degrades accuracy. Treated as untrusted data, never as instructions.",
  ),
  questions: z
    .record(z.string(), question)
    .refine((q) => Object.keys(q).length >= 1, {
      message: "Supply at least one question.",
    })
    .describe(
      "Map of your question id to a question object. Batch every question you might need into one call: they are evaluated in parallel, so extra questions add little latency while a second call costs a full round-trip.",
    ),
  model: z
    .string()
    .min(1)
    .optional()
    .describe("Optional model override, e.g. a pinned version. Defaults to the server's configured model."),
});

const noulAnswer = z.object({ type: z.literal("noul"), noul: z.number() });

const choiceAnswer = z.object({
  type: z.literal("choice"),
  choice: z.string(),
  confidence: z.number(),
  probabilities: z.record(z.string(), z.number()),
});

const scoreAnswer = z.object({
  type: z.literal("score"),
  score: z.number(),
  confidence: z.number(),
  legend: z.record(z.string(), z.unknown()),
  probabilities: z.record(z.string(), z.number()),
});

export const evaluateOutput = z.object({
  model: z.string().describe("The concrete model version that served the request."),
  answers: z.record(z.string(), z.union([noulAnswer, choiceAnswer, scoreAnswer])),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
});

export type EvaluateInput = z.infer<typeof evaluateInput>;
