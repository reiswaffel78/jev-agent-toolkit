# MCP host configurations

Ready-to-adapt configs for the optional Jev MCP bridge. All three were verified
against the hosts' official documentation on 2026-09-19.

| File | Host | Destination |
|---|---|---|
| `claude-code.mcp.json` | Claude Code | `.mcp.json` in the project root |
| `codex.config.toml` | OpenAI Codex | `~/.codex/config.toml` or `.codex/config.toml` |
| `cursor.mcp.json` | Cursor | `.cursor/mcp.json` |

The `_comment` keys in the JSON files are notes for you — remove them or leave
them; MCP hosts ignore unknown keys.

## The one thing that catches everybody

Environment interpolation syntax differs between hosts:

| Host | Syntax |
|---|---|
| Claude Code | `${TYPESAFE_API_KEY}` |
| Cursor | `${env:TYPESAFE_API_KEY}` |
| Codex | `env_vars = ["TYPESAFE_API_KEY"]` |

Copying a config between hosts without adjusting this resolves the variable to
an empty string, and the bridge exits reporting a missing key. That error is
correct, but the cause is not where people look first.

## CLI alternatives

```bash
claude mcp add --transport stdio --env TYPESAFE_API_KEY=$TYPESAFE_API_KEY \
  jev -- npx -y jev-agent-toolkit-mcp

codex mcp add jev --env TYPESAFE_API_KEY=$TYPESAFE_API_KEY \
  -- npx -y jev-agent-toolkit-mcp
```

## Before you commit

These files are normally committed. **Never put a real key in them.** Keep
`TYPESAFE_API_KEY` in your environment or a git-ignored `.env`.

## Running the bridge from this repo

Until the package is published, point the host at your local build instead of
`npx`:

```bash
cd mcp/jev && npm install && npm run build
```

```json
{ "command": "node", "args": ["/absolute/path/to/jev-agent-toolkit/mcp/jev/dist/index.js"] }
```

## Bridge environment variables

| Variable | Purpose | Default |
|---|---|---|
| `TYPESAFE_API_KEY` | Required | — |
| `TYPESAFE_BASE_URL` | API base override | `https://api.typesafe.ai` |
| `TYPESAFE_DEFAULT_MODEL` | Default model | `jev-latest` |
| `JEV_MCP_TIMEOUT_MS` | Per-request timeout | SDK default (10000) |
| `JEV_MCP_LOG_LEVEL` | `off`/`error`/`warn`/`info`/`debug` | `warn` |
| `JEV_MCP_ALLOW_BODY_LOGGING` | Required to permit `debug`, which logs raw state | unset |

`debug` is downgraded to `info` unless `JEV_MCP_ALLOW_BODY_LOGGING=1`, because
the TypeSafe SDK logs request bodies at that level without redacting them.
