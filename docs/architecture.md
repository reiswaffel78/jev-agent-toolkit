# Architecture

## Layers

```
Layer 1  Jev Core          when Jev applies, primitives, question design,
                           confidence semantics, limitations
Layer 2  Connectivity      direct API / official SDKs / optional MCP bridge
Layer 3  Execution         code, browser, generic tools, Blender, Unreal
Layer 4  Orchestration     decomposition, delegation, sequential fallback
Layer 5  Agent adapters    thin per-host notes (Claude Code, Codex, Cursor)
```

Layers 1–4 live in the canonical skill and are agent-neutral. Layer 5 is the
only place a product name may appear.

## Where the boundaries are

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

Four workers, strictly separated:

- **Deterministic code** — arithmetic, counting, dates, parsing, file I/O,
  builds, thresholds, policy, control flow.
- **Jev** — bounded semantic judgment with a probability attached.
- **General-purpose LLM** — open-ended reasoning, prose, code, candidates.
- **External tools** — actions in the world.

The architecture is the separation, not the routing of everything through Jev.
A design that sends arithmetic to Jev to make it look central is a worse design.

## Decision record

### Why one canonical SKILL.md

Maintaining per-host copies guarantees divergence. The Agent Skills
specification is supported natively by all three primary targets, so one
spec-compliant skill reaches all of them. Adapters carry only what is genuinely
host-specific: install paths, MCP config syntax, and model recommendations.

The canonical skill uses only specification-defined frontmatter (`name`,
`description`, `license`, `compatibility`, `metadata`). Host-specific fields
were deliberately excluded — they are not portable, and some break packaging for
distribution.

### Why the MCP bridge was implemented

It was justified but kept optional:

- The official MCP server SDK (`@modelcontextprotocol/server` v2.0.0) targets
  the current spec revision and is actively maintained.
- All three target hosts document STDIO server configuration.
- A single narrow tool is a small, auditable surface — roughly 200 lines.
- It gives hosts without code execution a path to Jev.

It stays optional because most coding agents *can* execute code, and Mode A
(direct SDK) is simpler when available. Nothing in the skill requires it.

### Why TypeScript rather than Python

Both official MCP SDKs are viable. TypeScript won on three points:

1. `npx -y <pkg>` zero-install invocation is the pattern every target host
   documents first.
2. Zod v4 produces the JSON Schema for `inputSchema`, runtime validation, and
   static types from one definition.
3. `@typesafe-ai/sdk` is JavaScript-native, so bridge and vendor SDK share a
   language and a type system.

### Why exactly one tool

`jev_evaluate` mirrors the System One request shape: `state`, `questions`,
optional `model`. Helper tools per primitive would triple the surface, duplicate
validation, and break batching — the single most valuable performance property
Jev has. One tool that accepts many questions is strictly better than three
tools that each accept one.

### Why the bridge refuses `debug` logging

The TypeSafe SDK documents that at `debug` it logs request headers and bodies,
and that **credential headers are redacted but bodies are not**. A raw body
contains the caller's state. The bridge downgrades `debug` to `info` unless
`JEV_MCP_ALLOW_BODY_LOGGING=1` is set explicitly.

### Why the entry point uses `serveStdio`, not `server.connect`

`@modelcontextprotocol/server` offers two stdio entry points, and they are not
equivalent. Hand-wiring `server.connect(new StdioServerTransport())` pins every
connection to the 2025 era: `server/discover` does not exist there, and a
negotiating client falls back silently rather than failing, so the limitation is
easy to miss.

`serveStdio(factory)` owns the era decision instead — it negotiates the modern
revision and still serves 2025-era clients from the same factory, which is why
the factory shape exists. Measured against the official client, the hand-wired
form negotiates `2025-11-25`; `serveStdio` negotiates `2026-07-28`.

Note that version negotiation is opt-in on the *client* side (its mode defaults
to `legacy`), so an unchanged client still sees the old era. That is expected,
and the test suite asserts both paths.

### Why the bridge logs to stderr

An MCP STDIO server speaks protocol on stdout. The SDK logs to `console` by
default, which would write to stdout and corrupt the stream. The bridge injects
a logger that writes only to stderr.

## Repository layout

```
jev-agent-toolkit/
├── skills/jev-agent-toolkit/     canonical portable skill — single source of truth
│   ├── SKILL.md
│   └── references/               loaded on demand
├── mcp/jev/                      optional MCP bridge (TypeScript)
├── adapters/                     thin per-host notes
├── examples/
│   ├── direct-api/               runnable Python + JavaScript
│   └── mcp-configs/              verified host configurations
└── docs/                         architecture, compatibility, security model
```

The skill directory is self-contained: copying it alone is a valid install, so
nothing inside it links outside it.

## Extending it

To add a tool domain (Figma, Unity, Godot, a database), add one reference file
defining:

1. an implementation-independent **capability vocabulary**,
2. the **safety boundary** — which capabilities are destructive, and what
   confirmation each needs,
3. the **verification method** — how to confirm an action took effect.

Do not add a domain by naming a specific server. Capability-driven discovery is
what keeps the core stable while the ecosystem churns.
