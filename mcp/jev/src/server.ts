import { McpServer } from "@modelcontextprotocol/server";
import type { EntryType, Questions, SystemOneResult, TypeSafeClient } from "@typesafe-ai/sdk";
import { mapError, redact } from "./errors.js";
import { evaluateInput, evaluateOutput } from "./schemas.js";

export interface ServerOptions {
  client: Pick<TypeSafeClient, "systemOne">;
  /** Metadata-only observability sink. Must never receive state or answers. */
  onEvent?: (event: Record<string, unknown>) => void;
  version?: string;
}

const TOOL_DESCRIPTION = `Evaluate state against typed questions using TypeSafe's Jev System One model.

Jev returns bounded judgments with calibrated probabilities. It does NOT generate text or code.

Question types:
- choice: pick one option from 2-255 described options. Returns choice, probabilities, confidence.
- score:  place the state on an ordered scale of 2-10 described levels. Returns score (a weighted average, so it may fall between levels), probabilities, legend, confidence.
- noul:   probability that a yes/no proposition is true. Returns noul only - there is NO confidence field for noul.

Batch every question you might need into a single call: questions are evaluated in parallel, so extra questions cost little, while a second call costs a full round-trip. Questions in one call are independent.

Confidence describes how concentrated the probability distribution is, not whether the answer is correct. Apply thresholds and policy in your own code, and never let an answer alone authorise an irreversible action.`;

export function createServer({ client, onEvent, version = "1.0.0" }: ServerOptions): McpServer {
  const server = new McpServer(
    { name: "jev-agent-toolkit", version },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    "jev_evaluate",
    {
      title: "Evaluate with Jev",
      description: TOOL_DESCRIPTION,
      inputSchema: evaluateInput,
      outputSchema: evaluateOutput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ state, questions, model }) => {
      const started = Date.now();
      const questionIds = Object.keys(questions);

      try {
        // Both casts are safe: zod validated the shapes before we got here.
        const result = (await client.systemOne({
          state: state as EntryType,
          questions: questions as unknown as Questions,
          ...(model ? { model } : {}),
        })) as SystemOneResult<Questions>;

        onEvent?.({
          event: "jev_evaluate",
          ok: true,
          duration_ms: Date.now() - started,
          model: result.model,
          question_ids: questionIds,
          input_tokens: result.usage?.input_tokens,
          output_tokens: result.usage?.output_tokens,
        });

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        const mapped = mapError(error);

        onEvent?.({
          event: "jev_evaluate",
          ok: false,
          duration_ms: Date.now() - started,
          category: mapped.category,
          status: mapped.status,
          retryable: mapped.retryable,
          question_ids: questionIds,
        });

        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: redact(
                `Jev evaluation failed (${mapped.category}${mapped.status ? ` ${mapped.status}` : ""}): ${mapped.message}` +
                  (mapped.retryable ? " This is a transient failure; retrying later may succeed." : ""),
              ),
            },
          ],
        };
      }
    },
  );

  return server;
}
