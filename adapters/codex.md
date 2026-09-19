# OpenAI Codex adapter

Thin host notes. The canonical skill is
[`skills/jev-agent-toolkit/SKILL.md`](../skills/jev-agent-toolkit/SKILL.md).

Verified against Codex documentation on 2026-09-19.

## Install the skill

Codex supports Agent Skills natively, built on the agentskills.io standard, and
requires `name` and `description` in the frontmatter — both of which the
canonical SKILL.md provides.

```bash
npx skills add reiswaffel78/jev-agent-toolkit
```

Or copy `skills/jev-agent-toolkit/` into one of the directories Codex scans,
most specific first:

| Scope | Path |
|---|---|
| Repository | `$CWD/.agents/skills/`, `$REPO_ROOT/.agents/skills/` |
| User | `$HOME/.agents/skills/` |
| Admin | `/etc/codex/skills/` |

Invoke explicitly with `/skills` or `$` in the CLI, or let Codex select it from
the description.

## Optional MCP bridge

```bash
codex mcp add jev --env TYPESAFE_API_KEY=$TYPESAFE_API_KEY \
  -- npx -y jev-agent-toolkit-mcp
```

Or edit `~/.codex/config.toml` (or a project-scoped `.codex/config.toml`):

```toml
[mcp_servers.jev]
command = "npx"
args = ["-y", "jev-agent-toolkit-mcp"]
env_vars = ["TYPESAFE_API_KEY"]
startup_timeout_sec = 10
tool_timeout_sec = 60
```

`env_vars` forwards named variables from your environment — the preferred form,
since no secret is written to the file. Use `[mcp_servers.jev.env]` only for
literal non-secret values.

Verify with `codex mcp list`.

## Notes

- `tool_timeout_sec` defaults to 60. The bridge's own timeout is controlled by
  `JEV_MCP_TIMEOUT_MS`; keep the host timeout the larger of the two so the
  bridge reports a clean timeout instead of being killed mid-call.
- Codex can execute code, so Mode A (direct SDK) works without the bridge.
