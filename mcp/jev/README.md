# jev-agent-toolkit-mcp

Minimal MCP server exposing TypeSafe's Jev System One model as a single narrow
tool. Optional — the [portable skill](../../skills/jev-agent-toolkit/SKILL.md)
works without it.

## The tool

`jev_evaluate` mirrors the System One request shape:

```jsonc
{
  "state": "...",                  // string | object | array
  "questions": {                   // your ids -> question objects
    "intent": { "type": "choice", "instructions": "...", "criteria": { "a": "...", "b": "..." } },
    "urgent": { "type": "noul",   "instructions": "..." }
  },
  "model": "jev-latest"            // optional override
}
```

Returns `model`, `answers` (keyed by your question ids) and `usage`, as both
`structuredContent` and serialized text.

One tool rather than three. Per-primitive tools would duplicate validation and
break batching — the most valuable performance property Jev has.

## Build and run

```bash
npm install
npm test          # builds, then runs 33 tests
npm run build
```

Configure your host to run `node /abs/path/to/mcp/jev/dist/index.js`, or
`npx -y jev-agent-toolkit-mcp` once published. Verified configs for Claude Code,
Codex and Cursor: [`examples/mcp-configs/`](../../examples/mcp-configs/).

## Environment

| Variable | Purpose | Default |
|---|---|---|
| `TYPESAFE_API_KEY` | Required | — |
| `TYPESAFE_BASE_URL` | API base | `https://api.typesafe.ai` |
| `TYPESAFE_DEFAULT_MODEL` | Default model | `jev-latest` |
| `JEV_MCP_TIMEOUT_MS` | Per-request timeout | SDK default (10000) |
| `JEV_MCP_LOG_LEVEL` | `off`/`error`/`warn`/`info`/`debug` | `warn` |
| `JEV_MCP_ALLOW_BODY_LOGGING` | Required to permit `debug` | unset |

## Security properties

- **No URL parameter.** The destination is fixed at startup from
  `TYPESAFE_BASE_URL`; no tool argument can redirect it.
- **No shell, no downloads, no installs.** Those code paths do not exist.
- **The key never leaves.** Every outbound string passes through `redact()`, and
  401 bodies are never echoed.
- **Metadata-only logging**, to **stderr** only — stdout carries the MCP
  protocol stream.
- **`debug` is refused** unless `JEV_MCP_ALLOW_BODY_LOGGING=1`: the TypeSafe SDK
  logs request bodies at that level without redacting them.
- **Local validation first.** Invalid questions are rejected before any network
  call, so malformed input never reaches the API.

Full threat model: [`docs/security-model.md`](../../docs/security-model.md).

## Tests

`test/protocol.test.js` spawns the built server over stdio, speaks real MCP to
it with the official client, and points the TypeSafe SDK at a local mock
upstream. That covers handshake, tool discovery, request forwarding, batching,
model override, local validation, and 401 redaction — without an API key and
without spending anything.

It also connects twice on purpose: once with the client's default negotiation
(legacy) and once with `mode: 'auto'`, asserting the server answers
`server/discover` and negotiates **2026-07-28** while still serving 2025-era
clients. Those assertions fail if the entry point is ever reverted to a
hand-wired `StdioServerTransport`, which serves only the 2025 era.

## Layout

```
src/schemas.ts   Zod schemas -> JSON Schema + runtime validation
src/errors.ts    redaction and error categorisation
src/server.ts    the tool definition (testable, client injected)
src/index.ts     stdio entry point, config, safe logger
```
