# Multi-agent orchestration

Delegation is an optimisation, never a requirement. Every workflow here must
produce the same result when executed sequentially by one agent.

## Detect, then choose

Determine whether the current environment offers delegated agents, parallel
workers, isolated contexts, or selectable worker models. Do not assume — and do
not reach for a provider-specific mechanism by name.

If delegation is available, use the lead–worker shape:

```
LEAD
  decompose into independent bounded workstreams
  -> delegate each with a self-contained brief
  -> collect results
  -> resolve contradictions against primary sources
  -> integrate
  -> validate
```

If it is not available, run the same decomposition in sequence. The decomposition
is the valuable part; parallelism only makes it faster.

## What to delegate

Delegate a workstream when it is **independent**, has a **bounded deliverable**,
and benefits from **isolated context** — typically research, or reviewing a
completed artifact with fresh eyes.

Do not delegate trivial reads, single-file edits, tightly sequential work, or
anything where briefing costs more than doing. Handing over a task whose context
takes longer to explain than to execute is a net loss.

Keep with the lead: architecture decisions, integration, conflict resolution,
and final acceptance. Workers supply evidence; the lead owns the result.

One delegation layer is enough. Recursive agent trees multiply cost and
coordination failure far faster than they add capability. Aim for a handful of
focused roles, not a swarm.

## Briefing a worker

A worker starts cold. It has not seen the conversation and does not know why the
task matters. A terse instruction produces shallow work.

A good brief states the goal, the context needed to make judgment calls, what is
already known or ruled out, the exact deliverable, and a length cap. For lookups,
hand over the exact query. For investigations, hand over the question — prescribed
steps become dead weight when the premise turns out to be wrong.

Instruct workers explicitly not to invent facts, and to report gaps as gaps. A
documented "not found" is far more useful than a plausible guess, because a guess
has to be discovered and undone later.

## Worker output is evidence, not truth

Treat a worker's report as a claim to verify, not a finding to adopt. Reports
describe what the worker intended, which is not always what it did.

- Check load-bearing facts against primary sources yourself, especially version
  numbers, package names, API fields and config syntax.
- Where a worker flags uncertainty, resolve it before encoding it.
- When two workers contradict each other, go to the primary source. Do not
  average them, and do not pick the more confident-sounding one.
- If a worker wrote code, read the actual diff before reporting it as done.

## Model selection where supported

When the environment offers multiple model classes, reserve the strongest for
architecture, hard synthesis, conflict resolution and final review. Bounded
specialist work — targeted research, mechanical transformation, first-pass
review — runs well on a cheaper capable model.

Concrete model names belong in the per-agent adapter docs, never here. This
document must stay true when the model line-up changes.

## Where Jev fits

Jev is a judgment layer inside orchestration, not an orchestrator:

- Scoring whether a worker's deliverable meets the acceptance criteria (Score).
- Deciding whether two workers' findings actually conflict (Noul) before
  spending a reconciliation pass on them.
- Routing an incoming subtask to the right specialist role (Choice).

Jev does not decompose tasks, write briefs, or integrate results. Those are
generative and architectural work.

## Avoiding collisions

Do not let two workers edit the same files concurrently unless isolation is
guaranteed. Prefer giving each worker a disjoint file set, or making research
workers read-only and having the lead do all the writing.

Parallel *research* is nearly always safe. Parallel *writing* needs a plan.
