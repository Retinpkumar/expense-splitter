from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Group, GroupMember, User
from app.schemas.groups import GroupCreate, GroupRead, MemberCreate, MemberRead

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(payload: GroupCreate, db: Session = Depends(get_db)) -> Group:
    group = Group(name=payload.name)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.post(
    "/{group_id}/members",
    response_model=MemberRead,
    status_code=status.HTTP_201_CREATED,
)
def add_member(
    group_id: int, payload: MemberCreate, db: Session = Depends(get_db)
) -> MemberRead:
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    duplicate = (
        db.query(GroupMember)
        .join(User, GroupMember.user_id == User.id)
        .filter(GroupMember.group_id == group_id, User.name == payload.name)
        .first()
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member with this name already exists in the group",
        )

    user = User(name=payload.name)
    db.add(user)
    db.flush()

    member = GroupMember(group_id=group_id, user_id=user.id)
    db.add(member)
    db.commit()
    db.refresh(member)

    return MemberRead(id=member.id, group_id=member.group_id, name=user.name)
