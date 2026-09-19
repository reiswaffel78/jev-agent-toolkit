# Claude Code adapter

Thin host notes. The canonical skill is
[`skills/jev-agent-toolkit/SKILL.md`](../skills/jev-agent-toolkit/SKILL.md) —
this file adds nothing to it and must never fork it.

Verified against Claude Code documentation on 2026-09-19.

## Install the skill

```bash
npx skills add reiswaffel78/jev-agent-toolkit
```

Or copy it manually:

| Scope | Path |
|---|---|
| Personal (all projects) | `~/.claude/skills/jev-agent-toolkit/` |
| Project (committed) | `.claude/skills/jev-agent-toolkit/` |

Copy the whole `skills/jev-agent-toolkit/` directory, including `references/`.
The directory name must stay `jev-agent-toolkit` to match the `name` field.

## Optional MCP bridge

```bash
claude mcp add --transport stdio --env TYPESAFE_API_KEY=$TYPESAFE_API_KEY \
  jev -- npx -y jev-agent-toolkit-mcp
```

Or commit a project-scoped `.mcp.json`:

```json
{
  "mcpServers": {
    "jev": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "jev-agent-toolkit-mcp"],
      "env": { "TYPESAFE_API_KEY": "${TYPESAFE_API_KEY}" }
    }
  }
}
```

Claude Code expands `${VAR}` and `${VAR:-default}` in `command`, `args` and
`env`, so the key stays in your environment rather than in the file.

The bridge is optional — Mode A (direct SDK or HTTP) works here, since Claude
Code can execute code.

## Recommended model mapping

This belongs in the adapter, never in the portable skill:

- **Lead** — an Opus-class model for architecture, synthesis, conflict
  resolution and final review.
- **Workers** — a Sonnet-class model for bounded research and first-pass review.

Delegate with the `Agent` tool, one layer deep. Treat worker reports as evidence
to verify, not conclusions to adopt — see
[`references/multi-agent.md`](../skills/jev-agent-toolkit/references/multi-agent.md).

## Notes

- Claude Code supports extra frontmatter fields (`when_to_use`, `allowed-tools`,
  `disable-model-invocation`, …). The canonical SKILL.md deliberately uses none
  of them, because they are not portable and some break packaging for
  distribution.
- Never commit a real `TYPESAFE_API_KEY` into `.mcp.json`.
