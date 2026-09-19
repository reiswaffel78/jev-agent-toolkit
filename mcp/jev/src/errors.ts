import {
  APIConnectionError,
  APIError,
  APITimeoutError,
  APIUserAbortError,
  AuthenticationError,
  BadRequestError,
  InternalServerError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  TypeSafeError,
  UnprocessableEntityError,
} from "@typesafe-ai/sdk";

export type ErrorCategory =
  | "authentication"
  | "permission"
  | "not_found"
  | "validation"
  | "rate_limit"
  | "timeout"
  | "connection"
  | "upstream"
  | "cancelled"
  | "internal";

export interface MappedError {
  category: ErrorCategory;
  message: string;
  retryable: boolean;
  status?: number;
  requestId?: string;
}

/** Shortest key value that exact-match redaction will substitute. */
export const MIN_REDACTABLE_KEY_LENGTH = 4;

/**
 * Strip anything that could carry the API key out of text that is about to
 * leave the process. Upstream error bodies are echoed back to the host, so
 * this runs on every outbound string.
 *
 * Pattern-based redaction is defence in depth, not a guarantee: the exact-match
 * branch is the reliable one, and the regexes below only cover known token
 * shapes.
 */
export function redact(text: string): string {
  let out = text;
  const key = process.env["TYPESAFE_API_KEY"];
  // Low threshold on purpose: over-redacting a pathologically short key is a
  // far better failure than leaking it. The entry point warns about such keys.
  if (key && key.length >= MIN_REDACTABLE_KEY_LENGTH) out = out.split(key).join("[REDACTED]");
  // Secondary net for known token shapes, in case the exact value is absent
  // from the environment (e.g. rotated after startup).
  return out
    .replace(/\b(sk|tsk|key|apikey)[-_][A-Za-z0-9_-]{8,}/gi, "[REDACTED]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]{8,}=*/gi, "$1[REDACTED]");
}

export function mapError(error: unknown): MappedError {
  if (error instanceof AuthenticationError) {
    return {
      category: "authentication",
      // Deliberately does not echo the upstream body: 401 responses are the
      // likeliest place for a credential to be reflected back.
      message:
        "TypeSafe rejected the credentials. Check that TYPESAFE_API_KEY is set correctly in the MCP server's environment.",
      retryable: false,
      status: error.status,
      ...(error.requestId ? { requestId: error.requestId } : {}),
    };
  }

  if (error instanceof RateLimitError) {
    const wait = error.retryAfterMs;
    return {
      category: "rate_limit",
      message: `TypeSafe rate limit exceeded.${wait ? ` Retry after ~${Math.ceil(wait / 1000)}s.` : ""}`,
      retryable: true,
      status: error.status,
      ...(error.requestId ? { requestId: error.requestId } : {}),
    };
  }

  if (error instanceof APITimeoutError) {
    return {
      category: "timeout",
      message: `The request to TypeSafe timed out after ${error.timeoutMs}ms.`,
      retryable: true,
    };
  }

  if (error instanceof APIUserAbortError) {
    return { category: "cancelled", message: "The request was cancelled.", retryable: false };
  }

  if (error instanceof APIConnectionError) {
    return {
      category: "connection",
      message: `Could not reach the TypeSafe API: ${redact(error.message)}`,
      retryable: true,
    };
  }

  if (error instanceof APIError) {
    const category: ErrorCategory =
      error instanceof UnprocessableEntityError || error instanceof BadRequestError
        ? "validation"
        : error instanceof PermissionDeniedError
          ? "permission"
          : error instanceof NotFoundError
            ? "not_found"
            : error instanceof InternalServerError
              ? "upstream"
              : "upstream";

    return {
      category,
      message: redact(error.message),
      retryable: error.status >= 500,
      status: error.status,
      ...(error.requestId ? { requestId: error.requestId } : {}),
    };
  }

  if (error instanceof TypeSafeError) {
    return { category: "validation", message: redact(error.message), retryable: false };
  }

  return {
    category: "internal",
    message: redact(error instanceof Error ? error.message : String(error)),
    retryable: false,
  };
}
