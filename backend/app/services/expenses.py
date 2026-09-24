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
