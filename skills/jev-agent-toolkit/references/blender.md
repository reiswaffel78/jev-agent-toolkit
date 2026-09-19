# Blender workflows

**This toolkit bundles no Blender integration and installs nothing.** It
describes how to work with whatever Blender-capable tooling the user has already
set up. If none is present, say so and stop.

## Ecosystem status (checked 2026-09-19 — re-verify)

The Blender Foundation does not ship a vendor-neutral MCP server as part of
Blender. Anthropic joined the Blender Development Fund as a corporate patron in
April 2026, and a Blender MCP connector has been made available for Claude, but
that is a host-specific integration rather than a Blender-published standard.

Several community MCP servers exist with differing scope, mechanism and
licensing. The most widely used is `ahujasid/blender-mcp` (MIT). Others include
`RFingAdam/mcp-blender`, which relicensed to AGPL-3.0 — relevant if you plan to
build on it. Licenses on smaller projects were not individually verified; check
before depending on one.

Do not treat this list as a recommendation, and do not hardcode any of these
names into a workflow.

## How these integrations actually work

Nearly all of them share one shape:

```
agent -> MCP server process -> local socket -> Blender addon -> bpy
```

An addon runs inside Blender and exposes a local port; a separate server process
bridges the agent to it; everything ultimately executes through Blender's Python
API. Two consequences follow.

First, **the addon must already be installed and Blender must be running** with
it enabled. That is the user's setup step, not yours.

Second, **code executed this way is not sandboxed**. It runs inside Blender's
process with full filesystem and network access.

## Capability vocabulary

Reason in these terms, then discover which available tool provides them. Never
start from a tool name — see [tool-orchestration.md](tool-orchestration.md).

**Read**
- Scene and object inspection: list objects, hierarchy, selection, properties
- Material and modifier inspection
- Render settings inspection

**Create and modify**
- Object creation and deletion
- Transforms: position, rotation, scale
- Mesh and geometry editing, UV unwrapping
- Material and shader assignment
- Modifier stack manipulation
- Lighting and camera setup
- Animation: keyframes, rigging

**Produce**
- Rendering, and reading the resulting image back
- Import and export
- Saving the scene

**Escape hatch**
- Arbitrary Python execution inside Blender — a separate, higher-risk class

## Safety

Blender work is destructive in ways that are easy to underestimate: there is one
scene, edits mutate it in place, and a save overwrites the user's file.

- **Confirm before saving or overwriting.** Saving is not a neutral act.
- **Confirm before deleting objects** or clearing a scene.
- **Prefer specific tools over `execute_python`.** Use arbitrary execution only
  when nothing else covers the task, keep it minimal and inspectable, and say
  why you are using it.
- **Never install an addon.** Installing a Blender addon means running
  third-party code inside the user's application. That is the user's decision.
- **Never trigger unattended asset downloads.** Some integrations can pull
  models from external libraries; that is a network fetch of untrusted content.
- **Renders can be expensive.** Check resolution and sample settings before
  triggering one, rather than discovering the cost afterwards.
- **Verify by reading the scene back**, not by assuming a call succeeded.

## Where Jev fits

Blender work is mostly deterministic tool calls. Bounded judgment helps in a few
narrow places:

- Classifying a natural-language request into a capability category (Choice over
  the vocabulary above, with a `none_suitable` option).
- Judging whether a rendered result matches a described intent (Score) — useful
  for an iterate-and-check loop.
- Deciding whether a requested operation is destructive enough to warrant
  confirmation (Noul) — as a *signal* feeding a code-side policy, never as the
  gate itself.

Jev does not generate `bpy` code, compute transforms, or choose numeric
parameters. Those are generation and arithmetic.
