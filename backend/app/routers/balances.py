from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Group
from app.schemas.balances import BalanceEntry
from app.services.balances import calculate_balances

router = APIRouter(prefix="/groups", tags=["balances"])


@router.get(
    "/{group_id}/balances",
    response_model=dict[str, list[BalanceEntry]],
    status_code=status.HTTP_200_OK,
)
def get_balances(group_id: int, db: Session = Depends(get_db)) -> dict[str, list[dict[str, object]]]:
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    return calculate_balances(db, group_id)
