# GitHub Issues — Expense Splitter

Source: groomed from `_docs/BACKLOG_SCOPE.md` per the PM role
(`_docs/team/product_manager.md`), written in the `_docs/TASK_TEMPLATE.md`
format (Goal / Acceptance Criteria / Out of Scope / Constraints).

`chore(scaffold): initialize FastAPI project structure` (GitHub issue #1) is
already implemented and closed — not re-groomed here. Epic headings are
organizational only, not GitHub labels (see `_docs/PROCESS.md` → "Labels /
Task Categories").

Each block below is a ready-to-create issue. `Depends on:` references issue
titles; the orchestrator resolves these to actual issue numbers when placing
issues into waves (`_docs/PROCESS.md` → "Wave Rules").

---

## Epic 1: Backend Foundation

### `feat(db): add models and migrations`

**Goal**
The six core tables from the locked schema exist in the database, are
reachable through SQLAlchemy models, and are managed by Alembic migrations.

**Acceptance Criteria**
- [ ] SQLAlchemy models exist for `users`, `groups`, `group_members`,
      `expenses`, `expense_splits`, `settlements`.
- [ ] An Alembic migration creates all six tables.
- [ ] Foreign keys are enforced (`group_members.group_id` → `groups.id`,
      `expenses.group_id` → `groups.id`, `expense_splits.expense_id` →
      `expenses.id`, `expense_splits.member_id` → `group_members.id`,
      `settlements.group_id` → `groups.id`, plus `from_member_id` /
      `to_member_id` on `settlements` → `group_members.id`).
- [ ] One passing test confirms models can be instantiated and queried
      (`backend/tests/test_models.py`).
- [ ] `uv run pytest` passes with the new test DB setup in place.

**Out of Scope**
- Does not add any HTTP endpoints — models/migrations only.
- Does not add authentication fields to `users` (no auth in v1 —
  `_docs/DECISIONS.md` #3). `users` here means named group members' backing
  table if distinct from `group_members`, not accounts; if the two collapse
  into one table during implementation, note that as a new
  `_docs/DECISIONS.md` entry rather than deciding it silently.
- Does not define the test-database isolation strategy for parallel
  worktrees beyond making the suite pass locally — that's tracked
  separately (`_docs/PROCESS.md` → "Environment Isolation", currently a
  placeholder).

**Constraints**
- **Files:** `backend/app/models/`, new `backend/alembic/` migration
  directory, `backend/tests/test_models.py`.
- **Dependencies:** adding `sqlalchemy` and `alembic` is expected and
  approved for this task specifically — use `uv add sqlalchemy alembic`.
  No other new dependency without asking.
- **Prior decisions:** `_docs/DECISIONS.md` #6 (six-table relational schema,
  enforced foreign keys).
- **Depends on:** None (scaffold, issue #1, already merged).

---

### `feat(groups): add group creation and membership endpoints`

**Goal**
A group can be created and named members can be added to it through the API.

**Acceptance Criteria**
- [ ] `POST /groups` creates a group given a `name` and returns it with an
      `id` (see `_docs/API.md` → `POST /groups`).
- [ ] `POST /groups` returns a validation error when `name` is missing.
- [ ] `POST /groups/{id}/members` adds a named member to a group and returns
      it with an `id` (see `_docs/API.md` → `POST /groups/{id}/members`).
- [ ] `POST /groups/{id}/members` returns a validation error when `name` is
      missing.
- [ ] `POST /groups/{id}/members` rejects a duplicate member name within the
      same group.
- [ ] Tests cover both endpoints' success and failure paths
      (`backend/tests/test_groups.py`).

**Out of Scope**
- Does not implement expenses, balances, or settlements.
- Does not add any authentication or per-user access control — members are
  named participants only (`_docs/DECISIONS.md` #3).
- Does not finalize the structured-error-response shape — use FastAPI's
  default validation error response for now; the shared error format is
  `fix(validation): add backend input validation and structured error
  responses`.

**Constraints**
- **Files:** `backend/app/routers/groups.py`, `backend/app/schemas/groups.py`,
  `backend/tests/test_groups.py`. Router registered in `backend/app/main.py`
  (hotspot file — see `_docs/PROCESS.md` → "Shared Files").
- **Dependencies:** none new.
- **Prior decisions:** `_docs/DECISIONS.md` #3 (no auth in v1).
- **Depends on:** `feat(db): add models and migrations`.

---

## Epic 2: Expenses & Splits

### `feat(expenses): add expense creation with custom splits`

**Goal**
An expense can be recorded against a group with a payer and a set of
per-member custom splits, and invalid splits are rejected.

**Acceptance Criteria**
- [ ] `POST /groups/{id}/expenses` accepts `amount`, `currency`, `payer_id`,
      and a `splits` list of `{member_id, amount}` (see `_docs/API.md` →
      `POST /groups/{id}/expenses`).
- [ ] An even split across members is accepted and persisted correctly.
- [ ] A custom (uneven) ratio split is accepted and persisted correctly.
- [ ] A split whose amounts don't sum to `amount` is rejected with a `422`.
- [ ] Tests cover even split, custom-ratio split, and invalid (non-summing)
      split (`backend/tests/test_expenses.py`).

**Out of Scope**
- Does not implement the expense history (`GET`) endpoint.
- Does not implement balance calculation — this task only persists expenses
  and splits.
- Does not support currency conversion; `currency` is stored as given, not
  validated against a currency list.

**Constraints**
- **Files:** `backend/app/routers/expenses.py`,
  `backend/app/schemas/expenses.py`, split-sum validation logic in
  `backend/app/services/expenses.py` (validation belongs in `services/`, not
  inline in the router — `AGENTS.md` → Architecture),
  `backend/tests/test_expenses.py`. Router registered in
  `backend/app/main.py` (hotspot).
- **Dependencies:** none new.
- **Prior decisions:** `_docs/DECISIONS.md` #4 (custom splits, must sum to
  total).
- **Depends on:** `feat(groups): add group creation and membership endpoints`.

---

### `feat(expenses): add expense history endpoint`

**Goal**
All expenses for a group can be listed in reverse chronological order.

**Acceptance Criteria**
- [ ] `GET /groups/{id}/expenses` returns all expenses for the group with
      payer, amount, currency, splits, and timestamp, most recent first (see
      `_docs/API.md` → `GET /groups/{id}/expenses`).
- [ ] A group with no expenses returns `[]`, not an error.
- [ ] Test covers both an empty history and a populated, multi-expense
      history (`backend/tests/test_expenses.py`).

**Out of Scope**
- Does not add pagination or filtering (by date, member, currency) — full
  unpaginated history only.
- Does not compute balances — that's a separate service/endpoint.

**Constraints**
- **Files:** `backend/app/routers/expenses.py`,
  `backend/tests/test_expenses.py`.
- **Dependencies:** none new.
- **Prior decisions:** None beyond the expense shape defined by
  `_docs/DECISIONS.md` #4.
- **Depends on:** `feat(expenses): add expense creation with custom splits`.

---

## Epic 3: Balances & Settlements

### `feat(balances): add balance calculation service`

**Goal**
Given a group's expenses, splits, and settlements, net balances per member
can be computed correctly, kept strictly separate per currency, as a plain
function independent of the HTTP layer.

**Acceptance Criteria**
- [ ] A function in `app/services/` computes net balances for a group,
      callable directly with no `TestClient`/HTTP layer involved.
- [ ] Correct for a single expense with an even split.
- [ ] Correct across multiple expenses, netted together.
- [ ] Correct when a settlement has been recorded (reduces, not zeroes, the
      relevant balance).
- [ ] Balances for different currencies within the same group are never
      summed or netted together — output is keyed by currency.
- [ ] Test suite covers: single expense, multiple expenses, settled debt,
      mixed currency (`backend/tests/test_balances.py`, matching
      `_docs/TESTING_GUIDELINES.md` → "Edge Cases to Cover").

**Out of Scope**
- Does not expose an HTTP endpoint — service function only (that's the next
  task).
- Does not implement currency conversion.
- Does not implement the settle-up endpoint itself — assumes settlement
  records already exist to net against.

**Constraints**
- **Files:** `backend/app/services/balances.py`,
  `backend/tests/test_balances.py`.
- **Dependencies:** none new.
- **Prior decisions:** `_docs/DECISIONS.md` #2 (business logic lives in
  `app/services/`, not inline in a router), #5 (per-currency balances, never
  mixed), #7 (over-settlement must be handled, not blocked, once settlements
  exist).
- **Depends on:** `feat(db): add models and migrations`,
  `feat(expenses): add expense creation with custom splits`.

---

### `feat(balances): expose balances endpoint`

**Goal**
A group's per-currency balances are available over the API.

**Acceptance Criteria**
- [ ] `GET /groups/{id}/balances` returns "who owes whom" per currency (see
      `_docs/API.md` → `GET /groups/{id}/balances`).
- [ ] Endpoint output matches the balance service's output exactly — the
      router only serializes the service's return value, no separate logic.
- [ ] A group with no expenses/settlements returns an empty result per
      currency, not an error.
- [ ] Test confirms endpoint output matches direct service-call output
      (`backend/tests/test_balances.py`).

**Out of Scope**
- Does not add new balance-calculation logic — this task wires the existing
  service to an endpoint only.

**Constraints**
- **Files:** `backend/app/routers/balances.py`,
  `backend/app/schemas/balances.py`, `backend/tests/test_balances.py`.
  Router registered in `backend/app/main.py` (hotspot).
- **Dependencies:** none new.
- **Prior decisions:** `_docs/DECISIONS.md` #5 (per-currency balances).
- **Depends on:** `feat(balances): add balance calculation service`.

---

### `feat(settlements): add settle-up endpoint`

**Goal**
A payment between two group members can be recorded, and it correctly
reduces the relevant balance — including when it overpays what was owed.

**Acceptance Criteria**
- [ ] `POST /groups/{id}/settlements` records a payment given
      `from_member_id`, `to_member_id`, `amount`, `currency` (see
      `_docs/API.md` → `POST /groups/{id}/settlements`).
- [ ] A valid settlement (amount ≤ what's owed) reduces the balance
      correctly, verified via the balances endpoint after creation.
- [ ] An over-settlement (amount > what's owed) is accepted, not rejected,
      and the resulting balance correctly reflects the overpayment
      (`_docs/DECISIONS.md` #7).
- [ ] Test covers a valid settlement and an over-settlement
      (`backend/tests/test_settlements.py`).

**Out of Scope**
- Does not add settlement editing or deletion — settlements are append-only
  in v1.
- Does not validate `from_member_id`/`to_member_id` against any notion of
  "who currently owes whom" — over-settlement is explicitly allowed, so this
  endpoint does not block payments based on current balance direction.

**Constraints**
- **Files:** `backend/app/routers/settlements.py`,
  `backend/app/schemas/settlements.py`,
  `backend/tests/test_settlements.py`. Router registered in
  `backend/app/main.py` (hotspot).
- **Dependencies:** none new.
- **Prior decisions:** `_docs/DECISIONS.md` #7 (over-settlement allowed).
- **Depends on:** `feat(balances): expose balances endpoint`.

---

## Epic 4: Frontend

### `chore(frontend): scaffold React app with API client and routing`

**Goal**
A React app exists, builds and runs locally, and can call the backend's
`/health` endpoint through a typed API client.

**Acceptance Criteria**
- [ ] `frontend/` contains a React app that builds (`npm run build`) and
      runs locally (`npm run dev` or equivalent).
- [ ] A typed API client successfully calls `GET /health` and the app
      displays/logs the result.
- [ ] Routing is set up with no login/auth route (no auth in v1 —
      `_docs/DECISIONS.md` #3).
- [ ] `.github/workflows/ci.yml`'s `frontend-build` job passes now that
      `frontend/` exists (it currently no-ops when the directory is absent).

**Out of Scope**
- Does not implement any feature UI (groups, expenses, balances,
  settlements) — scaffold and API client wiring only.
- Does not add a component library or design system — see
  `_docs/design_systems.md` (not yet created; styling stack must be decided
  as part of this task or immediately before it).

**Constraints**
- **Files:** new `frontend/` directory at repo root.
- **Dependencies:** framework/tooling choice (e.g. Vite, React Router, HTTP
  client) is expected and approved for this task specifically — record the
  choice as a new `_docs/DECISIONS.md` entry once made.
- **Prior decisions:** `_docs/DECISIONS.md` #3 (no auth in v1), #8 (CI
  already expects a `frontend/` directory).
- **Depends on:** None (backend `/health` already implemented).

---

### `feat(frontend): group creation and member management UI`

**Goal**
A user can create a group and add members to it through the UI, reflected
via the backend API.

**Acceptance Criteria**
- [ ] A form creates a group via `POST /groups` and the new group appears in
      the UI without a manual refresh.
- [ ] A form adds a member via `POST /groups/{id}/members` and the updated
      member list is shown.
- [ ] Client-side handling exists for the "missing name" / "duplicate
      member" error cases (exact error surface may be minimal until
      `fix(validation): add frontend error handling and user-facing
      messages` lands — don't block on that task, but don't crash on error
      either).

**Out of Scope**
- Does not implement expense, balance, or settlement UI.
- Does not implement polished error messaging — that's
  `fix(validation): add frontend error handling and user-facing messages`.

**Constraints**
- **Files:** within `frontend/`, following whatever structure
  `chore(frontend): scaffold React app with API client and routing`
  establishes.
- **Dependencies:** none beyond what the scaffold task introduces, unless
  approved.
- **Prior decisions:** `_docs/DECISIONS.md` #3 (no auth in v1).
- **Depends on:** `chore(frontend): scaffold React app with API client and
  routing`, `feat(groups): add group creation and membership endpoints`.

---

### `feat(frontend): add-expense form with split ratio input`

**Goal**
A user can add an expense with a custom per-member split ratio, and the form
prevents submitting a split that doesn't sum to the total.

**Acceptance Criteria**
- [ ] Form collects amount, currency, payer, and a per-member split amount.
- [ ] Form validates that split amounts sum to the total *before* submit and
      blocks submission otherwise, surfacing the mismatch to the user.
- [ ] A valid submission creates the expense via `POST
      /groups/{id}/expenses` and the new expense is reflected in the UI.

**Out of Scope**
- Does not implement the group detail/history view.
- Does not implement currency conversion or a currency picker beyond a
  simple input/select — currencies are recorded as-is.

**Constraints**
- **Files:** within `frontend/`.
- **Dependencies:** none beyond what the scaffold task introduces, unless
  approved.
- **Prior decisions:** `_docs/DECISIONS.md` #4 (splits must sum to total).
- **Depends on:** `chore(frontend): scaffold React app with API client and
  routing`, `feat(expenses): add expense creation with custom splits`.

---

### `feat(frontend): group detail view (history + balances)`

**Goal**
A group's expense history and current balances are visible on one page,
with balances grouped by currency.

**Acceptance Criteria**
- [ ] Displays the expense list from `GET /groups/{id}/expenses`, most
      recent first.
- [ ] Displays balances from `GET /groups/{id}/balances`, grouped by
      currency — never merged across currencies
      (`_docs/DECISIONS.md` #5).
- [ ] Handles the empty state (no expenses / no balances) without error.

**Out of Scope**
- Does not implement the settle-up UI — link/navigation to it is fine, the
  settlement form itself is a separate task.
- Does not implement editing or deleting expenses (not in scope for v1 per
  `_docs/BACKLOG_SCOPE.md`).

**Constraints**
- **Files:** within `frontend/`.
- **Dependencies:** none beyond what the scaffold task introduces, unless
  approved.
- **Prior decisions:** `_docs/DECISIONS.md` #5 (per-currency balances).
- **Depends on:** `chore(frontend): scaffold React app with API client and
  routing`, `feat(expenses): add expense history endpoint`,
  `feat(balances): expose balances endpoint`.

---

### `feat(frontend): settle-up UI`

**Goal**
A user can record a settlement between two members, and the displayed
balances update to reflect it.

**Acceptance Criteria**
- [ ] Form collects `from_member_id`, `to_member_id`, `amount`, `currency`
      and submits via `POST /groups/{id}/settlements`.
- [ ] After a successful submission, the balances shown to the user reflect
      the new settlement (re-fetch or optimistic update — either is
      acceptable, but the result must be correct after the round trip).
- [ ] Does not block a settlement amount that exceeds the current balance
      (over-settlement is allowed — `_docs/DECISIONS.md` #7).

**Out of Scope**
- Does not add settlement history/list UI beyond what the balances view
  already shows — a dedicated settlement log is not in v1 scope.

**Constraints**
- **Files:** within `frontend/`.
- **Dependencies:** none beyond what the scaffold task introduces, unless
  approved.
- **Prior decisions:** `_docs/DECISIONS.md` #7 (over-settlement allowed).
- **Depends on:** `chore(frontend): scaffold React app with API client and
  routing`, `feat(settlements): add settle-up endpoint`.

---

## Epic 5: Polish

### `fix(validation): add backend input validation and structured error responses`

**Goal**
Every backend endpoint returns a consistent, structured error response for
its documented failure cases, instead of relying on FastAPI's default
validation error shape.

**Acceptance Criteria**
- [ ] A single structured error response shape is defined (status code +
      message body) and documented in `_docs/API.md` → "Conventions".
- [ ] Every existing endpoint (`groups`, `members`, `expenses`, `balances`,
      `settlements`) returns this shape for its documented error cases:
      missing required fields, duplicate member, non-summing split.
- [ ] Existing tests updated to assert on the new structured error shape
      where they previously asserted on the default FastAPI shape.

**Out of Scope**
- Does not add new validation rules beyond what's already documented as an
  error case in `_docs/API.md` / `_docs/TESTING_GUIDELINES.md` — this task
  standardizes the response shape, it doesn't invent new business rules.
- Does not touch the frontend — that's
  `fix(validation): add frontend error handling and user-facing messages`.

**Constraints**
- **Files:** likely a shared exception handler in
  `backend/app/main.py` (hotspot — coordinate before touching) plus
  per-router error raising in `backend/app/routers/`.
- **Dependencies:** none new.
- **Prior decisions:** None directly; this task should *produce* the error
  shape that `_docs/API.md` currently marks as "not finalized yet" — update
  that doc once decided, and add a `_docs/DECISIONS.md` entry for the chosen
  shape.
- **Depends on:** `feat(groups): add group creation and membership
  endpoints`, `feat(expenses): add expense creation with custom splits`,
  `feat(settlements): add settle-up endpoint`.

---

### `fix(validation): add frontend error handling and user-facing messages`

**Goal**
Backend errors are surfaced to the user as readable messages instead of
failing silently or showing a raw error.

**Acceptance Criteria**
- [ ] Every form/action that calls the backend (group creation, member
      add, expense add, settlement) shows a user-facing message on failure,
      using the structured error shape from
      `fix(validation): add backend input validation and structured error
      responses`.
- [ ] A failed request never fails silently (no error swallowed with no UI
      feedback).

**Out of Scope**
- Does not add retry logic, offline handling, or optimistic-UI rollback
  beyond showing the error — out of scope for v1.

**Constraints**
- **Files:** within `frontend/`.
- **Dependencies:** none beyond what the scaffold task introduces, unless
  approved.
- **Prior decisions:** depends on the error shape decided in the backend
  validation task above.
- **Depends on:** `fix(validation): add backend input validation and
  structured error responses`, `feat(frontend): group creation and member
  management UI`, `feat(frontend): add-expense form with split ratio input`,
  `feat(frontend): settle-up UI`.

---

### `docs: add project README with setup instructions`

**Goal**
A new contributor can get the full app (backend + frontend) running locally
by following the README alone, with a brief architecture overview.

**Acceptance Criteria**
- [ ] README covers backend setup (`uv sync`, `uv run pytest`, `uv run
      uvicorn app.main:app --reload`) matching `AGENTS.md`.
- [ ] README covers frontend setup (install, dev server, build) matching
      whatever `chore(frontend): scaffold React app with API client and
      routing` establishes.
- [ ] README includes a brief architecture overview (backend structure per
      `AGENTS.md`, links to `_docs/API.md`, `_docs/DECISIONS.md`,
      `_docs/PROCESS.md` for anyone going deeper).
- [ ] A person with no prior context can follow it start to finish without
      needing to read any other doc first, for local setup specifically.

**Out of Scope**
- Does not document deployment (explicitly out of scope until a later
  phase — `CONTRIBUTING.md`).
- Does not duplicate the full contents of `AGENTS.md` / `_docs/API.md` —
  link to them rather than copying.

**Constraints**
- **Files:** `README.md` (repo root).
- **Dependencies:** none.
- **Prior decisions:** None.
- **Depends on:** all preceding issues in this document.
