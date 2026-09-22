# Backlog Scope — Expense Splitter (Phase 0, Step 5)

Each item below becomes one GitHub Issue once approved. Format: title, epic label,
description, acceptance criteria. Issue numbers assigned on creation.

---

## Epic 1: Backend Foundation

### 1. `chore(scaffold): initialize FastAPI project structure`
**Description:** Set up the base FastAPI app skeleton per the agreed folder structure
(`app/models`, `app/schemas`, `app/routers`, `app/services`, `main.py`, `tests/`).
Include `requirements.txt`, `.gitignore`, and a basic health-check endpoint.
**Acceptance criteria:**
- `uvicorn app.main:app` runs locally with no errors
- `GET /health` returns 200
- `.gitignore` excludes `__pycache__`, `.env`, `venv/`

### 2. `feat(db): add models and migrations`
**Description:** Define SQLAlchemy models for `users`, `groups`, `group_members`,
`expenses`, `expense_splits`, `settlements` per the locked schema. Set up Alembic
migrations.
**Acceptance criteria:**
- All 6 tables created via migration
- Foreign keys enforced
- One passing test confirms models can be instantiated and queried

### 3. `feat(groups): add group creation and membership endpoints`
**Description:** Implement `POST /groups` and `POST /groups/{id}/members`.
**Acceptance criteria:**
- Can create a group with a name
- Can add a named member to a group
- Tests cover both endpoints, including invalid input (missing name, duplicate member)

---

## Epic 2: Expenses & Splits

### 4. `feat(expenses): add expense creation with custom splits`
**Description:** Implement `POST /groups/{id}/expenses`, accepting amount, currency,
payer, and a list of per-user share amounts (custom ratios, not just even split).
**Acceptance criteria:**
- Split amounts must sum to the total expense amount (validated)
- Test covers even split, custom ratio split, and invalid split (doesn't sum correctly)

### 5. `feat(expenses): add expense history endpoint`
**Description:** Implement `GET /groups/{id}/expenses`, returning all expenses for
a group in reverse chronological order.
**Acceptance criteria:**
- Returns expenses with payer, amount, currency, splits, timestamp
- Test covers empty history and populated history

---

## Epic 3: Balances & Settlements

### 6. `feat(balances): add balance calculation service`
**Description:** Core logic — for a given group, compute net balances per user
per currency, derived from `expense_splits` minus `settlements`. Isolated as a
service function (not an endpoint yet) so it can be tested independently.
**Acceptance criteria:**
- Correctly nets multiple expenses and partial settlements
- Handles multiple currencies within one group without mixing them
- Test suite covers: single expense, multiple expenses, settled debt, mixed currency

### 7. `feat(balances): expose balances endpoint`
**Description:** Implement `GET /groups/{id}/balances`, using the service from #6.
**Acceptance criteria:**
- Returns "who owes whom" per currency
- Test confirms endpoint output matches service output

### 8. `feat(settlements): add settle-up endpoint`
**Description:** Implement `POST /groups/{id}/settlements` to record a payment
between two users.
**Acceptance criteria:**
- Settlement reduces the relevant balance (verified via #6/#7 after creation)
- Test covers valid settlement and over-settlement (paying more than owed)

---

## Epic 4: Frontend

### 9. `chore(frontend): scaffold React app with API client and routing`
**Description:** Set up base React app, routing (Login-free per v1 scope), and a
typed API client for the backend.
**Acceptance criteria:**
- App builds and runs locally
- API client can successfully call `GET /health`

### 10. `feat(frontend): group creation and member management UI`
**Description:** UI for creating a group and adding members.
**Acceptance criteria:**
- Can create a group and see it reflected via API
- Can add members and see the updated list

### 11. `feat(frontend): add-expense form with split ratio input`
**Description:** Form for adding an expense, including custom split ratio input
per member.
**Acceptance criteria:**
- Form validates splits sum to total before submit
- Submission creates the expense via the backend

### 12. `feat(frontend): group detail view (history + balances)`
**Description:** Page showing expense history and computed balances for a group.
**Acceptance criteria:**
- Displays expense list from #5
- Displays balances from #7, grouped by currency

### 13. `feat(frontend): settle-up UI`
**Description:** UI to record a settlement between two users.
**Acceptance criteria:**
- Submitting a settlement updates the displayed balances

---

## Epic 5: Polish

### 14. `fix(validation): add input validation and error handling`
**Description:** Backend + frontend validation pass — consistent error responses,
user-facing error messages for common failure cases (invalid split, missing fields).
**Acceptance criteria:**
- API returns structured error responses (4xx with message)
- Frontend surfaces errors to the user instead of failing silently

### 15. `docs: add project README with setup instructions`
**Description:** README covering local setup (backend + frontend), running tests,
and a brief architecture overview.
**Acceptance criteria:**
- A new contributor can get the app running locally by following the README alone
