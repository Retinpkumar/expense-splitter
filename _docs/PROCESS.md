<!--
Purpose:
Define how work moves through this project from backlog to implementation,
verification, integration, and completion.

This document describes PROCESS, not project architecture.
Keep architecture/design decisions in the project's decisions document.
Keep agent-specific coding rules in AGENTS.md.
-->

# Process — Expense Splitter

## Work Tracking

Tasks are tracked as **GitHub Issues** in this repository. `_docs/BACKLOG_SCOPE.md`
and `_docs/GITHUB_ISSUES.md` are the source backlog these issues are created
from (one `###` item → one issue).

Every task must have:

- A Conventional-Commits-style title (`type(scope): description`), matching
  the branch/commit format in `AGENTS.md`.
- A description of what it does and why.
- Explicit acceptance criteria.
- Explicit `Depends on:` references to any issue that must merge first.

## Labels / Task Categories

Each issue belongs to exactly one **epic** (organizational grouping, currently
tracked as a heading, not yet a GitHub label):

- `Epic 1: Backend Foundation` — scaffold, DB models/migrations, groups
- `Epic 2: Expenses & Splits` — expense creation, expense history
- `Epic 3: Balances & Settlements` — balance calculation, balances endpoint, settle-up
- `Epic 4: Frontend` — React app, group/expense/balance/settle-up UI
- `Epic 5: Polish` — validation, error handling, docs

Rules:

- Every task carries exactly one epic.
- New tasks must be assigned an epic (and, if the backlog implies one, an
  explicit `Depends on:` list) before implementation starts.

## Background and Source of Truth

- `_docs/BACKLOG_SCOPE.md` — the locked roadmap: epics, issues, acceptance
  criteria, and build order.
- `_docs/GITHUB_ISSUES.md` — the issue-ready expansion of the backlog,
  including explicit `Depends on:` edges between issues.
- `AGENTS.md` — engineering rules: commands, architecture, dependency
  management, git/commit conventions, testing expectations.
- `CONTRIBUTING.md` — the human-facing summary of branch/commit/PR
  conventions (kept in sync with `AGENTS.md`; if they ever diverge, treat
  that as a bug to fix, not a conflict to resolve by picking one).
- `_docs/DECISIONS.md` — architectural/design decisions and their rationale
  (framework choices, schema, split/balance/settlement rules, scope
  boundaries like "no auth in v1").
- `_docs/TASK_TEMPLATE.md` — the four-section format (Goal / Acceptance
  Criteria / Out of Scope / Constraints) every groomed issue must be written
  in before it enters a wave.
- `_docs/team/product_manager.md` — the PM role's responsibilities and inputs.
- `_docs/team/software_engineer.md` — the Engineer role's responsibilities,
  inputs, and Definition of Done.
- `_docs/team/qa.md` — the QA role's verification steps and PASS/FAIL
  reporting bar.

### Source-of-Truth Rule

When documents disagree:

1. `_docs/DECISIONS.md` wins on *architecture/design* — why something is
   built the way it is, and what's locked in as a result.
2. `_docs/BACKLOG_SCOPE.md` wins on *what* to build and in what order.
3. `AGENTS.md` wins on *how* to build it (commands, conventions, tooling).
4. This document (`_docs/PROCESS.md`) wins on how work moves between agents
   and roles.
5. An issue's own `Depends on:` and acceptance criteria override the general
   epic description when they're more specific.

Do not reopen an existing decision (e.g. the locked DB schema, the split-ratio
model) unless the decision itself is being deliberately changed — record the
change as a new entry in `_docs/DECISIONS.md` (marking the old entry
Superseded) and update `_docs/BACKLOG_SCOPE.md` to match.

## Roles

### Product / PM

Responsible for:
- Grooming backlog items into issue-ready form before implementation, using
  `_docs/TASK_TEMPLATE.md` (Goal / Acceptance Criteria / Out of Scope /
  Constraints).
- Clarifying requirements against `_docs/BACKLOG_SCOPE.md`.
- Confirming acceptance criteria are testable.
- Identifying dependencies between issues and recording them as `Depends on:`.

Follows: `_docs/team/product_manager.md`, `_docs/BACKLOG_SCOPE.md`,
`_docs/GITHUB_ISSUES.md`, `_docs/TASK_TEMPLATE.md`.

### Engineer

Responsible for:
- Implementing exactly one groomed issue.
- Writing/updating pytest tests for the change (see "Testing" in `AGENTS.md`).
- Running `uv run pytest` (and lint/format checks once one is added to the
  project) before handing off.
- Committing and pushing the work on its feature branch.

Follows: `_docs/team/software_engineer.md`, `AGENTS.md`, `CONTRIBUTING.md`.

### QA

Responsible for:
- Verifying the implementation against the issue's acceptance criteria.
- Running `uv run pytest` (and hitting the endpoint manually via
  `uv run uvicorn app.main:app --reload` where relevant) in the engineer's
  worktree.
- Reporting **PASS** or **FAIL** with concrete, actionable findings.

QA does not fix the implementation — findings go back to the engineer.

Follows: `_docs/team/qa.md`, this document's "QA Lifecycle" section, the
issue's acceptance criteria.

## Orchestrator

The main session is the orchestrator.

The orchestrator:
- Selects the next wave of issues from the backlog.
- Determines dependency order using each issue's `Depends on:` list.
- Coordinates PM, Engineer, and QA agents.
- Owns worktree/branch allocation.
- Controls the integration/merge queue.
- Integrates completed work into `main`.
- Closes completed issues.

The orchestrator does not:
- Groom tasks itself.
- Implement tasks itself.
- Perform QA itself.

## Working in Parallel

Work runs in waves. A wave is a group of issues that can be implemented
concurrently without violating `Depends on:` edges or shared-resource
constraints (see "Shared Files / Conflict Hotspots" below).

### Parallelism Limit

Maximum concurrent agents: **3** (adjust here as the project's practical
throughput becomes clear — start conservative on a two-person/agent project
like this one).

### Wave Rules

An issue may enter a wave only when:
- Every issue in its `Depends on:` list is completed and merged into `main`.
- It does not conflict with another issue already in the same wave (e.g. two
  issues that would both edit `backend/app/main.py`'s router registration).
- Shared-resource constraints have been checked (see below).
- The orchestrator has reviewed the issue's acceptance criteria and dependencies.

Everything else waits for a later wave. Do not pull in extra issues merely to
fill the parallelism limit — e.g. Epic 4 (Frontend) issues stay out of a wave
until their corresponding backend issue (per `Depends on:` in
`_docs/GITHUB_ISSUES.md`) has merged.

## Worktrees / Branches

One task = one worktree = one branch.

```bash
git worktree add ../wt/<issue-number> -b <type>/<short-description> main
```

Branch naming follows `AGENTS.md`: `type/short-description`.

Rules:
- Every implementation agent works only inside its assigned worktree.
- Nothing is implemented directly in the main checkout.
- The main checkout is reserved for integration, orchestration, and
  process/documentation work (like this file).
- An agent may read other branches/checkouts when necessary (e.g. to check
  how a dependency issue implemented something) but must not modify them.

### Worktree Setup

Before an agent starts work:

```bash
git worktree add ../wt/<issue-number> -b <type>/<short-description> main
cd ../wt/<issue-number>/backend
uv sync                                    # install deps into this worktree's .venv
uv run pytest                              # verify the environment is clean before changes
```

There is no database or `.env`-driven config yet — once one is introduced
(Epic 1, issue `feat(db): add models and migrations`), this section must be
updated to include per-worktree database/environment setup, and the
"Environment Isolation" section below must be filled in with the real
mechanism (e.g. a SQLite file per worktree, or a scoped test database name).

## Environment Isolation

Each worktree gets its own `uv`-managed `.venv` (created by `uv sync`) — `uv`
does not share virtualenvs across directories, so this is automatic as long
as agents run `uv sync` inside their own worktree rather than reusing another
worktree's `.venv`.

Once persistence is added:
- Each worktree must use its own development/test database (do not point two
  worktrees at the same SQLite file or the same schema in a shared instance).
- Watch for environment variables (e.g. `DATABASE_URL`) set globally in a
  shell session that could silently override a worktree-local `.env`.
- Verify which database/environment a command is about to run against before
  running tests or migrations.

## Running Tests

### Concurrency

- Only one `uv run pytest` may run at a time inside a given worktree.
- Do not start overlapping test runs against the same worktree/environment.
- Before starting a new run, confirm an earlier one isn't still alive.

### Waiting

Slow operations must be actively waited for — this includes `pytest` runs,
`uv sync`, the dev server, and CI runs. Run them in the foreground or poll
them to completion with a reasonable timeout. Do not assume a background
process will report its result later on its own.

### Strange Failures

If a test run produces unexpected, widespread failures:
1. Confirm no competing `pytest`/`uvicorn` process is running in the same worktree.
2. Confirm the worktree's `.venv` is in sync (`uv sync`) with `pyproject.toml`/`uv.lock`.
3. Re-run the suite once, alone and clean, before treating it as a genuine failure.

## Process for Destructive Operations

Avoid destructive operations during automated work whenever a non-destructive
alternative exists.

Do not automatically delete: worktrees, branches, generated artifacts
(`__pycache__`, `.pytest_cache`), or temporary files.

Prefer reversible operations, e.g. `git restore <path>`. When restoring or
reverting files:
1. Verify the command affected only the intended file.
2. Run `git status`.
3. Run `git diff HEAD`.
4. Confirm there are no unintended changes.

Temporary files go in the agent's own scratch/session directory — never in
`/tmp` and never committed into the repository.

If something genuinely needs deleting (a stale worktree, a branch after
merge), explain what and why, and get explicit human approval before deleting.
The one standing exception is the routine post-merge branch cleanup described
under "Integration" below, which is expected and does not need separate
per-branch approval.

## Commit Rules

- Commit regularly, one logical change per commit.
- Keep commits focused on the task at hand; don't mix unrelated changes.
- Do not commit known-failing tests.
- The engineer owns commits on their own implementation branch.

Before committing:

```bash
uv run pytest
```

(Add lint/format/type-check commands here once such tooling is added to
`backend/pyproject.toml` — none exists yet.)

## Push Rules

- Engineers push their branch after meaningful commits, and again after any
  QA-requested fixes.
- The orchestrator pushes `main` after successful integration.
- Do not force-push unless explicitly required and approved.
- If a rebase changes branch history, re-push with `--force-with-lease` on
  the feature branch only, never on `main`, and only with explicit approval.

## QA Lifecycle

For each completed issue:
1. Engineer reports implementation complete.
2. QA checks out (or reuses) the engineer's worktree and verifies the issue's
   acceptance criteria.
3. QA runs `uv run pytest` (and manual endpoint checks where relevant).
4. QA reports **PASS**, or **FAIL** with concrete findings (failing test
   names, unmet acceptance criteria, reproduction steps).
5. On FAIL, the issue returns to the engineer with QA's findings.
6. On PASS, the issue enters the integration queue.

QA does not modify the implementation.

## Integration

Branches merge one at a time.

For each branch:
1. Rebase onto current `main`.
2. Run `uv run pytest`.
3. Run lint/format/type checks once configured.
4. Run migration checks once a database exists.
5. Merge only if all required checks pass.
6. Push `main`.
7. Close the issue.
8. Rebase remaining open branches in the current wave onto the new `main`.

### Integration Principle

A branch must be tested against the current state of `main`, not only against
the code that existed when the engineer started.

If a rebase introduces a failure, return the branch to its engineer and
report it as a FAIL — do not silently repair the branch during integration.

## Merge Queue

Merge order:
1. Issues with no unmerged `Depends on:` edges, in ascending issue number.
2. Within Epic 1 (Backend Foundation), merge in the order listed in
   `_docs/GITHUB_ISSUES.md` (scaffold → DB models/migrations → groups), since
   later epics depend on this foundation.

Only one integration operation occurs at a time. The orchestrator owns the
merge queue.

## Shared Files / Conflict Hotspots

- `backend/app/main.py` — every new router gets registered here; two issues
  adding routers in the same wave will conflict. Prefer sequencing router
  registration through the merge queue rather than parallelizing it.
- `backend/pyproject.toml` / `backend/uv.lock` — any issue adding a
  dependency touches both files together (via `uv add`). Rebase-sensitive;
  resolve by re-running `uv add`/`uv sync` after rebase rather than hand-editing.
- `_docs/BACKLOG_SCOPE.md` / `_docs/GITHUB_ISSUES.md` — only the PM role (or
  the orchestrator, when re-grooming) edits these; engineers should treat
  them as read-only.

When a conflict occurs:
1. Identify which task should own the change (usually whichever issue is
   earlier in the merge queue).
2. Rebase the later branch onto the updated `main` rather than merging `main`
   into the feature branch.
3. Resolve conflicts on the feature branch, at rebase time — not during the
   integration merge itself.

## Lifecycle

The standard task lifecycle is:
1. Select the next eligible wave from the backlog.
2. Groom each ungroomed issue (PM).
3. Create an isolated worktree/branch for each issue.
4. Set up each worktree (`uv sync`, environment verification).
5. Launch engineers.
6. Engineers implement and test.
7. QA verifies completed issues as they finish.
8. Failed issues return to their engineer.
9. Passed issues enter the merge queue.
10. Integrate one branch at a time.
11. Push the updated `main`.
12. Close the issue.
13. Remove the worktree (`git worktree remove`) once merged and confirmed clean.
14. Start the next wave.
15. Continue until the backlog is complete.

## Failure Handling

### Engineer Failure

If implementation fails: keep the issue open, record the failure and
relevant evidence, fix it in the same worktree, and re-run `uv run pytest`.

### QA Failure

If QA reports FAIL: return the issue to the engineer with QA's findings. Do
not start unrelated remediation unless required by a dependency.

### CI Failure

If CI (`.github/workflows/ci.yml`) fails after local checks passed:
1. Inspect the CI failure (`gh run view` / the Actions log).
2. Determine whether it's an implementation failure, an environment
   mismatch (e.g. `uv.lock` out of sync), or flaky infrastructure.
3. Reproduce locally with `uv sync && uv run pytest` where possible.
4. Fix the actual cause and re-run the required checks.

## Completion Criteria

An issue is complete only when:
- Its acceptance criteria are satisfied.
- `uv run pytest` passes.
- QA has passed the issue.
- The branch has been integrated into `main` per "Integration" above.
- `main` has been pushed.
- The issue has been closed.
- No unrelated changes remain in the merged diff.

## Rules

- One issue per worktree.
- One engineer per issue.
- Do not skip grooming.
- Do not implement directly on `main`.
- Do not let QA modify implementation code.
- Do not commit known-failing work.
- Do not run overlapping `pytest` runs in the same worktree.
- Do not kill processes you did not start.
- Do not use destructive commands when a reversible alternative exists.
- Only the orchestrator merges branches into `main`.
