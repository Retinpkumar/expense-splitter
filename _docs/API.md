# API — Expense Splitter

HTTP API reference for the backend. This document tracks what's actually
implemented vs. what's planned — check the **Status** on each endpoint before
assuming it exists. Planned shapes are derived from the locked scope in
`_docs/BACKLOG_SCOPE.md` / `_docs/GITHUB_ISSUES.md` and the rules in
`_docs/DECISIONS.md`; update this doc as each endpoint actually ships,
including any shape changes made during implementation.

## Conventions

- Base URL (local dev): `http://127.0.0.1:8000` (`uv run uvicorn app.main:app --reload`).
- JSON request/response bodies throughout.
- No authentication (see `_docs/DECISIONS.md` #3 — no auth in v1). Group
  members are named participants, not accounts; nothing in the API is scoped
  to a logged-in user.
- Errors: planned to be structured `4xx` responses with a message body
  (`_docs/GITHUB_ISSUES.md` → `fix(validation): add backend input validation
  and structured error responses`). Exact error shape is not finalized yet —
  fill in here once that issue lands.
- Monetary amounts: split amounts must sum exactly to an expense's total
  (`_docs/DECISIONS.md` #4). Currency is explicit per expense; balances are
  always reported per currency, never mixed (`_docs/DECISIONS.md` #5).

## Endpoints

### `GET /health`

**Status:** Implemented (`backend/app/routers/health.py`)

Health check.

**Response** `200`
```json
{ "status": "ok" }
```

---

### `POST /groups`

**Status:** Planned (`_docs/GITHUB_ISSUES.md` → `feat(groups): add group
creation and membership endpoints`)

Create a group.

**Request**
```json
{ "name": "Trip to Goa" }
```

**Response** `201` (exact status code TBD at implementation)
```json
{ "id": 1, "name": "Trip to Goa" }
```

**Errors:** missing `name`.

---

### `POST /groups/{id}/members`

**Status:** Planned (same issue as `POST /groups`)

Add a named member to a group. Members are names, not user accounts (no auth
in v1 — `_docs/DECISIONS.md` #3).

**Request**
```json
{ "name": "Asha" }
```

**Response** `201`
```json
{ "id": 5, "group_id": 1, "name": "Asha" }
```

**Errors:** missing `name`, duplicate member name within the group.

---

### `POST /groups/{id}/expenses`

**Status:** Planned (`_docs/GITHUB_ISSUES.md` → `feat(expenses): add expense
creation with custom splits`)

Create an expense with custom per-member splits (not necessarily even —
`_docs/DECISIONS.md` #4). Split amounts must sum exactly to `amount`.

**Request**
```json
{
  "amount": 1200.00,
  "currency": "INR",
  "payer_id": 5,
  "splits": [
    { "member_id": 5, "amount": 600.00 },
    { "member_id": 6, "amount": 600.00 }
  ]
}
```

**Response** `201`
```json
{
  "id": 42,
  "group_id": 1,
  "amount": 1200.00,
  "currency": "INR",
  "payer_id": 5,
  "splits": [
    { "member_id": 5, "amount": 600.00 },
    { "member_id": 6, "amount": 600.00 }
  ],
  "created_at": "2026-09-23T10:00:00Z"
}
```

**Errors:** `422` when `splits` amounts don't sum to `amount`.

---

### `GET /groups/{id}/expenses`

**Status:** Implemented (`feat(expenses): add expense history endpoint`)

List all expenses for a group, most recent first.

**Response** `200`
```json
[
  {
    "id": 42,
    "group_id": 1,
    "amount": 1200.00,
    "currency": "INR",
    "payer_id": 5,
    "splits": [
      { "member_id": 5, "amount": 600.00 },
      { "member_id": 6, "amount": 600.00 }
    ],
    "created_at": "2026-09-23T10:00:00Z"
  }
]
```

Empty group returns `[]`.

---

### `GET /groups/{id}/balances`

**Status:** Implemented (`feat(balances): expose balances endpoint`, backed
by `feat(balances): add balance calculation service`)

Net balances per member, grouped by currency — never mixed across currencies
(`_docs/DECISIONS.md` #5). Derived from `expenses`/`expense_splits` minus
`settlements`.

**Response** `200`
```json
{
  "INR": [
    { "from_member_id": 6, "to_member_id": 5, "amount": 300.00 }
  ],
  "USD": []
}
```

---

### `POST /groups/{id}/settlements`

**Status:** Planned (`_docs/GITHUB_ISSUES.md` → `feat(settlements): add
settle-up endpoint`)

Record a payment between two members. Over-settlement (paying more than
currently owed) is allowed, not rejected (`_docs/DECISIONS.md` #7).

**Request**
```json
{
  "from_member_id": 6,
  "to_member_id": 5,
  "amount": 300.00,
  "currency": "INR"
}
```

**Response** `201`
```json
{
  "id": 9,
  "group_id": 1,
  "from_member_id": 6,
  "to_member_id": 5,
  "amount": 300.00,
  "currency": "INR",
  "created_at": "2026-09-23T10:05:00Z"
}
```

Reflected in the next `GET /groups/{id}/balances` call.

---

## Updating this document

When an endpoint moves from Planned to Implemented:
1. Update its **Status** line and confirm the request/response shapes match
   what was actually built (adjust if the implementation diverged).
2. Add the endpoint to `backend/tests/` per `_docs/TESTING_GUIDELINES.md`.
3. If the shape differs from what's documented here in a way that reflects a
   real design decision (not just a fix), add an entry to `_docs/DECISIONS.md`.
