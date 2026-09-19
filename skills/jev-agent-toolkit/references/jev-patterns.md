# Orchestration patterns

Ways to wire Jev into a working system. Each one keeps control flow in code and
uses Jev only for the bounded judgment.

## 1. Fan-out — batch everything into one request

The foundational pattern, and the one most often missed.

TypeSafe evaluates the questions in a request in parallel, so adding questions
usually costs little or no extra latency. A second request costs a full network
round-trip. Therefore: send every question you *might* need, including
speculative ones, and let code decide afterwards which answers were relevant.

```python
response = client.system_one(
    state=ticket,
    questions={
        "intent":      Choice(instructions="...", criteria={...}),  # always needed
        "severity":    Score(instructions="...", criteria=[...]),   # always needed
        "is_refund":   Noul(instructions="..."),   # only if intent == billing
        "is_security": Noul(instructions="..."),   # only if intent == auth
        "needs_human": Noul(instructions="..."),
    },
)
# Code decides what to read. The unused answers cost almost nothing.
```

The instinct to "save tokens" by asking only what you need leads to sequential
round-trips, which is the expensive thing. Ask speculatively, branch in code.

Split into a second request only when a later question genuinely depends on an
earlier answer — for instance when the first answer determines the option set of
the second question.

## 2. Confidence-gated routing

The answer tells you *what*. Confidence tells you *whether to act on it*.

```python
answer     = response.choices["intent"]
confidence = answer.confidence

if confidence < 0.60:
    route_to_human(ticket)                 # too uncertain to automate
elif risk_of(answer.choice) == "high":
    require_confirmation(ticket, answer)   # confident, but consequential
else:
    handlers[answer.choice](ticket)
```

Three rules:

- The thresholds live in code, versioned and reviewable — not in the question.
- Higher-stakes actions need higher thresholds, and the highest-stakes ones need
  a deterministic check or human confirmation regardless of confidence.
- The numbers above are starting points, not recommendations. Tune them against
  labeled data from your own domain.

Every gate needs a real destination. "Route to human" is only a design if
somebody is actually there.

## 3. Composite scoring

Break a complex judgment into atomic scores, then combine them with weights you
control.

```python
questions = {
    "clarity":      Score(instructions="...", criteria=[...]),
    "completeness": Score(instructions="...", criteria=[...]),
    "risk":         Score(instructions="...", criteria=[...]),
}
# ... one request ...

weights = {"clarity": 0.3, "completeness": 0.3, "risk": 0.4}
composite = sum(
    (response.scores[k].score / max_level[k]) * w   # normalise, then weight
    for k, w in weights.items()
)
```

Asking one vague "how good is this overall?" question hides the tradeoff inside
the model. Splitting it means you can change what "good" means by editing a
weight instead of rewriting a rubric — and you can see *which* dimension pulled
a result down.

## 4. Intent routing

Classify first, then dispatch to the cheapest worker that can handle it.

```
incoming request
  -> Jev: intent (Choice) + complexity (Score), one request
  -> code:
       low confidence        -> human
       high complexity       -> strong LLM
       simple + known intent -> deterministic handler
       otherwise             -> specialist LLM
```

This is how a Jev-first system stays cheap: most traffic never reaches a
frontier model, because a bounded classification was enough to route it.

## 5. Generative guardrail

An LLM generates; Jev checks bounded properties of the output; code decides.

```
LLM drafts reply
  -> Jev (one request):
       does it disclose internal information?   (noul)
       does it make a commitment we cannot keep? (noul)
       tone appropriate?                         (score)
  -> code: accept | regenerate | escalate
```

This is a property check against criteria you defined. It is **not** general
fact-checking, and it is not a security boundary — a determined adversary
attacks the criteria you forgot to write. Combine with deterministic checks
(regex for key material, allowlists for URLs) rather than replacing them.

## 6. Candidate ranking and filtering

Code or an LLM produces candidates; Jev judges each one; code applies the policy.

```
generate candidates (code / LLM / retrieval)
  -> Jev: one question per candidate, all in ONE request
  -> code: threshold, rank, take top-k
```

Works for reranking search results, deduplicating records, matching entities.
The selection rule — top-k, threshold, tie-breaks — belongs in code where it is
testable.

## 7. Retrieval relevance

A concrete case of ranking, worth calling out because it is so common in RAG.

```
retrieve N passages (vector search — deterministic)
  -> Jev: "does this passage help answer the question?" per passage, one request
  -> code: keep those above threshold
  -> answering LLM sees only the survivors
```

Vector similarity is not relevance. This filter removes passages that are
topically near but useless, which is usually where RAG answers go wrong.

## 8. Extraction cascade

For extraction, separate finding candidates from choosing among them.

```
regex / parser finds candidate spans      <- exact work, code
  -> Jev chooses which span was asked for <- judgment
  -> code validates the chosen span       <- exact work
```

Do not ask Jev to extract a date and then trust it to compare dates. Extract with
code, judge with Jev, compute with code.

---

## Cross-cutting rules

- **One request per state.** Batch aggressively; split only on real dependencies.
- **Thresholds in code.** Versioned, testable, reviewable.
- **Persist `probabilities`, not just the answer.** You will need it to tune.
- **Log the returned `model` id.** It is what makes a past result reproducible.
- **Every low-confidence branch needs a destination.** Otherwise it is a silent
  failure path.
