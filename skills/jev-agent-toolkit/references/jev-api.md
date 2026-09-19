# Jev API contract

Verified against the official TypeSafe documentation (`docs.typesafe.ai`) on 2026-09-19.
Re-verify before relying on any field here; TypeSafe may change the surface.

Canonical sources:

- HTTP reference: <https://docs.typesafe.ai/api>
- Primitives: <https://docs.typesafe.ai/primitives>
- Models: <https://docs.typesafe.ai/models>
- Python SDK: <https://docs.typesafe.ai/sdk/python>
- JavaScript SDK: <https://docs.typesafe.ai/sdk/javascript>

---

## Endpoint

```
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer $TYPESAFE_API_KEY
Content-Type: application/json
```

One request carries one `state` and any number of independent `questions`. See
`jev-patterns.md` for why you should almost always batch.

## Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `state` | string \| object \| array | yes | The material being judged. Text only — no images, audio or video. |
| `model` | string | yes | Use the `jev-latest` alias unless you need a pinned version. |
| `questions` | object | yes | Map of **your** question id → question object. Ids are echoed back in `answers`. |

`questions` is a map, not a list. The keys are yours: use stable, meaningful ids
(`intent`, `severity`, `is_refund_request`) and never renumber them between
requests, because downstream code keys off them.

### Question objects

Every question has `type` and `instructions`. `instructions` accepts a string, or
a JSON object/array when you want to hand over structured context directly rather
than flattening it into a sentence.

**Choice** — pick exactly one option from a bounded set.

```json
{
  "type": "choice",
  "instructions": "Which subsystem does this bug report concern?",
  "criteria": {
    "auth": "Login, sessions, tokens, permissions.",
    "billing": "Invoices, payments, subscriptions.",
    "other": "Anything not covered above."
  }
}
```

`criteria` is required: a map of option name → description. Descriptions may be
`null` when the option name speaks for itself. Up to 255 options.

**Score** — place the state on an ordered scale.

```json
{
  "type": "score",
  "instructions": "How severe is the user impact described here?",
  "criteria": [
    "No impact: cosmetic only.",
    "Minor: annoying, workaround exists.",
    "Major: core workflow blocked.",
    "Critical: data loss or total outage."
  ]
}
```

`criteria` is required: an **ordered array** of level descriptions, minimum 2 and
maximum 10. Array order defines the level numbering, starting at 0.

**Noul** — probability that a yes/no proposition is true.

```json
{
  "type": "noul",
  "instructions": "Is the author explicitly asking for a refund?",
  "criteria": {
    "true": "An explicit request for money back.",
    "false": "Complaints or questions without a refund request."
  }
}
```

`criteria` is optional for Noul; supply it when `true`/`false` need disambiguation.

## Response body

```json
{
  "model": "jev-1.13.0",
  "answers": {
    "intent":            { "type": "choice", "choice": "billing",
                           "probabilities": { "auth": 0.04, "billing": 0.93, "other": 0.03 },
                           "confidence": 0.91 },
    "severity":          { "type": "score", "score": 2.3,
                           "probabilities": { "0": 0.01, "1": 0.12, "2": 0.48, "3": 0.39 },
                           "legend": { "0": "No impact: …", "1": "Minor: …",
                                       "2": "Major: …",     "3": "Critical: …" },
                           "confidence": 0.62 },
    "is_refund_request": { "type": "noul", "noul": 0.88 }
  },
  "usage": { "input_tokens": 1180, "output_tokens": 48 }
}
```

| Answer type | Fields returned |
|---|---|
| `choice` | `choice`, `probabilities`, `confidence` |
| `score` | `score`, `probabilities`, `legend`, `confidence` |
| `noul` | `noul` |

Three things that trip people up:

1. **Noul returns no `confidence` field.** Do not fabricate one. The `noul` value
   is itself the probability — values near 0.5 mean the model is torn, not that
   the answer is "medium".
2. **`score` is a weighted average** over the level probabilities, so `2.3` means
   the distribution sits between levels 2 and 3. It is a position on your
   described scale, not a physical measurement.
3. **`model` in the response is the concrete version** that served the request
   (e.g. `jev-1.13.0`) even when you asked for `jev-latest`. Log it — it is what
   makes a result reproducible later.

Keep `probabilities` when you persist results. The distribution carries strictly
more information than the single `confidence` number derived from it.

## Models

| Id | Meaning |
|---|---|
| `jev-latest` | Alias for the current stable release. SDK default. |
| `jev-preview` | Alias for the preview track. |
| `jev-1.13.0` | Pinned version. |

Use `jev-latest` for general work. Pin an explicit version when you have tuned
thresholds against labeled data and need the behaviour to stay put — then
re-validate deliberately when you move the pin.

## Errors

| Status | Meaning | Retry? |
|---|---|---|
| 400 | Malformed request | No — fix the request. |
| 401 | Missing or invalid API key | No. |
| 403 | Permission denied | No. |
| 404 | Unknown resource/model | No. |
| 422 | Request failed validation | No — fix the schema. |
| 429 | Rate limited | Yes, exponential backoff. |
| 5xx / 529 | Server error / overloaded | Yes, exponential backoff, bounded attempts. |

Retry only 429 and 5xx, with a hard cap on attempts and jittered backoff. Never
retry a 4xx: it will fail identically every time.

## SDKs

Prefer the official SDKs over hand-rolled HTTP. They handle auth, typing and
retries, and they track API changes for you.

**Python** — package `typesafe-sdk`, module `typesafe_sdk`:

```python
from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

with TypeSafeClient() as client:            # reads TYPESAFE_API_KEY from the env
    response = client.system_one(
        state={"subject": subject, "body": body},
        questions={
            "intent": Choice(
                instructions="Which subsystem does this concern?",
                criteria={"auth": "Login and tokens.", "billing": "Invoices.", "other": None},
            ),
            "severity": Score(
                instructions="How severe is the user impact?",
                criteria=["No impact", "Minor", "Major", "Critical"],
            ),
            "is_refund_request": Noul(instructions="Is the author asking for a refund?"),
        },
    )

response.choices["intent"].choice          # -> "billing"
response.scores["severity"].score          # -> 2.3
response.nouls["is_refund_request"].noul   # -> 0.88
```

Note the accessor difference between SDKs: **Python groups answers by primitive**
(`response.choices`, `response.scores`, `response.nouls`), while the HTTP API and
the JavaScript SDK return one flat `answers` map keyed by question id.

`AsyncTypeSafeClient` is the asyncio equivalent. Both work as context managers.

**JavaScript / TypeScript** — package `@typesafe-ai/sdk`, requires Node.js 20+:

```ts
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();        // reads TYPESAFE_API_KEY from the env
const { answers, model, usage } = await client.systemOne({
  state: { subject, body },
  questions: {
    intent: choice("Which subsystem does this concern?", {
      auth: "Login and tokens.",
      billing: "Invoices.",
      other: null,
    }),
    isRefundRequest: noul("Is the author asking for a refund?"),
  },
});

answers.intent.choice;            // typed to the criteria keys
answers.isRefundRequest.noul;
```

`choice`, `score` and `noul` are exported helpers. Answer types are inferred from
the questions you passed, so `answers.intent.choice` is narrowed to your option
names rather than plain `string`.

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `TYPESAFE_API_KEY` | Authentication | — (required) |
| `TYPESAFE_BASE_URL` | API base | `https://api.typesafe.ai` |
| `TYPESAFE_DEFAULT_MODEL` | Model when unspecified | `jev-latest` |
| `TYPESAFE_LOG_LEVEL` | SDK log verbosity | — |

The documented default request timeout is 10 seconds.

### Python exception hierarchy

```
TypeSafeError
├── TypeSafeAPIError
│   ├── TypeSafeBadRequestError            (400)
│   ├── TypeSafeAuthenticationError        (401)
│   ├── TypeSafePermissionDeniedError      (403)
│   ├── TypeSafeNotFoundError              (404)
│   ├── TypeSafeUnprocessableEntityError   (422)
│   ├── TypeSafeRateLimitError             (429)
│   ├── TypeSafeInternalServerError        (5xx)
│   └── TypeSafeAPIResponseValidationError
└── TypeSafeAPIConnectionError
    └── TypeSafeAPITimeoutError
```

Catch the specific classes. `TypeSafeRateLimitError` and
`TypeSafeInternalServerError` are the retryable ones.

## Key handling

- Read the key from the environment. Never pass it as a CLI argument — argv is
  visible to other processes and lands in shell history.
- Never commit a key, never log it, never echo it in an error message.
- Ship `.env.example` with a placeholder, and keep `.env` in `.gitignore`.
- When a request fails, log the status code and question ids — not the key, and
  not the raw state.
