# Unreal Engine workflows

**This toolkit bundles no Unreal integration and installs nothing.** It describes
how to work with whatever Unreal-capable tooling is already set up. If none is
present, say so and stop.

## Ecosystem status (checked 2026-09-19 — re-verify)

Unlike Blender, Epic ships a first-party integration: **Unreal MCP** is an
official Experimental plugin, available from UE 5.8 and announced during 2026.
It runs inside the Editor process and exposes tools through a Toolset Registry,
with custom toolsets authorable in Python or C++.

Being Experimental matters. Epic's own documentation states that features are
incomplete and the API may change. Verify against the current documentation for
the user's engine version rather than assuming a tool exists.

Third-party servers predate and complement it, differing mainly in mechanism —
for example `chongdashu/unreal-mcp` (MIT, custom C++ TCP plugin) and
`runreal/unreal-mcp` (MIT, built on the engine's Python Remote Execution, so no
plugin install). Others build on the Remote Control API. Licenses on smaller
projects were not individually verified.

Discover what is present; do not assume the official plugin is enabled.

## Trust boundary

The official plugin is **local HTTP with no authentication by design**. It
rejects non-loopback origins and serialises requests onto the game thread, but
it carries no credential.

The security model is therefore entirely "this port is only reachable from this
machine". If that port is ever exposed — a tunnel, a port forward, a permissive
container network — anything that can reach it can drive the Editor. Never help
expose it, and flag it if you notice it exposed.

The same applies to Remote Control API-based integrations, which expose property
and function calls over HTTP on their own port.

## Capability vocabulary

Reason in these terms, then discover which available tool provides them.

**Read**
- Project, level and world-outliner inspection
- Actor listing, hierarchy, property reads
- Asset search and inspection
- Log and output inspection

**Create and modify**
- Actor spawn, delete, transform
- Property get/set
- Component management
- Blueprint graph editing: nodes, variables, event graphs
- Material and material-instance authoring
- Lighting and camera configuration
- Asset import

**Build and run**
- Blueprint compilation
- C++ build triggers
- Automation test execution
- Play-In-Editor control: start, stop, step
- Headless build and cook

## Safety

Unreal projects are large, stateful, and under version control that does not
merge binary assets gracefully. Mistakes are expensive.

- **Confirm before mutating Blueprints or assets.** Graph edits can corrupt
  project files, and `.uasset` files do not diff or merge usefully.
- **Check version control state first.** Uncommitted work plus an automated edit
  is how people lose a day. Prefer a clean tree.
- **Automation tests run arbitrary project code.** Treat starting a test run as
  executing the project, not as a read-only check.
- **Builds and cooks are long and resource-heavy.** Confirm before triggering
  one; do not start a cook speculatively.
- **Never install or compile a third-party engine plugin on the user's behalf.**
  Custom C++ plugins mean compiling unreviewed code into the engine — a genuine
  supply-chain decision that belongs to the user.
- **Never widen the network exposure** of the MCP or Remote Control endpoint.
- **Read the log after acting.** The Editor reports failures there that a tool
  call may report as success.

## Where Jev fits

- Classifying a request into a capability category (Choice, with
  `none_suitable`).
- Classifying a build or test failure: compile error, test regression,
  asset problem, environment issue (Choice with an `unclear` option routing to a
  human).
- Judging whether a log excerpt indicates success when the signal is textual and
  fuzzy (Noul).
- Scoring the destructiveness of a proposed operation to drive a code-side
  confirmation gate.

Jev does not generate Blueprint graphs or C++, compute transforms, or parse
build logs. Use a parser for logs and a general-purpose agent for code.
