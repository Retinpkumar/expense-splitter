<!--
Purpose:
Template a PM uses to groom a backlog item into an implementation-ready task
(GitHub Issue) per _docs/PROCESS.md. Copy the "Template" section below into
the issue body and fill it in — don't leave a section empty; write "None" if
it genuinely doesn't apply.

A task is not groomed until all four sections are filled in
(_docs/PROCESS.md -> Roles -> Product/PM).
-->

# Task Template

## Title

`type(scope): description` — Conventional Commits format, matching the
branch/commit convention in `AGENTS.md`. Same title the branch and PR will use.

## Template

```markdown
## Goal
<One or two sentences: what should be true after this task is done. Describe
the end state, not the steps to get there.>

## Acceptance Criteria
- [ ] <Checkable statement — something that can be verified by running a
      command or inspecting a response, not a vague intention.>
- [ ] <...>

## Out of Scope
- <Something adjacent this task must NOT do — prevents scope creep and tells
  the engineer what NOT to touch, even if it looks related.>
- <...>

## Constraints
- **Files:** <where the change should live, e.g. `backend/app/services/` —
  see `AGENTS.md` -> Architecture>
- **Dependencies:** <libraries it should/shouldn't use, e.g. "no new
  dependency without asking" — see `AGENTS.md` -> Dependencies>
- **Prior decisions:** <link relevant entries from `_docs/DECISIONS.md`,
  e.g. "#4 custom splits must sum to total", "#3 no auth in v1">
- **Depends on:** <other issue(s) that must be merged first, or "None">
```

## Section Guidance

### Goal

- Describes the *end state*, not the implementation. "The balances endpoint
  returns per-currency balances for a group" not "add a router that calls
  the service and returns JSON."
- One or two sentences. If it takes a paragraph, the task is probably too big
  — split it (see "Splitting a Task" below).

### Acceptance Criteria

- Each line must be checkable: a test that can pass/fail, a command whose
  output can be inspected, a response shape that can be diffed. Not "works
  well" or "handles edge cases" — name the edge cases.
- Pull directly from `_docs/BACKLOG_SCOPE.md` / `_docs/GITHUB_ISSUES.md` when
  the task originates from the locked backlog; add any criteria that source
  is missing (e.g. specific error cases from `_docs/TESTING_GUIDELINES.md` →
  "Edge Cases to Cover").
- These become the checklist QA verifies against (`_docs/PROCESS.md` → "QA
  Lifecycle") — if it's not listed here, QA won't check it, so don't assume
  something is implied.

### Out of Scope

- Every task needs at least one line here, even an obvious one. It's the
  fastest way to stop an engineer or QA from silently expanding the task.
- Common ones worth stating explicitly on this project: "does not add
  authentication" (no auth in v1 — `_docs/DECISIONS.md` #3), "does not touch
  `_docs/BACKLOG_SCOPE.md` or `_docs/GITHUB_ISSUES.md`" (PM/orchestrator-only
  per `_docs/PROCESS.md` → "Shared Files"), "does not add a new dependency."
- If a task's natural boundary would require touching a shared-resource
  hotspot (`_docs/PROCESS.md` → "Shared Files / Conflict Hotspots"), say so
  here so it's sequenced rather than parallelized.

### Constraints

- **Files:** point at the specific directory/module per `AGENTS.md` →
  Architecture (e.g. business logic → `app/services/`, not inline in a
  router). If the task must avoid editing a hotspot file directly (e.g.
  `app/main.py` router registration), say so.
- **Dependencies:** state whether a new dependency is allowed; if it is,
  name it. Default is "no new dependency without asking" per `AGENTS.md`.
- **Prior decisions:** cite the specific `_docs/DECISIONS.md` entries this
  task must not contradict. An engineer shouldn't have to go re-derive "are
  splits allowed to be uneven" — the task should tell them.
- **Depends on:** issue numbers/titles that must be merged into `main`
  first, matching `_docs/GITHUB_ISSUES.md`'s `Depends on:` lines. Used by the
  orchestrator to place the task in the correct wave
  (`_docs/PROCESS.md` → "Wave Rules").

## Splitting a Task

If Goal needs "and" to describe it, or Acceptance Criteria mixes two
unrelated behaviors, split into two tasks with their own `Depends on:` edge
rather than grooming one oversized task.

## Example

```markdown
## Goal
A group's balances are computed correctly across multiple expenses and
partial settlements, without mixing currencies.

## Acceptance Criteria
- [ ] Given one expense with an even split, balances reflect it correctly.
- [ ] Given multiple expenses, balances net correctly across all of them.
- [ ] A partial settlement reduces the relevant balance, not zeroes it out.
- [ ] Balances for different currencies within the same group are never
      summed or netted together.
- [ ] Implemented as a plain function in `app/services/`, callable without
      going through the HTTP layer.

## Out of Scope
- Does not expose an HTTP endpoint (that's a separate, dependent task).
- Does not handle currency conversion — currencies stay separate, never
  converted or combined.

## Constraints
- **Files:** `backend/app/services/balances.py` (new file); tests in
  `backend/tests/test_balances.py`.
- **Dependencies:** none new — use only what's already in `pyproject.toml`.
- **Prior decisions:** `_docs/DECISIONS.md` #5 (per-currency balances, never
  mixed), #7 (over-settlement must be handled, not blocked).
- **Depends on:** `feat(db): add models and migrations`,
  `feat(expenses): add expense creation with custom splits`.
```
