# jev-agent-toolkit

A portable **Agent Skill** that teaches coding agents to build with
[Jev](https://docs.typesafe.ai), TypeSafe's System One model, as a bounded
judgment layer — plus an optional MCP bridge and capability-driven workflows for
code, browser research, Blender and Unreal Engine.

Works in **Claude Code, OpenAI Codex, Cursor**, and other
[Agent Skills](https://agentskills.io)-compatible clients. One canonical
`SKILL.md`, no per-host forks.

---

## The idea in thirty seconds

Jev does not write text or code. You give it a `state` and typed `questions`,
and it returns typed answers with calibrated probabilities.

That makes it a **judgment layer**, not a replacement for your agent:

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

| Worker | Owns |
|---|---|
| **Deterministic code** | Arithmetic, counting, dates, parsing, builds, thresholds, policy, control flow |
| **Jev** | Bounded semantic judgment with a probability attached |
| **General-purpose LLM** | Open-ended reasoning, prose, code, candidate generation |
| **External tools** | Actions in the world |

The value is in the separation. This toolkit deliberately does **not** route
everything through Jev — keeping deterministic things deterministic is the
architecture.

## Install

```bash
npx skills add reiswaffel78/jev-agent-toolkit
```

Or copy `skills/jev-agent-toolkit/` into your agent's skills directory —
`.claude/skills/` for Claude Code, `.agents/skills/` for Codex and Cursor. See
[docs/compatibility.md](docs/compatibility.md) for every path.

```bash
export TYPESAFE_API_KEY=...
```

That is the whole dependency list.

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

```bash
claude mcp add --transport stdio --env TYPESAFE_API_KEY=$TYPESAFE_API_KEY \
  jev -- npx -y jev-agent-toolkit-mcp
```

Verified configs for all three hosts: [examples/mcp-configs/](examples/mcp-configs/).

It is **optional**. Everything works without it, and the skill says so plainly
when neither mode is available rather than fabricating results.

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

- Nothing is downloaded, executed or installed silently — no addons, no plugins,
  no MCP servers.
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
| Verified host MCP configs | Anything that auto-installs |

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

33 tests, including a full MCP protocol round-trip against a local mock upstream
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
