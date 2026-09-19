#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { TypeSafeClient, type LogLevel, type Logger } from "@typesafe-ai/sdk";
import { redact } from "./errors.js";
import { createServer } from "./server.js";

/**
 * Everything must go to stderr. stdout carries the MCP protocol stream, and a
 * stray log line there corrupts it.
 */
function stderrLogger(): Logger {
  const write = (level: string, message: string, ...args: unknown[]) => {
    const extra = args.length ? ` ${redact(args.map((a) => JSON.stringify(a)).join(" "))}` : "";
    process.stderr.write(`[jev-mcp] ${level} ${redact(message)}${extra}\n`);
  };
  return {
    debug: (m, ...a) => write("debug", m, ...a),
    info: (m, ...a) => write("info", m, ...a),
    warn: (m, ...a) => write("warn", m, ...a),
    error: (m, ...a) => write("error", m, ...a),
  };
}

/**
 * The SDK redacts credential headers at `debug` but NOT request bodies, so
 * `debug` would write raw state to the log. Refuse it unless the operator has
 * explicitly opted in.
 */
function resolveLogLevel(logger: Logger): LogLevel {
  const requested = (process.env["JEV_MCP_LOG_LEVEL"] ?? "warn").toLowerCase();
  const allowed: LogLevel[] = ["debug", "info", "warn", "error", "off"];

  if (!allowed.includes(requested as LogLevel)) return "warn";

  if (requested === "debug" && process.env["JEV_MCP_ALLOW_BODY_LOGGING"] !== "1") {
    logger.warn(
      "JEV_MCP_LOG_LEVEL=debug ignored: it would log raw state and answers. Set JEV_MCP_ALLOW_BODY_LOGGING=1 to override.",
    );
    return "info";
  }

  return requested as LogLevel;
}

async function main(): Promise<void> {
  const logger = stderrLogger();

  const apiKey = process.env["TYPESAFE_API_KEY"];
  if (!apiKey) {
    logger.error("TYPESAFE_API_KEY is not set. Configure it in the MCP server's environment.");
    process.exit(1);
  }

  if (apiKey.length < 16) {
    logger.warn(
      "TYPESAFE_API_KEY is unusually short. Redaction of it in logs and error messages is less reliable for short values — check the key is complete.",
    );
  }

  const timeout = Number.parseInt(process.env["JEV_MCP_TIMEOUT_MS"] ?? "", 10);

  let client: TypeSafeClient;
  try {
    client = new TypeSafeClient({
      logger,
      logLevel: resolveLogLevel(logger),
      ...(Number.isFinite(timeout) && timeout > 0 ? { timeout } : {}),
    });
  } catch (error) {
    logger.error(`Could not initialise the TypeSafe client: ${redact(String(error))}`);
    process.exit(1);
  }

  // serveStdio owns the era decision for the connection: it negotiates the
  // modern protocol revision and still serves 2025-era clients from the same
  // factory. Hand-wiring a StdioServerTransport instead would pin every
  // connection to the 2025 era, where server/discover does not exist.
  serveStdio(
    () =>
      createServer({
        client,
        // Metadata only. Never state, questions or answers.
        onEvent: (event) => logger.info(JSON.stringify(event)),
      }),
    { onerror: (error) => logger.error(`transport error: ${redact(String(error))}`) },
  );

  logger.info(`jev-agent-toolkit MCP server ready (model default: ${client.defaultModel})`);
}

main().catch((error) => {
  process.stderr.write(`[jev-mcp] fatal ${redact(String(error))}\n`);
  process.exit(1);
});
