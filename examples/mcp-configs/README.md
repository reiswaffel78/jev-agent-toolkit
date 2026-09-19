# MCP host configurations

Configs for the optional Jev MCP bridge, in two sets:

- **CURRENT — local build.** Works today.
- **FUTURE — npm package.** `jev-agent-toolkit-mcp` is **not yet published to
  npm**, so these configs fail until it is.

The configs were checked against each host's documented schema on 2026-09-19.
They have not been runtime-tested inside Claude Code, Codex or Cursor; the
bridge itself is tested with the official MCP client (`mcp/jev/test/`).

## CURRENT — local build

Build the bridge once:

```bash
git clone https://github.com/reiswaffel78/jev-agent-toolkit.git
cd jev-agent-toolkit/mcp/jev
npm install
npm run build
```

Then use the config for your host, replacing
`/absolute/path/to/jev-agent-toolkit` with where you cloned the repository:

| File | Host | Destination |
|---|---|---|
| `claude-code.local.mcp.json` | Claude Code | `.mcp.json` in your project root |
| `codex.local.config.toml` | OpenAI Codex | `~/.codex/config.toml` or `.codex/config.toml` |
| `cursor.local.mcp.json` | Cursor | `.cursor/mcp.json` |

Or register it from the command line:

```bash
claude mcp add --transport stdio --env TYPESAFE_API_KEY=$TYPESAFE_API_KEY \
  jev -- node /absolute/path/to/jev-agent-toolkit/mcp/jev/dist/index.js

codex mcp add jev --env TYPESAFE_API_KEY=$TYPESAFE_API_KEY \
  -- node /absolute/path/to/jev-agent-toolkit/mcp/jev/dist/index.js
```

Note that these CLI forms expand the key in your shell and pass its *value* to
the host, which then stores it in its own config. The file-based configs above
keep only a reference to the environment variable.

### Why an absolute path

- These configs live in **your** project, not in this repository. The
  project-relative variables the hosts offer (`${CLAUDE_PROJECT_DIR}` in
  Claude Code, `${workspaceFolder}` in Cursor) resolve to your project root, not
  to where the bridge was built.
- None of the three hosts documents the working directory a stdio server starts
  in, so a bare relative `mcp/jev/dist/index.js` is not reliable.
- Codex documents no path variables at all.

On Windows, write the path with forward slashes (`C:/path/to/...`) or escape the
backslashes inside JSON.

## FUTURE — npm package

> **Not usable yet.** These configs launch `npx -y jev-agent-toolkit-mcp`, which
> only works once the package has been published to npm. Until then, use the
> CURRENT configs above.

| File | Host | Destination |
|---|---|---|
| `claude-code.npm.mcp.json` | Claude Code | `.mcp.json` in your project root |
| `codex.npm.config.toml` | OpenAI Codex | `~/.codex/config.toml` or `.codex/config.toml` |
| `cursor.npm.mcp.json` | Cursor | `.cursor/mcp.json` |

After publication, the only difference from the CURRENT configs is the launch
command: `npx -y jev-agent-toolkit-mcp` in place of `node` plus the absolute path.

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

## Before you use or commit a config

- **Remove the `_comment` key** from the JSON files. It is a note for you; the
  hosts do not document whether they tolerate unknown keys.
- These files are normally committed. **Never put a real key in them.** Keep
  `TYPESAFE_API_KEY` in your environment or a git-ignored `.env`.

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
