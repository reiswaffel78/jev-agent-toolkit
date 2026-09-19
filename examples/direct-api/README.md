# Direct API examples

Mode A: talk to TypeSafe directly, no MCP bridge involved.

Both scripts do the same thing — triage a support ticket — and both demonstrate
the shape this toolkit recommends:

1. Deterministic parsing first.
2. **One** request containing every judgment, including speculative ones.
3. Thresholds and side effects in code, never inside the question.
4. Probabilities kept, not just the verdict.

## Run

```bash
export TYPESAFE_API_KEY=...        # never hardcode it, never pass it as an argument
```

Python:

```bash
pip install typesafe-sdk
python triage.py
```

JavaScript (Node.js 20+):

```bash
npm install @typesafe-ai/sdk
node triage.mjs
```

Both read `TYPESAFE_API_KEY` from the environment. Neither takes it as a
parameter — argv is visible to other processes and ends up in shell history.

## The accessor difference

The two SDKs surface answers differently. This trips people up when porting:

| | Python | JavaScript |
|---|---|---|
| Module | `typesafe_sdk` | `@typesafe-ai/sdk` |
| Method | `client.system_one(...)` | `client.systemOne({...})` |
| Choice answer | `response.choices["id"].choice` | `answers.id.choice` |
| Score answer | `response.scores["id"].score` | `answers.id.score` |
| Noul answer | `response.nouls["id"].noul` | `answers.id.noul` |

Python groups by primitive; JavaScript (like the raw HTTP API) returns one flat
`answers` map. The JavaScript types also narrow `choice` to your literal option
names rather than plain `string`.

## Things worth noticing in the code

**Noul has no confidence.** `isAccountTakeover` is gated on the probability
itself, because there is no `confidence` field to consult.

**The security threshold is deliberately asymmetric.** 0.5 rather than 0.85: a
false positive costs a human review, a false negative costs a compromised
account. Thresholds encode what you are willing to be wrong about.

**Every low-confidence branch has a destination.** "Route to human" is only a
design if somebody is there.

**These numbers are placeholders.** Tune them against labeled data from your own
domain before relying on them — see
[`jev-limitations.md`](../../skills/jev-agent-toolkit/references/jev-limitations.md).
