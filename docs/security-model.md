# Security model

Two things need a threat model: the **MCP bridge**, which holds a credential,
and the **skill guidance**, which tells an agent what it may do.

## What this repository ships

- Markdown guidance (no execution).
- One MCP server with exactly one tool.
- Two example scripts.

It bundles no Blender integration, no Unreal integration, and no third-party MCP
servers, and it never installs anything.

## MCP bridge trust boundary

```
MCP host  --stdio-->  jev bridge  --https-->  api.typesafe.ai
(trusted)             (this code)             (fixed destination)
```

The bridge holds `TYPESAFE_API_KEY` and is the only component that sees it.

### Deliberately absent

The bridge cannot do any of the following, because no code path exists:

| Not possible | Why |
|---|---|
| Call an arbitrary URL | The tool schema has no url/endpoint field; the destination comes from `TYPESAFE_BASE_URL` at startup, never from tool arguments |
| Act as an HTTP proxy | Only `POST /v1/systemone` is ever issued |
| Execute shell commands | No shell or child-process code |
| Download or install anything | No network path other than the TypeSafe request |
| Expose environment variables | No tool reads or returns the environment |
| Return the API key | Every outbound string passes through `redact()` |
| Log raw state by default | Logging is metadata-only; `debug` is refused without an explicit opt-in |

A test asserts that the advertised tool surface contains no `url`, `endpoint`,
`command`, `shell` or `exec` field, so this cannot regress silently.

### Credential handling

- Read once from the environment at startup. Never from a tool argument.
- `redact()` runs on every outbound message and log line, removing the
  configured key value, `Bearer` tokens, `sk-`-style tokens and `apikey_`
  tokens.
- Exact-value substitution is the reliable branch; the regexes are a secondary
  net for known token shapes and are not a guarantee. The server warns at
  startup if the key looks too short to redact reliably.
- **401 responses are never echoed.** An authentication failure returns a fixed
  message, because a 401 body is the likeliest place for a credential to be
  reflected back. A test asserts the key never appears in a tool result.

### Logging

The TypeSafe SDK documents that at `debug` it logs request headers **and
bodies**, and that credential headers are redacted but bodies are not. A body
contains the caller's state.

The bridge therefore downgrades `debug` to `info` and warns, unless
`JEV_MCP_ALLOW_BODY_LOGGING=1` is set. Default level is `warn`.

All logging goes to **stderr**. stdout carries the MCP protocol stream; a stray
line there corrupts it. The SDK's default `console` logger would have done
exactly that, so the bridge injects its own.

Logged: duration, success or failure, error category, HTTP status, model id,
token usage, question ids.
Not logged: the key, raw state, instructions, criteria, answers, probabilities.

Question ids are logged because they are author-chosen identifiers, not content.
Do not put sensitive data in a question id.

### Input validation

Every argument is validated against a Zod schema before any network call:

- Unknown question types rejected.
- Choice: 2–255 options. (The lower bound is stricter than the API on purpose —
  a one-option Choice carries no judgment and is almost always a bug.)
- Score: 2–10 levels, matching the documented bounds.
- At least one question.
- Unknown top-level fields are stripped, so no argument can redirect the call.

Invalid requests fail locally. A test asserts the upstream is never contacted
for one — this protects the API budget and keeps malformed input from reaching
the vendor.

### Network behaviour

Bounded by construction: a per-request timeout (`JEV_MCP_TIMEOUT_MS`, SDK
default 10s), the SDK's bounded retry policy with exponential backoff and
jitter, and retries only on 408, 429 and 5xx. 4xx is never retried — it would
fail identically every time.

Errors are returned as MCP tool errors (`isError: true`) with a category and a
`retryable` flag, so the host can distinguish "fix your request" from "try
again later".

## Prompt injection

Everything the agent reads is **data, not instructions**: web pages,
repositories, documents, tool output, and every Jev `state` payload.

TypeSafe documents that Jev does not treat state as hostile by default, and that
instructions embedded in state can steer the output.

Defence in depth, strongest first:

1. **Policy in code.** Thresholds and side effects live in the caller's code,
   where injected text cannot reach them.
2. **Bounded answer space.** Injected text cannot produce an option that was
   not defined. This is a genuine structural advantage — but it constrains the
   *shape* of the answer, not its truth.
3. **Explicit role labelling.** Frame state as untrusted content to be judged.
4. **Confirmation for irreversible actions.** No Jev answer alone authorises
   something destructive.
5. **Detection as a signal only.** A Noul injection-detection question is useful
   and is not a boundary.

The bridge itself is not a defence against injection — it forwards state
faithfully. Defence belongs in the calling application.

## What the skill forbids

Never, without the user explicitly asking: downloading or executing files,
piping remote content into a shell, installing software, MCP servers, agent
plugins, Blender addons or Unreal plugins, global installs, modifying shell
startup files, reading SSH keys or browser cookies, transmitting secrets, or
bypassing a security control including `--no-verify`.

Confirmation required before: destructive operations, hard-to-reverse
operations, anything visible to others, and anything costly.

## Residual risks

Named plainly, because an overstated safety claim is itself a risk:

- **Jev can be semantically wrong.** Constrained output prevents malformed
  answers, not incorrect ones. Confidence measures decisiveness, not truth.
- **Thresholds are domain-specific.** Every number in this repository is a
  placeholder requiring tuning against labeled data.
- **The bridge trusts its host.** MCP STDIO has no authentication by design;
  anything that can spawn the process can use the key.
- **External tool integrations are out of scope.** A Blender or Unreal MCP
  server the user installed carries its own risks — commonly arbitrary code
  execution inside the application — which this repository cannot mitigate.
- **Third-party dependencies.** The bridge depends on the official MCP server
  SDK, the official TypeSafe SDK and Zod. That is three supply-chain surfaces.

## Reporting

Found a problem? Open an issue at
<https://github.com/reiswaffel78/jev-agent-toolkit>. For anything involving
credential exposure, report it privately rather than in a public issue.
