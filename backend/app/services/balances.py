from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session, selectinload

from app.models import Expense, Settlement


def calculate_balances(db: Session, group_id: int) -> dict[str, list[dict[str, object]]]:
    nets: dict[str, dict[int, Decimal]] = defaultdict(lambda: defaultdict(Decimal))

    expenses = (
        db.query(Expense)
        .options(selectinload(Expense.splits))
        .filter(Expense.group_id == group_id)
        .all()
    )
    for expense in expenses:
        nets[expense.currency][expense.payer_id] += expense.amount
        for split in expense.splits:
            nets[expense.currency][split.member_id] -= split.amount

    settlements = db.query(Settlement).filter(Settlement.group_id == group_id).all()
    for settlement in settlements:
        nets[settlement.currency][settlement.from_member_id] += settlement.amount
        nets[settlement.currency][settlement.to_member_id] -= settlement.amount

    return {currency: _simplify_debts(member_nets) for currency, member_nets in nets.items()}


def _simplify_debts(member_nets: dict[int, Decimal]) -> list[dict[str, object]]:
    creditors = sorted(
        ((member_id, amount) for member_id, amount in member_nets.items() if amount > 0),
        key=lambda pair: (-pair[1], pair[0]),
    )
    debtors = sorted(
        ((member_id, -amount) for member_id, amount in member_nets.items() if amount < 0),
        key=lambda pair: (-pair[1], pair[0]),
    )

    transactions: list[dict[str, object]] = []
    i = j = 0
    while i < len(debtors) and j < len(creditors):
        debtor_id, debt_amount = debtors[i]
        creditor_id, credit_amount = creditors[j]
        transfer = min(debt_amount, credit_amount)

        transactions.append(
            {"from_member_id": debtor_id, "to_member_id": creditor_id, "amount": transfer}
        )

        debt_amount -= transfer
        credit_amount -= transfer
        debtors[i] = (debtor_id, debt_amount)
        creditors[j] = (creditor_id, credit_amount)

        if debt_amount == 0:
            i += 1
        if credit_amount == 0:
            j += 1

    return transactions
