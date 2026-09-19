# Coding and building

Jev does not write code. A general-purpose agent does. This document is about
where bounded judgment helps inside a development workflow, and what the
workflow should look like regardless.

## The loop

```
UNDERSTAND -> INSPECT -> IMPLEMENT -> RUN -> VERIFY -> FIX -> COMPLETE
```

**Understand** the actual request, including what is deliberately out of scope.

**Inspect** before writing. Read the neighbouring code, follow the conventions
already there, check how similar things are done in this codebase. Existing
patterns beat imported ones.

**Implement** the smallest change that does the job. No speculative
abstractions, no adjacent cleanup, no error handling for conditions that cannot
occur, no backwards-compatibility shims unless something actually depends on the
old behaviour.

**Run** it. Tests, linter, type checker, build — whatever the project has.

**Verify** by reading the output, not by assuming the command succeeded.

**Fix** real failures. Never weaken a test to make it pass, never add `--no-verify`
to get past a hook, never delete an assertion because it is inconvenient. A
failing check is information.

**Complete** means validated. If execution tools are available, stopping after
generating code is stopping halfway. If they are not available, say so explicitly
rather than implying the code was tested.

## Where Jev earns its place

Use it for bounded judgment where a probability improves routing:

- **Triage.** Classify an incoming bug report by subsystem (Choice) and user
  impact (Score); route by threshold in code.
- **Change risk.** Score a diff's risk class to decide whether it needs a second
  reviewer or a human sign-off.
- **Review property checks.** Noul questions over a diff: does it log secrets?
  does it add a network call? does it widen a permission? Each is a bounded
  property, and a batch of them is one request.
- **Duplicate detection.** Noul per candidate issue, batched, threshold in code.
- **Relevance ranking.** When searching a large codebase, rank candidate files by
  whether they plausibly contain the thing being looked for.
- **Test-failure classification.** Is this failure a flake, a real regression, or
  an environment problem? Choice, with an `unclear` option that routes to a human.

These share a shape: many similar bounded judgments, batched into one request,
with the policy applied afterwards in code.

## Where it does not belong

Never use Jev for compilation, arithmetic, parsing, diff application, dependency
resolution, or test assertions. Those have exactly one correct answer and belong
to deterministic code.

Never let a Jev answer alone decide to merge, deploy, delete, force-push, or
rewrite history. Those are irreversible or shared-state actions: they need a
deterministic check and, in most cases, explicit human confirmation.

Never ask Jev to generate code, commit messages, or documentation. It was not
trained to generate text and performs poorly when pushed to.

## A worked example

Automated triage for incoming issues:

```python
# 1. Deterministic: parse and normalise. Never Jev.
issue = parse_issue(payload)
age_days = (now - issue.created_at).days        # dates are code's job

# 2. One batched Jev request for every judgment, including speculative ones.
response = client.system_one(
    state={"title": issue.title, "body": issue.body, "labels": issue.labels},
    questions={
        "subsystem":       Choice(instructions="...", criteria={...}),
        "impact":          Score(instructions="...", criteria=[...]),
        "is_regression":   Noul(instructions="..."),
        "is_security":     Noul(instructions="..."),
        "has_repro_steps": Noul(instructions="..."),
    },
)
subsystem = response.choices["subsystem"]

# 3. Deterministic: policy, thresholds, side effects. Never Jev.
if response.nouls["is_security"].noul > 0.5:
    route_private_security(issue)            # deliberately conservative
elif subsystem.confidence < 0.60:
    route_to_triage_human(issue)
else:
    assign(issue, team_for[subsystem.choice])
    if response.scores["impact"].score >= 2.5:
        escalate(issue)

# 4. Persist the evidence, not just the verdict.
store(issue.id, model=response.model,
      subsystem_probabilities=subsystem.probabilities,
      impact_probabilities=response.scores["impact"].probabilities)
```

Note what code owns: the date arithmetic, every threshold, the conservative
security bias, and all the side effects. Jev supplied five judgments in one
round-trip and nothing else.

## Validation before declaring done

Before reporting a task complete, confirm you actually ran what you claim to
have run. Do not report hypothetical results, and do not describe a test suite as
passing when you did not execute it.

If you changed UI or user-visible behaviour and could not exercise it, say so
explicitly. Type checks and unit tests verify code correctness, not feature
correctness.
