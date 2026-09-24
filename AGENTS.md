# AGENTS.md

Expense Splitter: a group expense-tracking app (Splitwise-style). Backend is
FastAPI (Python), scaffolded and in early development. Frontend (React) does
not exist yet — see Architecture below before assuming otherwise.

## Setup & Commands

```bash
cd backend && uv sync                                  # install deps, create .venv/
cd backend && uv run pytest                             # full test suite
cd backend && uv run pytest tests/test_health.py        # one test file
cd backend && uv run pytest tests/test_health.py::test_health_ok  # one test
cd backend && uv run uvicorn app.main:app --reload       # dev server (http://127.0.0.1:8000)
```

There is no frontend yet. CI's `frontend-build` job is a no-op until a
`frontend/` directory with a `package.json` exists (see `.github/workflows/ci.yml`).

## Architecture

- `backend/app/main.py` — FastAPI app entrypoint; routers are included here.
- `backend/app/routers/` — API route handlers (one module per resource).
- `backend/app/schemas/` — Pydantic request/response models.
- `backend/app/models/` — data models (ORM models once persistence is added).
- `backend/app/services/` — business logic kept independent of the HTTP layer
  (e.g. balance calculation should be a testable service, not inline in a router).
- `backend/tests/` — pytest suite, mirrors the `app/` layout.

No database is wired up yet — `app/models` and `app/services` are currently
empty scaffolding. Check `_docs/BACKLOG_SCOPE.md` for the planned build order
(DB models/migrations → groups → expenses/splits → balances → settlements →
frontend) before assuming a feature exists.

## Dependencies

Backend uses `uv`, not `pip`/`venv`. Never edit `pyproject.toml` or `uv.lock`
by hand — use:

```bash
uv add <package>          # runtime dependency
uv add --dev <package>    # dev-only dependency
```

Don't add a dependency without checking with the user first.

## Git & GitHub Workflow

- Never commit directly to `main`. All work happens on a feature branch, all
  changes land via PR with at least 1 review and passing CI.
- The review is the `code-review` Claude Code skill
  (`.claude/skills/code-review.md`), run against the PR's diff before merge
  (`_docs/PROCESS.md` → "Code Review"). Findings go back to the engineer,
  same as a QA FAIL; a PR with no findings ("No high-confidence issues
  found.") is clear to merge.
- Before branching, sync `main`:
  ```bash
  git checkout main && git pull origin main
  git checkout -b feat/short-description
  ```
- Branch naming: `type/short-description` — lowercase, hyphen-separated, short.
- Commit after each logical, coherent change rather than batching unrelated
  edits together. Stage intentionally (`git add <specific files>`), not
  `git add -A`/`git add .`, when the tree has unrelated changes. Run
  `git status`/`git diff` before committing to confirm what's staged.
- Commit and PR titles: Conventional Commits, scoped —
  `type(scope): description`, imperative mood, lowercase, no trailing period.
  - `feat` new feature · `fix` bug fix · `test` tests · `docs` docs only ·
    `refactor` no behavior change · `chore` tooling/config · `ci` pipeline
    changes · `style` formatting only · `perf` performance
  - Example: `feat(expenses): add expense splitting endpoint`
  - Breaking change: `feat(api)!: remove deprecated v1 endpoint` +
    `BREAKING CHANGE:` footer.
- **Never add a `Co-Authored-By: Claude` (or any Anthropic) trailer to
  commits.** Authorship on GitHub stays human-only.
- PR body includes a **Summary** (what/why, bullets) and **Testing** (how it
  was verified) section — see `.github/pull_request_template.md`.
- Don't merge a PR automatically; leave that for explicit human approval.
- After merge: `git checkout main && git pull origin main`, then delete the
  local and remote feature branch.
- Never force-push to `main`. If a merge conflict arises, surface it and ask
  before resolving in a way that could discard someone else's work.

Full detail lives in `.claude/skills/git-workflow.md` and `CONTRIBUTING.md` —
this section is the summary an agent needs day to day.

## Testing

- Every new endpoint or service function needs a corresponding pytest test
  (see `backend/tests/test_health.py` for the pattern: FastAPI `TestClient`
  + plain `assert`).
- Run `uv run pytest` before opening a PR; CI re-runs the full suite on every
  PR against `main` and must pass before merge.
