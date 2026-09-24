# Contributing Conventions — Expense Splitter

These conventions exist so every PR (human or agent-authored) looks the same,
and can be reviewed by pattern rather than re-explained each time.

## Branch Naming

`type/short-description`

Examples:
- `feat/add-expense-endpoint`
- `fix/balance-calc-bug`
- `chore/setup-ci`

## Commit Format (Conventional Commits, scoped)

`type(scope): description`

Types:
- `feat` — new feature
- `fix` — bug fix
- `test` — adding/updating tests
- `chore` — tooling, config, non-code changes
- `docs` — documentation only
- `refactor` — code change that neither fixes a bug nor adds a feature

Examples:
- `feat(expenses): add expense splitting endpoint`
- `test(balances): add balance calculation tests`

No `Co-Authored-By: Claude` (or any Anthropic) trailer on commits — authorship
stays human-only on GitHub.

See `git-workflow.md` (Claude Code skill) for the full agent-side git behavior
this drives automatically during Phase 1.

## Backend Environment

The backend uses [`uv`](https://docs.astral.sh/uv/) for dependency and virtualenv
management — not `pip`/`venv` directly.

```bash
cd backend
uv sync              # creates .venv/ and installs dependencies from uv.lock
uv run pytest        # run tests
uv run uvicorn app.main:app --reload   # run the dev server
```

Add dependencies with `uv add <package>` (or `uv add --dev <package>` for
dev-only deps) — this updates `pyproject.toml` and `uv.lock` together. Don't
edit either file by hand.

## Branch Protection (`main`)

- No direct pushes to `main`
- All changes via Pull Request
- At least 1 review required before merge — satisfied by running the
  `code-review` Claude Code skill (`.claude/skills/code-review.md`) against
  the PR's diff (see `_docs/PROCESS.md` → "Code Review")
- CI must pass before merge

## CI (Phase 0 skeleton — deploy pipeline comes later, in Phase 3)

On every PR:
- Backend: run `pytest`
- Frontend: run build check

No deployment automation yet — that's introduced in Phase 3 of the roadmap.