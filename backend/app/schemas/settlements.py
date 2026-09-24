from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SettlementCreate(BaseModel):
    from_member_id: int
    to_member_id: int
    amount: Decimal = Field(gt=0)
    currency: str

    @model_validator(mode="after")
    def _check_distinct_members(self) -> "SettlementCreate":
        if self.from_member_id == self.to_member_id:
            raise ValueError("from_member_id and to_member_id must differ")
        return self


class SettlementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    from_member_id: int
    to_member_id: int
    amount: Decimal
    currency: str
    created_at: datetime
