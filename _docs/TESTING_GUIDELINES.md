# Testing Guidelines — Expense Splitter

How to write and run tests for this project. For *when* tests must pass
(pre-commit, QA, CI, integration), see `_docs/PROCESS.md`. For the commands
themselves, see `AGENTS.md`.

## Framework

- **pytest**, via `uv run pytest`.
- FastAPI's `TestClient` (from `fastapi.testclient`) for anything that goes
  through the HTTP layer — no separate mocking framework or `httpx`-direct
  calls needed for routes.
- No test database or fixtures exist yet. Once `feat(db): add models and
  migrations` lands, this doc's "Database Tests" section below must be filled
  in with the real isolation mechanism (see `_docs/PROCESS.md` →
  "Environment Isolation").

## Layout

Tests live in `backend/tests/`, mirroring `backend/app/`:

```
app/routers/health.py   -> tests/test_health.py
app/routers/groups.py   -> tests/test_groups.py
app/services/balances.py -> tests/test_balances.py
```

One test file per module under test. Don't collapse unrelated modules into a
shared test file, and don't split one module's tests across multiple files.

## Naming

- Test files: `test_<module>.py`.
- Test functions: `test_<behavior>` — describe the expected outcome, not the
  input. Prefer `test_health_returns_200` over `test_health` or `test_1`.
- One `assert`-group per behavior. It's fine for a test to make several
  assertions about a single response, but don't test two unrelated behaviors
  in one function.

## What Needs a Test

Every issue's acceptance criteria (see `_docs/GITHUB_ISSUES.md`) are the
starting list of required tests — if an acceptance criterion isn't covered by
a test, the issue isn't done. Beyond that:

- **Routers**: at least one test per status code the endpoint can return
  (success path, each validation failure, not-found, etc.), using `TestClient`.
- **Services**: unit-test the function directly, without going through
  `TestClient` — this is the reason business logic belongs in
  `app/services/`, not inline in a router (see `AGENTS.md` → Architecture).
  Example: `feat(balances): add balance calculation service` must be testable
  by calling the service function with constructed input, no HTTP layer
  involved.
- **Schemas**: only test a Pydantic schema directly if it has custom
  validators; otherwise its behavior is already covered via router tests.
- **Models**: once persistence exists, one test confirming a model can be
  instantiated and queried is the minimum bar (per `_docs/BACKLOG_SCOPE.md`
  issue 2), plus a test per constraint that matters (foreign keys, uniqueness).

## Style

- Follow the existing pattern in `tests/test_health.py`: module-level
  `client = TestClient(app)`, plain `assert` statements, no test classes.
- Keep tests independent — no test may depend on another test's side effects
  or on run order.
- Prefer explicit inline data over shared fixtures until a real need for
  fixtures shows up (e.g. once there's a DB session to set up/tear down per
  test). Don't introduce `conftest.py` speculatively.
- Assert on the specific fields that matter, not the whole response body,
  unless the whole body is small and stable (as in the `/health` example).

## Edge Cases to Cover (domain-specific)

Per the domain logic locked in `_docs/BACKLOG_SCOPE.md`, these are the edge
cases that must have explicit tests wherever they apply, not just the happy
path:

- **Splits**: split amounts that don't sum to the total (must be rejected);
  even split; custom-ratio split.
- **Balances**: single expense, multiple expenses, a partially settled debt,
  and multiple currencies within one group (currencies must never be mixed
  together in one balance).
- **Settlements**: a valid settlement, and an over-settlement (paying more
  than is owed).
- **Groups/members**: duplicate member, missing required fields.

## Running Tests

```bash
cd backend && uv run pytest                              # full suite
cd backend && uv run pytest tests/test_health.py          # one file
cd backend && uv run pytest tests/test_health.py::test_health_returns_200  # one test
cd backend && uv run pytest -k balances                   # by keyword
```

- Run the full suite before opening a PR — CI re-runs it on every PR and it
  must pass before merge (`.github/workflows/ci.yml`).
- Only one `pytest` run at a time per worktree (see `_docs/PROCESS.md` →
  "Running Tests" for the multi-agent/parallel-worktree rules).
- Do not commit a known-failing test; if a test must temporarily document
  unfinished behavior, mark it with `@pytest.mark.skip(reason="...")` and
  open a follow-up issue rather than leaving it red.

## Database Tests *(not yet applicable)*

Placeholder — fill in once `feat(db): add models and migrations` lands:
what test database is used, how it's isolated per test/worktree, and how
migrations are applied before the suite runs.
