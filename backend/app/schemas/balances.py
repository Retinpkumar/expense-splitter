from decimal import Decimal

from pydantic import BaseModel


class BalanceEntry(BaseModel):
    from_member_id: int
    to_member_id: int
    amount: Decimal
