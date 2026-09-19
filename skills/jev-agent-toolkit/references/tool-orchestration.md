# Tool orchestration

How to use external tools without hardcoding assumptions about which ones exist.

## Reason from capability, never from tool name

The failure mode is starting from a remembered tool name and hoping it is
present. Start from the capability the task needs:

```
TASK
  -> REQUIRED CAPABILITY      "I need to set an object's material"
  -> AVAILABLE TOOL           what is actually registered in this session?
  -> SCHEMA INSPECTION        what parameters does it really take?
  -> EXECUTION                narrowest call that does the job
  -> RESULT VALIDATION        did it actually work?
```

**Never invent a tool name.** If no available tool provides the capability, say
so plainly and stop. Do not guess at a name, do not assume a server is running,
and do not install one to make the problem go away.

## Discovery

Enumerate what the current environment exposes and match against the capability
you need. In MCP terms this is `tools/list` plus reading each `inputSchema`; in
other hosts it is whatever registry the host provides.

Match semantically, not by string: you are looking for "something that can
transform an object", not for a server called `blender-mcp`.

Cache the result for the session, but re-check if a call fails in a way that
suggests the tool surface changed.

## Choose the narrowest tool

Many integrations expose both specific typed tools (`set_material`,
`spawn_actor`) and a generic escape hatch (`execute_python`, `run_code`).

Prefer the specific tool every time. It validates arguments, has a bounded blast
radius, and fails in a way you can read.

Treat arbitrary code execution as a distinct, higher-risk capability class:

- Use it only when no specific tool covers the task.
- Say why you are using it before you do.
- Keep the code minimal and inspectable — no downloads, no installs, no
  network calls hidden inside it.
- Never use it to work around a permission or safety check.

## Execute and verify

Make the minimum number of calls. Then **inspect the actual result** rather than
assuming success — a tool returning without error is not evidence that the
intended change happened. Query the state back where the tool surface allows it.

When a call fails: read the error, correct the argument, retry once. If it fails
the same way twice, stop and report. Retry loops against a misunderstood schema
burn time and can cause real damage in stateful applications.

Report only outcomes you verified. "I set the material and confirmed it is
applied to `Cube`" is a report; "I called set_material" is not.

## Using Jev inside tool orchestration

Jev is useful for bounded judgments about tool use, and useless for the
mechanics:

**Good:**
- Ranking candidate tools by fit when several could work (Choice over a
  discovered set, with an `none_suitable` option).
- Judging whether a tool's output indicates success when the signal is textual
  and fuzzy (Noul).
- Scoring the risk class of a proposed action to drive a confirmation gate.

**Bad:**
- Generating tool arguments — that is generation.
- Deciding whether a permission check passes — that is policy, and belongs in
  code.
- Parsing structured tool output — use a parser.

## Adding new tool domains

The architecture should absorb Figma, Unity, Godot, FreeCAD, GitHub, databases
or deployment services without changing the core. To add one, write down:

1. The **capability vocabulary** — implementation-independent verbs, the way
   [blender.md](blender.md) and [unreal-engine.md](unreal-engine.md) do it.
2. The **safety boundary** — which capabilities are destructive or irreversible,
   and what confirmation each requires.
3. The **verification method** — how to confirm an action actually took effect.

Do not add a domain by naming a specific server. That is the coupling this
design exists to avoid.
