from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class SettlementCreate(BaseModel):
    from_member_id: int
    to_member_id: int
    amount: Decimal
    currency: str


class SettlementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    from_member_id: int
    to_member_id: int
    amount: Decimal
    currency: str
    created_at: datetime
