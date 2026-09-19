# Generic Agent Skills clients

For any host implementing the [agentskills.io](https://agentskills.io)
specification that is not covered by a dedicated adapter.

## Install

The Vercel `skills` CLI adapts to each agent's own directory convention:

```bash
npx skills add reiswaffel78/jev-agent-toolkit          # interactive
npx skills add reiswaffel78/jev-agent-toolkit -g -y    # global, non-interactive
npx skills add reiswaffel78/jev-agent-toolkit --list   # inspect first
```

Otherwise copy the `skills/jev-agent-toolkit/` directory into whatever path your
host scans. `.agents/skills/` is the emerging convention-neutral location.

The directory name must remain `jev-agent-toolkit`: the specification requires
it to match the `name` frontmatter field.

## What the skill relies on

The canonical SKILL.md uses only specification-defined frontmatter — `name`,
`description`, `license`, `compatibility`, `metadata` — so it loads on any
compliant host. It requires no host-specific tools, subagent APIs, hooks or
filesystem paths.

Reference files under `references/` are linked with relative paths one level
deep, as the specification prescribes, and are loaded on demand.

## Degrading gracefully

The skill is written in capability terms, so a host missing a capability simply
does less rather than breaking:

| Capability | If absent |
|---|---|
| Code or HTTP execution | Use the MCP bridge instead |
| MCP support | Use direct SDK/HTTP instead |
| Neither | Report that Jev execution is unavailable; continue with non-Jev work |
| Delegated subagents | Run the same decomposition sequentially |
| Browser | Skip research steps; state that claims are unverified |
| Blender / Unreal tooling | Report the capability is unavailable and stop |

Correctness never depends on an optional capability being present.

## Minimum viable setup

1. Install the skill.
2. Set `TYPESAFE_API_KEY` in the environment.
3. Confirm the host can either run code or speak MCP.

That is the whole dependency list.
