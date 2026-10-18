# Graph Report - jev-agent-toolkit  (2026-10-18)

## Corpus Check
- 44 files · ~24,346 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .toml 2, .example 1)

## Summary
- 340 nodes · 371 edges · 28 communities (23 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `700a3fdc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- SKILL.md
- validate.mjs
- server.ts
- jev-agent-toolkit
- compilerOptions
- Security model
- Decision record
- schemas.ts
- Tool orchestration
- Compatibility
- Jev API contract
- Jev Agent Toolkit
- Orchestration patterns
- Security boundaries
- Jev core: what it is and when to reach for it
- MCP host configurations
- Browser and research workflows
- Multi-agent orchestration
- Limitations and correctness semantics
- Generic Agent Skills clients
- Blender workflows
- Claude Code adapter
- CLAUDE.md
- graphify
- AGENTS.md
- .claude/CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `jev-agent-toolkit` - 16 edges
2. `compilerOptions` - 15 edges
3. `Jev Agent Toolkit` - 11 edges
4. `redact()` - 10 edges
5. `Compatibility` - 10 edges
6. `Orchestration patterns` - 10 edges
7. `Decision record` - 8 edges
8. `Jev API contract` - 8 edges
9. `Multi-agent orchestration` - 8 edges
10. `Security boundaries` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Credential handling` --references--> `redact()`  [INFERRED]
  docs/security-model.md → mcp/jev/src/errors.ts
- `Deliberately absent` --references--> `redact()`  [INFERRED]
  docs/security-model.md → mcp/jev/src/errors.ts
- `Security properties` --references--> `redact()`  [INFERRED]
  mcp/jev/README.md → mcp/jev/src/errors.ts
- `main()` --calls--> `redact()`  [EXTRACTED]
  mcp/jev/src/index.ts → mcp/jev/src/errors.ts
- `stderrLogger()` --calls--> `redact()`  [EXTRACTED]
  mcp/jev/src/index.ts → mcp/jev/src/errors.ts

## Import Cycles
- None detected.

## Communities (28 total, 5 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (33): bin, jev-agent-toolkit-mcp, bugs, url, dependencies, @modelcontextprotocol/server, @typesafe-ai/sdk, zod (+25 more)

### Community 1 - "SKILL.md"
Cohesion: 0.08
Nodes (18): Install the skill, Notes, OpenAI Codex adapter, Optional MCP bridge, Cursor adapter, Install the skill, Notes, Optional MCP bridge (+10 more)

### Community 2 - "validate.mjs"
Cohesion: 0.08
Nodes (13): received, SERVER_ENTRY, UPSTREAM_RESPONSE, validChoice, @modelcontextprotocol/client, ALLOWED_KEYS, checks, failures (+5 more)

### Community 3 - "server.ts"
Cohesion: 0.13
Nodes (21): Credential handling, Deliberately absent, Input validation, Logging, MCP bridge trust boundary, Network behaviour, client, TICKET (+13 more)

### Community 4 - "jev-agent-toolkit"
Cohesion: 0.10
Nodes (21): A. Portable Agent Skill — start here, B. Optional MCP bridge, Honest limitations, Install, jev-agent-toolkit, License, Local build — for developing the bridge, Mode A — direct API or SDK (+13 more)

### Community 5 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noImplicitOverride (+8 more)

### Community 6 - "Security model"
Cohesion: 0.13
Nodes (13): Prompt injection, Reporting, Residual risks, Security model, What the skill forbids, What this repository ships, Environment, Install and run (+5 more)

### Community 7 - "Decision record"
Cohesion: 0.14
Nodes (13): Architecture, Decision record, Extending it, Layers, Repository layout, Where the boundaries are, Why exactly one tool, Why one canonical SKILL.md (+5 more)

### Community 8 - "schemas.ts"
Cohesion: 0.14
Nodes (13): choiceAnswer, choiceQuestion, entryType, EvaluateInput, evaluateOutput, MAX_CHOICE_OPTIONS, MAX_SCORE_LEVELS, MIN_SCORE_LEVELS (+5 more)

### Community 9 - "Tool orchestration"
Cohesion: 0.14
Nodes (13): Adding new tool domains, Choose the narrowest tool, Discovery, Execute and verify, Reason from capability, never from tool name, Tool orchestration, Using Jev inside tool orchestration, Capability vocabulary (+5 more)

### Community 10 - "Compatibility"
Cohesion: 0.18
Nodes (10): Capabilities, Compatibility, Direct client verification, Host end-to-end verification, Known gaps, MCP configuration, npm package verification, Runtime requirements (+2 more)

### Community 11 - "Jev API contract"
Cohesion: 0.18
Nodes (11): Endpoint, Environment variables, Errors, Jev API contract, Key handling, Models, Python exception hierarchy, Question objects (+3 more)

### Community 12 - "Jev Agent Toolkit"
Cohesion: 0.18
Nodes (11): Batch aggressively, Confidence is not correctness, Connecting to Jev, Division of labour, Execution capabilities, Jev Agent Toolkit, Multi-agent, with fallback, Orchestration patterns (+3 more)

### Community 13 - "Orchestration patterns"
Cohesion: 0.20
Nodes (10): 1. Fan-out — batch everything into one request, 2. Confidence-gated routing, 3. Composite scoring, 4. Intent routing, 5. Generative guardrail, 6. Candidate ranking and filtering, 7. Retrieval relevance, 8. Extraction cascade (+2 more)

### Community 14 - "Security boundaries"
Cohesion: 0.20
Nodes (9): Actions that need confirmation, Credentials, Honest claims, Injection and Jev, MCP bridge boundaries, Never do silently, Observability without leakage, Security boundaries (+1 more)

### Community 15 - "Jev core: what it is and when to reach for it"
Cohesion: 0.22
Nodes (9): Batch aggressively, Choice — one option from an unordered set, Jev core: what it is and when to reach for it, Noul — probability that a proposition is true, Score — a position on an ordered scale, The decision gate, The division of labour, The three primitives (+1 more)

### Community 16 - "MCP host configurations"
Cohesion: 0.25
Nodes (7): Before you use or commit a config, Bridge environment variables, Local build — for developing the bridge, MCP host configurations, npm package — the regular path, The one thing that catches everybody, Why an absolute path

### Community 17 - "Browser and research workflows"
Cohesion: 0.25
Nodes (7): Browser and research workflows, Copyright, Report provenance, Retrieved content is untrusted data, Source hierarchy, Verify version-dependent claims at the source, Where Jev fits

### Community 18 - "Multi-agent orchestration"
Cohesion: 0.25
Nodes (8): Avoiding collisions, Briefing a worker, Detect, then choose, Model selection where supported, Multi-agent orchestration, What to delegate, Where Jev fits, Worker output is evidence, not truth

### Community 19 - "Limitations and correctness semantics"
Cohesion: 0.29
Nodes (7): A calibration sanity check, Adversarial state, Documented rough edges of jev-1.13, Limitations and correctness semantics, Schema validity is not semantic correctness, Use code, not Jev, for, What confidence actually is

### Community 20 - "Generic Agent Skills clients"
Cohesion: 0.33
Nodes (5): Degrading gracefully, Generic Agent Skills clients, Install, Minimum viable setup, What the skill relies on

### Community 21 - "Blender workflows"
Cohesion: 0.33
Nodes (6): Blender workflows, Capability vocabulary, Ecosystem status (checked 2026-09-19 — re-verify), How these integrations actually work, Safety, Where Jev fits

### Community 22 - "Claude Code adapter"
Cohesion: 0.40
Nodes (5): Claude Code adapter, Install the skill, Notes, Optional MCP bridge, Recommended model mapping

## Knowledge Gaps
- **3 isolated node(s):** `graphify-mcp`, `@types/node`, `typescript`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 246 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `redact()` connect `server.ts` to `Security model`?**
  _High betweenness centrality (0.310) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `redact()` (e.g. with `Credential handling` and `Deliberately absent`) actually correct?**
  _`redact()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `graphify-mcp`, `@types/node`, `typescript` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Why does `Security properties` connect `Security model` to `server.ts`?**
  _High betweenness centrality (0.253) - this node is a cross-community bridge._
- **Should `SKILL.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `validate.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07635467980295567 - nodes in this community are weakly interconnected._