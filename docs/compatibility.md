# Compatibility

Verified against official documentation on **2026-09-19**. These ecosystems move
quickly — re-check before relying on a row.

## Skill installation

| Host | Native SKILL.md | Discovery paths |
|---|---|---|
| Claude Code | Yes | `~/.claude/skills/`, `.claude/skills/`, plugin skills |
| OpenAI Codex | Yes | `$CWD/.agents/skills`, `$REPO_ROOT/.agents/skills`, `$HOME/.agents/skills`, `/etc/codex/skills` |
| Cursor | Yes | `.agents/skills/`, `.cursor/skills/`, `~/.agents/skills/`, `~/.cursor/skills/` — and it also reads `.claude/skills/` and `.codex/skills/` |
| Other Agent Skills clients | Varies | `.agents/skills/` is the convention-neutral path |

All three primary targets build on the [agentskills.io](https://agentskills.io)
standard. `npx skills add reiswaffel78/jev-agent-toolkit` adapts to each host's
own convention.

## Capabilities

| Capability | Claude Code | Codex | Cursor | Generic |
|---|---|---|---|---|
| Portable Jev guidance | Yes | Yes | Yes | Yes |
| Direct Jev API / SDK | Yes | Yes | Yes | Needs code or HTTP execution |
| Jev MCP bridge | Yes | Yes | Yes | Needs host MCP support |
| Coding and builds | Yes | Yes | Yes | Needs file and shell access |
| Browser research | Yes | Yes | Yes | Capability-dependent |
| Generic MCP / tools | Yes | Yes | Yes | Needs host MCP support |
| Blender | External tool required | External tool required | External tool required | External tool required |
| Unreal Engine | External tool required | External tool required | External tool required | External tool required |
| Multi-agent delegation | Yes | Capability-dependent | Capability-dependent | Optional |
| Sequential fallback | Yes | Yes | Yes | Yes |

Only two rows are unconditional: **portable guidance** and **sequential
fallback**. Everything else degrades to "unavailable, and the skill says so"
rather than failing.

"External tool required" means exactly that: this repository bundles no Blender
or Unreal integration and installs nothing.

## MCP configuration

| Host | File | Interpolation |
|---|---|---|
| Claude Code | `.mcp.json` | `${VAR}`, `${VAR:-default}` |
| Codex | `~/.codex/config.toml` or `.codex/config.toml` | `env_vars = ["VAR"]` |
| Cursor | `.cursor/mcp.json` | `${env:VAR}` |

**The interpolation syntax differs between Claude Code and Cursor.** Copying a
config across without changing it silently yields an empty value, and the bridge
exits reporting a missing key.

Working configs: [`examples/mcp-configs/`](../examples/mcp-configs/).

## Runtime requirements

| Component | Requirement |
|---|---|
| Portable skill | None — it is Markdown |
| Direct API (Python) | `typesafe-sdk`, `TYPESAFE_API_KEY` |
| Direct API (JavaScript) | `@typesafe-ai/sdk`, Node.js 20+, `TYPESAFE_API_KEY` |
| MCP bridge | Node.js 20+, `TYPESAFE_API_KEY` |

## Versions this was built against

| Package | Version |
|---|---|
| `@typesafe-ai/sdk` | 0.6.0 |
| `typesafe-sdk` (PyPI) | 0.7.0 |
| `@modelcontextprotocol/server` | 2.0.0 |
| `@modelcontextprotocol/client` | 2.0.0 (tests only) |
| `zod` | 4.x |

The MCP specification underwent a significant revision in 2026, and the SDK
split into separate `server` and `client` packages at v2. The older monolithic
`@modelcontextprotocol/sdk` (1.x) is a different API — this bridge does not use
it.

**Protocol revisions served:** the bridge uses `serveStdio`, so it negotiates
**2026-07-28** and still serves **2025-11-25** clients from the same server
factory. Both are asserted in the test suite. Version negotiation is opt-in on
the client side, so a host that does not request it will connect on the 2025
era — that is the client's choice, not a limitation of the bridge.

## Known gaps

- Jev model behaviour is documented per version. The limitations reference
  tracks **jev-1.13**; re-read TypeSafe's jaggedness page when moving to a newer
  model.
- The `allowed-tools` frontmatter field is experimental at the specification
  level and behaves differently per client. The canonical skill does not use it.
- Blender has no vendor-neutral official MCP server; Unreal's first-party plugin
  is marked Experimental by Epic. Both domains are therefore written as
  capability discovery rather than integration instructions.
