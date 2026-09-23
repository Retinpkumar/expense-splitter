from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Base, Expense, ExpenseSplit, Group, GroupMember, Settlement, User


@pytest.fixture()
def session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_models_can_be_instantiated_and_queried(session):
    group = Group(name="Trip to Goa")
    asha = User(name="Asha")
    ravi = User(name="Ravi")
    session.add_all([group, asha, ravi])
    session.flush()

    asha_membership = GroupMember(group_id=group.id, user_id=asha.id)
    ravi_membership = GroupMember(group_id=group.id, user_id=ravi.id)
    session.add_all([asha_membership, ravi_membership])
    session.flush()

    expense = Expense(
        group_id=group.id,
        payer_id=asha_membership.id,
        amount=Decimal("1200.00"),
        currency="INR",
    )
    session.add(expense)
    session.flush()

    session.add_all(
        [
            ExpenseSplit(expense_id=expense.id, member_id=asha_membership.id, amount=Decimal("600.00")),
            ExpenseSplit(expense_id=expense.id, member_id=ravi_membership.id, amount=Decimal("600.00")),
        ]
    )
    session.add(
        Settlement(
            group_id=group.id,
            from_member_id=ravi_membership.id,
            to_member_id=asha_membership.id,
            amount=Decimal("300.00"),
            currency="INR",
        )
    )
    session.commit()

    queried_group = session.get(Group, group.id)
    assert queried_group.name == "Trip to Goa"
    assert {m.user.name for m in queried_group.members} == {"Asha", "Ravi"}
    assert len(queried_group.expenses) == 1
    assert len(queried_group.expenses[0].splits) == 2
    assert len(queried_group.settlements) == 1


def test_group_member_requires_existing_group(session):
    orphan = User(name="Orphan")
    session.add(orphan)
    session.flush()

    session.add(GroupMember(group_id=999, user_id=orphan.id))
    with pytest.raises(IntegrityError):
        session.commit()


def test_group_member_is_unique_per_group_and_user():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        group = Group(name="Weekend Trip")
        user = User(name="Priya")
        session.add_all([group, user])
        session.flush()

        session.add(GroupMember(group_id=group.id, user_id=user.id))
        session.commit()

        session.add(GroupMember(group_id=group.id, user_id=user.id))
        with pytest.raises(IntegrityError):
            session.commit()
