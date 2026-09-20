# jev-agent-toolkit

[![CI](https://github.com/reiswaffel78/jev-agent-toolkit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/reiswaffel78/jev-agent-toolkit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/jev-agent-toolkit-mcp)](https://www.npmjs.com/package/jev-agent-toolkit-mcp)

A portable **Agent Skill** that teaches coding agents to build with
[Jev](https://docs.typesafe.ai), TypeSafe's System One model, as a bounded
judgment layer — plus an optional MCP bridge and capability-driven workflows for
code, browser research, Blender and Unreal Engine.

Works in **Claude Code, OpenAI Codex, Cursor**, and other
[Agent Skills](https://agentskills.io)-compatible hosts. One canonical
`SKILL.md`, no per-host forks.

> [!NOTE]
> **Project status**
> - **Agent Skill** — available now. Install it directly from this GitHub
>   repository.
> - **MCP bridge** — implemented and tested. Install it from npm, or build it
>   locally when developing the bridge itself.
> - **npm** — `jev-agent-toolkit-mcp` is **published**, so
>   `npx -y jev-agent-toolkit-mcp` is the regular setup path. Installing 0.1.0
>   from the registry and the resulting MCP handshake were verified on
>   2026-09-20 — see
>   [npm package verification](docs/compatibility.md#npm-package-verification).
> - **Testing** — CI and the protocol tests run against a local mock upstream;
>   there is no automated live TypeSafe test. Manual synthetic live checks
>   against the real API passed on every client path — direct HTTP, the Python
>   SDK, the JavaScript SDK and the local MCP bridge — and an end-to-end run
>   through each host's own MCP integration passed in Claude Code, Codex and
>   Cursor. See
>   [direct client verification](docs/compatibility.md#direct-client-verification)
>   and [host end-to-end verification](docs/compatibility.md#host-end-to-end-verification).
>   These are one-off manual runs: no load testing, no stability testing, and no
>   evidence of general semantic accuracy.

**Contents:** [Install](#install) · [Jev concepts](#the-decision-gate) ·
[MCP bridge](#mode-b--optional-mcp-bridge) ·
[Tool orchestration](#what-else-the-skill-covers) · [Security](#security) ·
[Compatibility](docs/compatibility.md) · [Examples](examples/)

---

## The idea in thirty seconds

Jev does not write text or code. You give it a `state` and typed `questions`,
and it returns typed answers with calibrated probabilities.

That makes it a **judgment layer**, not a replacement for your agent. Jev is not
an autonomous agent and not a general-purpose LLM:

```
                        JEV  ·  bounded judgment
                  classification / score / probability
                                 |
                      portable Agent Skill core
                                 |
                     lead agent / orchestrator
                                 |
         +-----------------+-----------------+
       CODE             BROWSER            TOOLS
                                             |
                              +--------------+--------------+
                           BLENDER        UNREAL       FUTURE TOOLS
```

| Part | Role |
|---|---|
| **Jev** | Makes bounded semantic judgments, each with a probability attached |
| **Host agent** (your coding agent's LLM) | Reasons, writes code and text, orchestrates the workflow |
| **Deterministic code** | Exact operations: arithmetic, counting, dates, parsing, builds, thresholds, policy, control flow |
| **External tools** | Perform actions in the world — browsers, Blender, Unreal, APIs |
| **MCP** (optional) | An interoperability layer for reaching Jev through a tool call. It is a transport, not Jev itself |

The value is in the separation. This toolkit deliberately does **not** route
everything through Jev — keeping deterministic things deterministic is the
architecture.

## Install

The skill and the MCP bridge are **separate**. Most users only need the skill.

### A. Portable Agent Skill — start here

```bash
npx skills add reiswaffel78/jev-agent-toolkit
```

This installs the skill for supported Agent Skills hosts. The `skills` installer
runs through `npx`; if you would rather not use Node.js at all, copy
`skills/jev-agent-toolkit/` into your agent's skills directory by hand —
`.claude/skills/` for Claude Code, `.agents/skills/` for Codex and Cursor. The
skill is plain Markdown. See [docs/compatibility.md](docs/compatibility.md) for
every path.

The skill does not need the MCP bridge or any npm package. To make actual Jev
calls, you also need a TypeSafe API key in the environment:

```bash
export TYPESAFE_API_KEY=...
```

### B. Optional MCP bridge

Only needed if you want Jev exposed as an MCP tool. It is set up separately — see
[Mode B](#mode-b--optional-mcp-bridge) below.

### What do I need?

| What you want | Required |
|---|---|
| Use the Agent Skill | A compatible Agent Skills host |
| Call Jev directly | TypeSafe API key + ability to run the official SDK or HTTP requests |
| Use the Jev MCP bridge | TypeSafe API key + Node.js 22+ + an MCP-capable host |
| Use Blender workflows | Blender tooling you have already set up (not bundled) |
| Use Unreal workflows | Unreal tooling you have already set up (not bundled) |
| Multi-agent delegation | Host support — otherwise the same work runs sequentially |

## The decision gate

Before sending anything to Jev, check all four:

1. Is the answer space **bounded** — one option from a set, a position on an
   ordered scale, or a yes/no proposition?
2. Is it **semantic judgment** rather than exact computation?
3. Can the **state be small** and explicit?
4. Does a **probability** improve the downstream decision?

Mostly "no"? Don't use Jev for it. Counting, arithmetic and date comparison are
documented weaknesses — use code.

## The three primitives

| Primitive | Use for | Returns |
|---|---|---|
| **Choice** | One option from an unordered set (≤255) | `choice`, `probabilities`, `confidence` |
| **Score** | A position on an ordered scale (2–10 levels) | `score`, `probabilities`, `legend`, `confidence` |
| **Noul** | Probability a yes/no proposition is true | `noul` |

**Noul returns no confidence value** — the probability is the signal, and ~0.5
means "torn", not "medium".

## Mode A — direct API or SDK

```python
from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

with TypeSafeClient() as client:                    # reads TYPESAFE_API_KEY
    response = client.system_one(
        state=ticket,
        questions={                                 # ONE request, many questions
            "subsystem": Choice(instructions="Which subsystem?",
                                criteria={"billing": "...", "auth": "...", "other": None}),
            "severity":  Score(instructions="How severe?",
                               criteria=["None", "Minor", "Major", "Critical"]),
            "is_refund": Noul(instructions="Asking for money back?"),
        },
    )

subsystem = response.choices["subsystem"]
if subsystem.confidence < 0.60:                     # threshold in code, not in the question
    route_to_human(ticket)
else:
    assign(ticket, team_for[subsystem.choice])
```

Runnable Python and JavaScript versions: [examples/direct-api/](examples/direct-api/).

**Batch aggressively.** Questions in one request are evaluated in parallel, so
extra questions cost little, while a second request costs a full round-trip.
Send everything you might need — including speculative questions — and let code
decide which answers mattered.

## Mode B — optional MCP bridge

For hosts that prefer a shared tool surface, `mcp/jev/` is a minimal MCP server
exposing exactly one tool, `jev_evaluate`.

It is **optional**. Everything works without it, and the skill says so plainly
when neither mode is available rather than fabricating results.

### Recommended — the published npm package

```bash
npx -y jev-agent-toolkit-mcp
```

Ready-made configs are in [examples/mcp-configs/](examples/mcp-configs/):
`claude-code.npm.mcp.json`, `codex.npm.config.toml` and
`cursor.npm.mcp.json`. Keep `TYPESAFE_API_KEY` in the host's environment —
the configs reference it rather than storing it.

### Local build — for developing the bridge

Use this to run an unpublished change, or to work on the bridge itself:

```bash
git clone https://github.com/reiswaffel78/jev-agent-toolkit.git
cd jev-agent-toolkit/mcp/jev
npm install
npm run build
```

Then point your MCP host at the built entry point, with `TYPESAFE_API_KEY` in
its environment:

```bash
node /absolute/path/to/jev-agent-toolkit/mcp/jev/dist/index.js
```

The matching configs are `claude-code.local.mcp.json`,
`codex.local.config.toml` and `cursor.local.mcp.json`. Replace the
`/absolute/path/to/jev-agent-toolkit` placeholder with where you cloned the
repository.

## What else the skill covers

- **[Coding and builds](skills/jev-agent-toolkit/references/coding.md)** — the
  understand → inspect → implement → run → verify → fix loop, and where bounded
  judgment helps (triage, change risk, review property checks, flake detection).
- **[Browser research](skills/jev-agent-toolkit/references/browser-research.md)** —
  source hierarchy, verifying version-dependent claims against registries,
  treating retrieved content as untrusted data.
- **[Tool orchestration](skills/jev-agent-toolkit/references/tool-orchestration.md)** —
  capability-first discovery, narrowest-tool selection, result verification.
- **[Blender](skills/jev-agent-toolkit/references/blender.md)** and
  **[Unreal Engine](skills/jev-agent-toolkit/references/unreal-engine.md)** —
  implementation-independent capability vocabularies and safety boundaries.
- **[Multi-agent](skills/jev-agent-toolkit/references/multi-agent.md)** —
  lead–worker delegation where supported, identical sequential fallback where
  not.
- **[Orchestration patterns](skills/jev-agent-toolkit/references/jev-patterns.md)** —
  fan-out, confidence-gated routing, composite scoring, intent routing,
  guardrails, ranking, retrieval relevance, extraction cascades.

## Honest limitations

**Jev can be wrong.** Constrained output eliminates malformed answers and
parsing failures. It does not make an answer true. A schema-valid answer can be
the wrong judgment.

**Confidence is not correctness.** It measures how concentrated the probability
distribution is — how decisive the model was, not whether it was right. A model
can be confidently wrong.

**Every threshold in this repository is a placeholder.** Tune against labeled
data from your own domain.

Documented weaknesses — literal reading, unreliable counting, unreliable date
comparison, degradation from irrelevant state, adversarial state — are in
[jev-limitations.md](skills/jev-agent-toolkit/references/jev-limitations.md).

## Security

- The skill never installs external software on its own — no plugins, no MCP
  servers, no Blender addons, no Unreal plugins.
- The optional MCP bridge requires an explicit setup step by you. Once the
  bridge is published to npm, choosing an `npx`-based setup will cause npm to
  fetch that explicitly requested package and its declared dependencies.
- No third-party MCP server is ever installed automatically. Blender and Unreal
  integrations remain external capabilities and are not bundled.
- `TYPESAFE_API_KEY` comes from the environment. Never committed, never logged,
  never passed as an argument.
- The MCP bridge accepts no URL, runs no shell, and cannot return the key.
  Logging is metadata-only, and `debug` is refused unless explicitly enabled
  because the vendor SDK does not redact request bodies at that level.
- Web pages, repositories, tool output and Jev `state` are data, not
  instructions.

Full threat model: [docs/security-model.md](docs/security-model.md).

## What is and is not bundled

| Bundled | Not bundled |
|---|---|
| Portable SKILL.md + references | Blender integration |
| Optional Jev MCP bridge (TypeScript, tested) | Unreal integration |
| Thin adapters for Claude Code, Codex, Cursor | Any third-party MCP server |
| Runnable Python + JavaScript examples | A TypeSafe API key |
| Host MCP configs, checked against each host's documented schema | Anything that auto-installs |

## Relationship to TypeSafe's official skill

TypeSafe publishes its own [agent skill](https://github.com/typesafe-ai/skills)
(MIT) covering the API and question design. It is excellent, and it is the
canonical reference for Jev itself.

This project is complementary and independently authored. It adds the
orchestration layer around Jev: the MCP bridge, capability-driven external tool
workflows, multi-agent delegation with fallback, and cross-host adapters. If you
only need to learn the API, start with the official skill.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Bridge exits: "TYPESAFE_API_KEY is not set" | Interpolation syntax differs per host: `${VAR}` in Claude Code, `${env:VAR}` in Cursor, `env_vars = [...]` in Codex |
| Tool error `authentication` | Key invalid or from a different environment. The 401 body is never echoed, by design |
| Tool error `validation` | Choice needs 2–255 options; Score needs 2–10 levels; unknown question types are rejected locally |
| Skill not triggering | Directory name must match the `name` field exactly: `jev-agent-toolkit` |
| Garbled MCP output | Something wrote to stdout. The bridge logs only to stderr for this reason |

## Verify it yourself

```bash
node scripts/validate.mjs        # skill frontmatter, internal links, secret scan
cd mcp/jev && npm install && npm test
```

`scripts/validate.mjs` checks the frontmatter rules from the Agent Skills
specification directly. To cross-check with the project's own reference
validator:

```bash
skills-ref validate ./skills/jev-agent-toolkit
```

35 tests, including a full MCP protocol round-trip against a local mock upstream
— no API key needed, nothing spent. The round-trip covers handshake, tool
discovery, batching, model override, local validation and 401 redaction, and
asserts the server negotiates the 2026-07-28 protocol revision while still
serving 2025-era clients.

## Sources

Built against official documentation, verified 2026-09-19:
[TypeSafe docs](https://docs.typesafe.ai) ·
[Agent Skills](https://agentskills.io) ·
[Model Context Protocol](https://modelcontextprotocol.io) ·
[Claude Code](https://code.claude.com/docs) ·
[Codex](https://learn.chatgpt.com/docs) ·
[Cursor](https://cursor.com/docs)

## License

MIT — see [LICENSE](LICENSE).
