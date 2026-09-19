# Cursor adapter

Thin host notes. The canonical skill is
[`skills/jev-agent-toolkit/SKILL.md`](../skills/jev-agent-toolkit/SKILL.md).

Verified against Cursor documentation on 2026-09-19.

## Install the skill

Cursor supports Agent Skills natively and follows the agentskills.io standard.

```bash
npx skills add reiswaffel78/jev-agent-toolkit
```

Or copy `skills/jev-agent-toolkit/` into one of:

| Scope | Path |
|---|---|
| Project | `.agents/skills/`, `.cursor/skills/` |
| User | `~/.agents/skills/`, `~/.cursor/skills/` |

Cursor also loads skills from Claude Code's and Codex's directories
(`.claude/skills/`, `.codex/skills/`, and their `~` equivalents), so a repo that
already installed the skill for another host usually needs no second copy.

## Optional MCP bridge

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "jev": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "jev-agent-toolkit-mcp"],
      "env": { "TYPESAFE_API_KEY": "${env:TYPESAFE_API_KEY}" }
    }
  }
}
```

**The interpolation syntax differs from Claude Code.** Cursor uses
`${env:VAR}`; Claude Code uses `${VAR}`. Copying a config between the two
without changing this is a common and confusing failure — the variable silently
resolves to an empty string and the bridge exits reporting a missing key.

Cursor also supports `envFile` for STDIO servers, plus `${userHome}`,
`${workspaceFolder}` and `${pathSeparator}`.

## Notes

- Never commit a real key. `.cursor/mcp.json` is usually a committed file.
- Cursor can execute code, so Mode A (direct SDK) works without the bridge.
