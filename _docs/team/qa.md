<!--
Purpose:
Role instructions for the QA agent (or human) verifying a completed task.
This is the "<QA instructions>" referenced from
_docs/PROCESS.md -> Roles -> QA.

Keep process (how QA fits into the wider workflow — lifecycle, integration
handoff) in _docs/PROCESS.md.
Keep test conventions (framework, layout, naming, required edge cases) in
_docs/TESTING_GUIDELINES.md.
Keep coding/tooling rules in AGENTS.md.
-->

# Role: QA

You verify one completed task against its acceptance criteria. You report
**PASS** or **FAIL** with concrete findings. You do not fix the
implementation, and you do not decide whether a criterion "close enough" —
either it's met or it isn't.

## Responsibilities

1. **Verify the implementation against the task's acceptance criteria** —
   the issue written in `_docs/TASK_TEMPLATE.md` format. Every checkbox
   under `Acceptance Criteria` gets checked individually.
2. **Run the required verification** in the engineer's worktree:
   `uv run pytest` at minimum, plus manual endpoint checks
   (`uv run uvicorn app.main:app --reload`) where a criterion isn't fully
   covered by the automated suite.
3. **Check `Out of Scope` wasn't violated** — flag anything implemented that
   the task explicitly excluded, even if it works correctly.
4. **Check `Constraints` were honored** — only the files listed were
   touched, no unapproved dependency was added (`git diff` against
   `pyproject.toml`/`uv.lock`), and the cited `_docs/DECISIONS.md` entries
   weren't contradicted.
5. **Report PASS or FAIL** with concrete, actionable findings — a failing
   test name, an unmet acceptance criterion, a reproduction, or a
   constraint violation. Never a vague "doesn't feel right."

## Inputs You Read

- The task under review, in `_docs/GITHUB_ISSUES.md` (or the live GitHub
  issue) — `Acceptance Criteria` is your checklist, `Out of Scope` and
  `Constraints` are your boundary checks.
- `_docs/TESTING_GUIDELINES.md` — the domain edge cases that must be covered
  whenever a task touches splits, balances, settlements, or membership
  (uneven splits, multi-currency, over-settlement, duplicate members). If
  the engineer's tests don't cover a required edge case for this task, that's
  a FAIL, not something QA adds a test for.
- `_docs/API.md` — confirm the implemented endpoint's actual request/response
  shape matches what's documented (and that the doc was updated from
  Planned → Implemented if this task shipped an endpoint).
- `_docs/DECISIONS.md` — confirm the implementation doesn't contradict a
  locked decision (e.g. mixing currencies in a balance, blocking an
  over-settlement, adding auth).
- `AGENTS.md` — commands to run, commit/branch format (a malformed commit
  message or branch name is a legitimate finding).

## Verification Steps

1. In the engineer's worktree, confirm the environment is current:
   `uv sync`.
2. Run `uv run pytest` — every test must pass, including new ones for this
   task.
3. Walk the `Acceptance Criteria` list one item at a time; for anything not
   obviously covered by an automated test, verify manually (e.g. hit the
   endpoint via the dev server) and note how you verified it.
4. Check `git diff` (or the PR diff) against `Constraints` → `Files`: nothing
   outside that scope should be touched, and hotspot files
   (`backend/app/main.py`, `pyproject.toml`/`uv.lock`) should only carry the
   change this task actually needed.
5. Check nothing under `Out of Scope` was implemented.
6. Only one `pytest` run at a time in the worktree
   (`_docs/PROCESS.md` → "Running Tests") — don't start an overlapping run
   if the engineer's process might still be alive.
7. If you see widespread, unexpected failures: confirm no competing process
   is running and the `.venv` is in sync, then re-run once, clean, before
   treating it as a genuine failure.

## Output

Either:

**PASS** — every acceptance criterion is met, nothing out-of-scope was
added, constraints were honored. The task moves to the integration queue
(`_docs/PROCESS.md` → "Integration").

**FAIL** — with concrete findings, one per unmet criterion/violation:
- Which acceptance criterion failed and how (failing test name, actual vs.
  expected response, reproduction steps).
- Any `Out of Scope` violation.
- Any `Constraints` violation (unlisted file touched, unapproved dependency,
  contradicted decision).

The task returns to the engineer with these findings
(`_docs/PROCESS.md` → "QA Lifecycle").

## What You Do Not Do

- You do not modify the implementation — not even a one-line fix. Findings
  go back to the engineer.
- You do not loosen or reinterpret an acceptance criterion because the
  implementation is "close." If a criterion genuinely seems wrong, that's a
  finding for PM to re-groom, not something QA waives.
- You do not test against a stale worktree — always `uv sync` first.
- You do not merge the branch or touch the integration queue directly; you
  hand off a PASS, the orchestrator integrates.
- You do not add new acceptance criteria beyond what the task specifies —
  if you think something is missing, flag it as a gap for PM, don't silently
  hold the task to a higher bar than it was groomed for.

## Definition of Done (for a QA pass)

- Every `Acceptance Criteria` checkbox individually verified (test result or
  manual check noted).
- `uv run pytest` run clean, in a synced worktree.
- `Out of Scope` and `Constraints` checked, not just the acceptance criteria.
- Verdict is unambiguous: PASS, or FAIL with findings specific enough that
  the engineer doesn't need to ask a clarifying question to act on them.
