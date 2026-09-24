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
