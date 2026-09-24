# Issue #21: `POST /groups/{id}/expenses` with custom splits

## Context

Issue #20 (groups + members) is merged. The next backlog item, issue #21,
adds expense recording: a group expense with a payer and a list of
per-member custom splits (not necessarily even), where the splits must sum
exactly to the expense amount (`_docs/DECISIONS.md` #4). This unblocks the
later balance-calculation and settlement work, which depend on expenses
existing. Only creation is in scope — no expense history (`GET`) endpoint,
no balance math, no currency validation.

The `Expense` and `ExpenseSplit` ORM models already exist (from
`feat(db): add models and migrations`), so this is purely an API + service
layer on top of an already-migrated schema.

## Approach

Mirror the pattern established in issue #20 (`app/routers/groups.py`,
`app/schemas/groups.py`, `backend/tests/test_groups.py`), but per the
issue's explicit file constraints, put the split-sum validation in a new
`app/services/expenses.py` module rather than inline in the router (per
`AGENTS.md` → Architecture: business logic belongs in `services/`,
independent of the HTTP layer).

Per user decision: stick strictly to the issue's stated acceptance
criteria — validate that splits sum to `amount` (422 on mismatch) and that
the group exists (404, mirroring `add_member`'s existing check). Do **not**
validate that `payer_id`/split `member_id`s are actual members of the group
— out of scope for this issue.

### 1. `backend/app/schemas/expenses.py` (new)

```python
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ExpenseSplitCreate(BaseModel):
    member_id: int
    amount: Decimal


class ExpenseSplitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    member_id: int
    amount: Decimal


class ExpenseCreate(BaseModel):
    amount: Decimal
    currency: str
    payer_id: int
    splits: list[ExpenseSplitCreate]


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    amount: Decimal
    currency: str
    payer_id: int
    splits: list[ExpenseSplitRead]
    created_at: datetime
```

Matches the request/response shape in `_docs/API.md` → `POST
/groups/{id}/expenses`.

### 2. `backend/app/services/expenses.py` (new)

Business logic, independent of HTTP layer — raises a plain domain exception
(not `HTTPException`) on invalid input, so the router (or a future caller)
decides how to translate it.

```python
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import Expense, ExpenseSplit
from app.schemas.expenses import ExpenseCreate


class InvalidSplitError(ValueError):
    pass


def create_expense(db: Session, group_id: int, payload: ExpenseCreate) -> Expense:
    split_total = sum((split.amount for split in payload.splits), Decimal("0"))
    if split_total.quantize(Decimal("0.01")) != payload.amount.quantize(Decimal("0.01")):
        raise InvalidSplitError("Split amounts must sum to the expense amount")

    expense = Expense(
        group_id=group_id,
        payer_id=payload.payer_id,
        amount=payload.amount,
        currency=payload.currency,
    )
    db.add(expense)
    db.flush()

    for split in payload.splits:
        db.add(
            ExpenseSplit(expense_id=expense.id, member_id=split.member_id, amount=split.amount)
        )

    db.commit()
    db.refresh(expense)
    return expense
```

Quantizing both sides to 2 decimal places before comparing avoids false
mismatches from JSON-float-to-`Decimal` parsing artifacts (e.g. `600.00` →
`Decimal("600.0")` vs `Decimal("600.00")`), while still correctly catching
real sum mismatches.

### 3. `backend/app/routers/expenses.py` (new)

Mirrors `add_member` in `app/routers/groups.py` for the 404 check and DI
pattern; translates the service's domain exception into a 422.

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Group
from app.schemas.expenses import ExpenseCreate, ExpenseRead
from app.services.expenses import InvalidSplitError, create_expense

router = APIRouter(prefix="/groups", tags=["expenses"])


@router.post(
    "/{group_id}/expenses",
    response_model=ExpenseRead,
    status_code=status.HTTP_201_CREATED,
)
def add_expense(
    group_id: int, payload: ExpenseCreate, db: Session = Depends(get_db)
) -> Expense:
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    try:
        return create_expense(db, group_id, payload)
    except InvalidSplitError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
```

### 4. `backend/app/main.py`

Register the new router alongside the existing ones:

```python
from app.routers import expenses, groups, health
...
app.include_router(expenses.router)
```

### 5. `backend/tests/test_expenses.py` (new)

Reuse the exact `client` fixture pattern from `backend/tests/test_groups.py`
(in-memory SQLite, `StaticPool`, `get_db` dependency override). Add a small
helper to create a group with two members via the existing `/groups` and
`/groups/{id}/members` endpoints, then cover the three required cases plus
the group-not-found path (matching existing 404 coverage style):

- Even split across two members → 201, response amount/currency/payer_id
  and both splits persisted correctly.
- Custom uneven-ratio split (e.g. 700/500 on a 1200 total) → 201, splits
  persisted as given.
- Splits that don't sum to `amount` → 422.
- `POST` to a non-existent group → 404.

## Verification

- `cd backend && uv run pytest` — full suite, including new
  `tests/test_expenses.py`, must pass alongside existing tests.
- Manually sanity-check via `uv run uvicorn app.main:app --reload` and a
  couple of curl/httpie calls mirroring the `_docs/API.md` example payload,
  if desired.

## Git workflow (per `AGENTS.md`)

- Branch: `git checkout main && git pull origin main && git checkout -b
  feat/expense-creation-splits`.
- Commit message: `feat(expenses): add expense creation with custom
  splits` (no `Co-Authored-By` trailer).
- Push, open PR with Summary + Testing sections, closing #21.
- Do not merge automatically — wait for explicit go-ahead, same as #20.
