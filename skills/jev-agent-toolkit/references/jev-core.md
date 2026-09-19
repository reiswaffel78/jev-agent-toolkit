# Jev core: what it is and when to reach for it

Jev is a **System One** model from TypeSafe. It does not write prose or code. You
give it a `state` and a set of typed `questions`, and it returns typed answers
with calibrated probability distributions.

That constraint is the whole point. A normal LLM answers "which category is
this?" with a sentence you then have to parse. Jev answers with one of the
options you defined, plus the probability mass behind every option.

## The division of labour

This toolkit assumes four distinct workers. Giving work to the wrong one is the
most common way to build something fragile.

| Worker | Owns | Never owns |
|---|---|---|
| **Deterministic code** | Arithmetic, counting, dates, parsing, file I/O, builds, policy enforcement, control flow | Semantic judgment |
| **Jev** | Bounded semantic judgment with a probability attached | Generation, exact computation, control flow |
| **General-purpose LLM** | Open-ended reasoning, writing prose and code, generating candidates | Anything code can do exactly |
| **External tools** | Actions in the world — browsers, Blender, Unreal, APIs | Deciding whether the action was appropriate |

Jev sits in the middle as a judgment layer. It is not the orchestrator, and it is
not a replacement for the general-purpose agent you are already running.

## The decision gate

Before routing a subproblem to Jev, check all four. If the answer to most of
these is no, do not use Jev for it.

1. **Is the answer space bounded?** Can it be expressed as one option from a set,
   a position on an ordered scale, or a yes/no proposition? If the honest answer
   is free text, this is not a Jev problem.
2. **Is it semantic judgment rather than exact computation?** "Is this message
   angry?" is judgment. "How many messages are there?" is arithmetic — use code.
3. **Can the state be made small and explicit?** Jev degrades when the state is
   padded with irrelevant material. If you cannot narrow it, narrow it first.
4. **Does a probability improve the downstream decision?** If you would treat
   0.51 and 0.99 identically, the distribution is not earning anything — though
   it is still cheap insurance for later tuning.

A worked example. "Triage this bug report and file it" decomposes into:

- Parse the report into fields → **code**
- Which subsystem does it concern? → **Jev** (Choice)
- How severe is the user impact? → **Jev** (Score)
- Is this a duplicate of an existing issue? → **Jev** (Noul, one per candidate)
- How many open issues does that subsystem have? → **code**
- Write the issue summary → **general-purpose LLM**
- Create the issue → **tool**
- Is severity ≥ 3 AND confidence ≥ 0.85? → **code** (policy, not judgment)

Note the last line. The *threshold* is policy and belongs in code where it is
readable, testable and auditable. Jev supplies the judgment; it does not decide
what your organisation does with it.

## The three primitives

Exact schemas are in [jev-api.md](jev-api.md). This is how to choose between them.

### Choice — one option from an unordered set

Use when the options are genuinely distinct categories. Route by intent, pick a
handler, select a label from a taxonomy.

- Make options mutually exclusive. Overlap forces the model to split probability
  between answers that mean nearly the same thing, which reads as low confidence.
- Include an `other` or `none` option whenever the set might be incomplete.
  Without an escape hatch the model must misclassify.
- Describe each option. The description is what the model matches against; a bare
  label like `tier_2` carries no meaning.

### Score — a position on an ordered scale

Use when the levels have a natural order: severity, quality, urgency, risk.

- Each level must be independently understandable. A reader should be able to
  assign a level without seeing the neighbouring ones.
- Between 2 and 10 levels. Fewer levels are usually more reliable — if you cannot
  articulate the difference between level 6 and level 7, neither can the model.
- The returned `score` is a weighted average over the level probabilities, so
  `2.3` means the distribution straddles levels 2 and 3. Treat it as a position
  on your described scale, never as a measurement of a physical quantity.

### Noul — probability that a proposition is true

Use for a crisp yes/no where the probability itself is the useful output.

- Phrase it as a single unambiguous proposition. "Is the author asking for a
  refund?" works. "Is the author upset and asking for a refund?" is two
  questions wearing a trenchcoat — split it.
- **Noul returns no separate confidence value.** The probability is the signal.
- Values near 0.5 mean the model is torn, not that the answer is "medium". If you
  need a middle category, you wanted a Score.

## Writing questions that work

**One judgment per question.** Compound questions produce compound confusion.

**Write literally.** Jev answers the question you wrote, not the one you meant.
Negations and scoping are taken at face value, so prefer positive phrasing:
"Does this contain personal data?" over "Is this free of personal data?"

**Point at the state.** When state is a JSON object, name the field you care
about: "Considering only the `body` field, …". This is more reliable than hoping
the model infers which part matters.

**Keep policy out of the question.** Ask "how severe is this?" and let code apply
"severity ≥ 3 requires human review". Do not ask "should this be escalated?"
unless escalation really is a semantic judgment rather than a rule.

**Keep instructions and criteria consistent.** If the instructions ask about
urgency and the levels describe complexity, the model has to guess which one you
meant — and contradictory criteria is a documented failure mode.

## Batch aggressively

Multiple questions over the same state belong in **one** request. TypeSafe
evaluates them in parallel, so additional questions typically add little or no
latency, while a second round-trip costs a full network hop.

Use a second request only when a later question genuinely depends on an earlier
answer — for example when the first answer determines which option set the second
question should use.

Questions in one request are independent. Do not phrase one question so that it
refers to another's answer, and do not assume structural relationships hold
between separately phrased questions: asking "is X true?" and "is X false?" will
not reliably produce probabilities that sum to 1.

See [jev-patterns.md](jev-patterns.md) for the orchestration patterns built on
top of this, and [jev-limitations.md](jev-limitations.md) before you trust any
result in a high-stakes path.
