from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Group, Settlement
from app.schemas.settlements import SettlementCreate, SettlementRead

router = APIRouter(prefix="/groups", tags=["settlements"])


@router.post(
    "/{group_id}/settlements",
    response_model=SettlementRead,
    status_code=status.HTTP_201_CREATED,
)
def add_settlement(
    group_id: int, payload: SettlementCreate, db: Session = Depends(get_db)
) -> Settlement:
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    settlement = Settlement(
        group_id=group_id,
        from_member_id=payload.from_member_id,
        to_member_id=payload.to_member_id,
        amount=payload.amount,
        currency=payload.currency,
    )
    db.add(settlement)
    db.commit()
    db.refresh(settlement)
    return settlement
