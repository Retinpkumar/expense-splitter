<!--
Purpose:
Record architectural/design decisions and their rationale — the "why" behind
choices that aren't obvious from reading the code.

This is a log, not a spec. Add a new entry when a real decision is made;
don't rewrite history. If a decision is later reversed, add a new entry that
supersedes the old one — mark the old one Superseded rather than deleting it.

Keep process (how work moves) in _docs/PROCESS.md.
Keep agent-specific coding rules in AGENTS.md.
-->

# Decisions — Expense Splitter

Each entry: **Status** (Accepted / Superseded), **Context** (what problem
this addresses), **Decision**, **Consequences** (what this locks in or rules
out for later work).

## 1. Backend: FastAPI + `uv`

**Status:** Accepted

**Context:** Needed a Python web framework and a dependency/environment
manager for the backend.

**Decision:** FastAPI (`backend/app/main.py`), Python 3.12
(`backend/.python-version`), dependencies and virtualenv managed by `uv`
(`backend/pyproject.toml` + `uv.lock`) rather than `pip`/`venv`/`poetry`.

**Consequences:** Dependencies are added via `uv add` / `uv add --dev`, never
by hand-editing `pyproject.toml`/`uv.lock` (see `AGENTS.md`). CI installs with
`astral-sh/setup-uv` + `uv sync`.

---

## 2. Backend project structure

**Status:** Accepted

**Context:** Needed a folder layout that keeps HTTP concerns separate from
business logic so core logic (e.g. balance calculation) can be unit-tested
without spinning up the app.

**Decision:** `app/routers/` (HTTP handlers) · `app/schemas/` (Pydantic
request/response models) · `app/models/` (data models) · `app/services/`
(business logic, framework-independent) · `tests/` mirrors `app/`.

**Consequences:** Business logic must live in `app/services/`, not inline in
a router — this is enforced in `_docs/GITHUB_ISSUES.md` issue
`feat(balances): add balance calculation service`, which explicitly calls out
being "isolated as a service function (not an endpoint yet) so it can be
tested independently."

---

## 3. No authentication in v1

**Status:** Accepted

**Context:** Scope needed to be bounded for an initial version.

**Decision:** No login/auth system in v1 (see `_docs/GITHUB_ISSUES.md`,
`chore(frontend): scaffold React app...` — "routing (Login-free per v1
scope)"). Group members are named participants, not authenticated user
accounts.

**Consequences:** No `users` table with credentials, no session/auth
middleware, no per-user access control on groups/expenses in v1. Any
endpoint that references a "user" means a named group member, not an
authenticated principal. Revisit if/when a v2 introduces accounts.

---

## 4. Custom (non-equal) expense splits, validated by sum

**Status:** Accepted

**Context:** Real-world group expenses aren't always split evenly (e.g. one
person orders more).

**Decision:** `POST /groups/{id}/expenses` accepts a list of per-member share
amounts (custom ratios), not just an even split. The split amounts must sum
exactly to the total expense amount; a request where they don't must be
rejected.

**Consequences:** Split validation (sum check) is required logic, not
optional polish — must be covered by tests for even split, custom-ratio
split, and invalid (non-summing) split (see
`_docs/TESTING_GUIDELINES.md` → "Edge Cases to Cover").

---

## 5. Multi-currency support, never mixed within a balance

**Status:** Accepted

**Context:** A group's expenses may be logged in more than one currency.

**Decision:** Balances are computed and reported **per currency** — a
group's net balances must never sum or net amounts across different
currencies together.

**Consequences:** The balance calculation service (`app/services/`) must key
its output by currency. `GET /groups/{id}/balances` returns "who owes whom"
grouped by currency, not one merged number. Explicit multi-currency test
coverage is required (see `_docs/TESTING_GUIDELINES.md`).

---

## 6. Data model: 6 core tables, relational

**Status:** Accepted

**Context:** Needed a schema covering groups, membership, expenses, splits,
and settlements.

**Decision:** SQLAlchemy models + Alembic migrations for six tables: `users`,
`groups`, `group_members`, `expenses`, `expense_splits`, `settlements`, with
enforced foreign keys (`_docs/BACKLOG_SCOPE.md` issue 2). Not yet
implemented as of this writing — `app/models/` is still empty scaffolding.

**Consequences:** This is the schema all later backend work (expenses,
balances, settlements) is built against. Changing it is a decision that
supersedes this entry, not a change to make inline while implementing an
unrelated issue. Once implemented, `_docs/TESTING_GUIDELINES.md` →
"Database Tests" and `_docs/PROCESS.md` → "Environment Isolation" need to be
filled in with the real test-DB mechanism.

---

## 7. Settlements can over-settle; must be handled, not blocked

**Status:** Accepted

**Context:** Users may round up or pay slightly more than strictly owed.

**Decision:** `POST /groups/{id}/settlements` allows recording a payment
larger than the current balance ("over-settlement") rather than rejecting it
outright.

**Consequences:** Balance calculation must handle a resulting
negative/overpaid balance correctly rather than treating it as an error.
Explicit test coverage required for the over-settlement case
(`_docs/TESTING_GUIDELINES.md`).

---

## 8. CI: PR-gated, backend and frontend as independent jobs

**Status:** Accepted

**Context:** Frontend doesn't exist yet, but the pipeline needed to be ready
for when it lands without blocking backend-only PRs.

**Decision:** `.github/workflows/ci.yml` runs on every PR into `main`. The
backend job always runs `uv sync && uv run pytest`. The frontend job checks
whether a `frontend/` directory exists and no-ops if it doesn't, rather than
failing.

**Consequences:** Adding the frontend (Epic 4) will make the frontend CI job
start actually running `npm install && npm run build` with no further
workflow changes needed. No deploy automation is included yet — deployment
is explicitly out of scope until a later phase, per `CONTRIBUTING.md`.

---

## 9. No `Co-Authored-By: Claude` trailer on commits

**Status:** Accepted

**Context:** GitHub renders `Co-Authored-By` trailers as an extra
contributor/avatar on the commit.

**Decision:** Commits authored with agent assistance never carry a
`Co-Authored-By: Claude` (or any Anthropic) trailer. Authorship on GitHub
stays human-only.

**Consequences:** Enforced in `AGENTS.md`, `CONTRIBUTING.md`, and
`.claude/skills/git-workflow.md`. Any commit-message template or tooling
added later must not auto-inject this trailer.

---

## 10. `users` and `group_members` kept as distinct tables

**Status:** Accepted

**Context:** Issue `feat(db): add models and migrations` flagged this as an
open call: the locked schema (#6) lists `users` and `group_members` as
separate tables, but since there's no auth in v1 (#3), it was worth
confirming they shouldn't just collapse into one table.

**Decision:** Kept distinct. `users` is a named-person entity (`id`, `name`).
`group_members` is the per-group join entity (`id`, `group_id` → `groups`,
`user_id` → `users`, unique on `(group_id, user_id)`). Every other table that
references a group participant — `expenses.payer_id`, `expense_splits.member_id`,
`settlements.from_member_id`/`to_member_id` — points at `group_members.id`,
not `users.id` directly, since API operations (splits, payments, balances)
are always scoped to one group's membership, not the person globally.

**Consequences:** A `POST /groups/{id}/members` implementation (issue
`feat(groups): add group creation and membership endpoints`) must decide how
a submitted `name` resolves to a `users` row — e.g. find-or-create by name,
or always create a new `users` row per membership — since the current schema
doesn't dedupe users across groups by name. That decision belongs to that
issue, not this one.

---

## 11. Backend persistence: SQLAlchemy + Alembic on SQLite (dev/test), swappable via `DATABASE_URL`

**Status:** Accepted

**Context:** Issue `feat(db): add models and migrations` required a concrete
database engine to generate and run the first migration against; #6 only
locked the schema, not the engine.

**Decision:** `backend/app/db.py` reads `DATABASE_URL` from the environment,
defaulting to a local SQLite file (`sqlite:///./expense_splitter.db`).
SQLite foreign-key enforcement is turned on explicitly (`PRAGMA
foreign_keys=ON`) since SQLite doesn't enforce it by default. Alembic's
`env.py` pulls `sqlalchemy.url` from the same `DATABASE_URL`.

**Consequences:** Local dev/tests run against SQLite with zero setup. Moving
to Postgres (or any other SQLAlchemy-supported engine) for a later
deployment phase is a config change (`DATABASE_URL`), not a schema or model
change — but the SQLite-only `PRAGMA foreign_keys=ON` branch in `app/db.py`
would need revisiting at that point. `backend/*.db` is gitignored; each
worktree/environment gets its own local file
(`_docs/PROCESS.md` → "Environment Isolation").
