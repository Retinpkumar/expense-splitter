from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Expense, Group
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
