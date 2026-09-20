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

## Direct client verification

These are direct client paths to the API, **not** host end-to-end runs: no agent
host is involved. Each was exercised once by hand against the real endpoint
`https://api.typesafe.ai/v1/systemone`, with synthetic data only.

| Path | Result | Jev model | Notes |
|---|---|---|---|
| Direct HTTP | PASS | `jev-1.13.0` | Raw request, used as the reference for the wire format |
| Python SDK `typesafe-sdk` 0.7.0 | PASS | `jev-1.13.0` | Python 3.11.15, isolated temporary virtual environment |
| JavaScript SDK `@typesafe-ai/sdk` | PASS | `jev-1.13.0` | Same request shape as the HTTP path |
| Local MCP bridge | PASS | `jev-1.13.0` | Bridge called directly with the official MCP client |

The Python run (2026-09-20) issued exactly one batched `system_one()` call
through `TypeSafeClient`, asking `jev-latest` and receiving `jev-1.13.0`, with
one Choice, one Score and one Noul in a single request. It took 826 ms and
reported 433 input and 71 output tokens. The Choice returned `billing` at
confidence 1.0; the Score returned 1.88 on the 0–3 scale at confidence 0.75;
the Noul returned 0.99 and, as documented, carried no `confidence` field. The
response was a `SystemOneResponse` with `model`, `usage` and `answers`, plus the
per-primitive accessors `choices`, `scores` and `nouls`. No mock, no HTTP
fallback and no MCP bridge were involved.

## Host end-to-end verification

Each host loaded the local MCP bridge through its **own** MCP integration,
called the tool itself, and received a real answer from the TypeSafe API. All
three runs used the same synthetic "duplicate charge" state with one Choice
(`topic`), one Score (`urgency`) and one Noul (`asks_refund`) batched into a
single request.

| Host | Version | Result | Jev model | Tokens in/out | Tool latency | MCP revision | Source |
|---|---|---|---|---|---|---|---|
| Claude Code | 2.1.275 (model `claude-sonnet-5`) | PASS | `jev-1.13.0` | 424 / 71 | 810 ms | `2025-11-25` | Observed in this repository on 2026-09-19 |
| OpenAI Codex | `codex-cli` 0.155.0-alpha.9.2 | PASS | `jev-1.13.0` | 419 / 71 | ~1.13 s | not evidenced | Reported by that host's agent |
| Cursor | 3.21.16 (Windows 10, Node v22.16.0) | PASS | `jev-1.13.0` | 433 / 71 | 713 ms | not determinable | Reported by that host's agent |

In every run the answers were structurally valid — `answers`, `model` and
`usage` at the top level, the documented fields per primitive, a `choice` from
the supplied criteria, a score inside the defined range, and a Noul without a
`confidence` field — and the three results were comparable across hosts.

Read these as single manual runs, not as independent reproduction, load testing
or stability testing, and not as evidence of general semantic accuracy. Only the
Claude Code run was observed directly in this repository; the Codex and Cursor
figures come from those hosts' own agent reports.

Host-specific observations:

- **Claude Code** loads MCP tools on demand, so it first resolved the tool
  schema and then called `mcp__jev__jev_evaluate`. It connected on the 2025 era
  because version negotiation is opt-in on the client side.
- **Codex** passed, but no evidence of the negotiated protocol revision was
  captured.
- **Cursor** used a personal MCP configuration with an environment-variable
  reference and exposed the server as `user-jev` with the tool `jev_evaluate`.
  Its agent reported a brief reconnect after the call, after which the server
  was connected again. The negotiated revision could not be determined.

## Runtime requirements

| Component | Requirement |
|---|---|
| Portable skill | None — it is Markdown |
| Direct API (Python) | `typesafe-sdk`, `TYPESAFE_API_KEY` |
| Direct API (JavaScript) | `@typesafe-ai/sdk`, Node.js 20+, `TYPESAFE_API_KEY` |
| MCP bridge | Node.js 22+, `TYPESAFE_API_KEY` |

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
- CI runs against a local mock upstream only. No automated test contacts the
  TypeSafe API, so neither the direct nor the host results above are
  re-verified on every change. Every live result recorded here is a one-off
  manual smoke test: it says the path works, not that it is fast, reliable
  under load, or semantically accurate in general.
- `jev-agent-toolkit-mcp` is not published to npm, so every host run above used
  a local build of the bridge.
