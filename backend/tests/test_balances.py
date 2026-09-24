from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import get_db
from app.main import app
from app.models import Base, Expense, ExpenseSplit, Group, GroupMember, Settlement, User
from app.services.balances import calculate_balances


@pytest.fixture()
def session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def _make_group_with_members(session, names):
    group = Group(name="Trip to Goa")
    session.add(group)
    session.flush()

    members = []
    for name in names:
        user = User(name=name)
        session.add(user)
        session.flush()
        member = GroupMember(group_id=group.id, user_id=user.id)
        session.add(member)
        session.flush()
        members.append(member)

    return group, members


def test_single_expense_even_split(session):
    group, (asha, ravi) = _make_group_with_members(session, ["Asha", "Ravi"])

    expense = Expense(group_id=group.id, payer_id=asha.id, amount=Decimal("1200.00"), currency="INR")
    session.add(expense)
    session.flush()
    session.add_all(
        [
            ExpenseSplit(expense_id=expense.id, member_id=asha.id, amount=Decimal("600.00")),
            ExpenseSplit(expense_id=expense.id, member_id=ravi.id, amount=Decimal("600.00")),
        ]
    )
    session.commit()

    balances = calculate_balances(session, group.id)

    assert balances == {
        "INR": [{"from_member_id": ravi.id, "to_member_id": asha.id, "amount": Decimal("600.00")}]
    }


def test_multiple_expenses_are_netted_together(session):
    group, (asha, ravi) = _make_group_with_members(session, ["Asha", "Ravi"])

    first = Expense(group_id=group.id, payer_id=asha.id, amount=Decimal("1200.00"), currency="INR")
    session.add(first)
    session.flush()
    session.add_all(
        [
            ExpenseSplit(expense_id=first.id, member_id=asha.id, amount=Decimal("600.00")),
            ExpenseSplit(expense_id=first.id, member_id=ravi.id, amount=Decimal("600.00")),
        ]
    )

    second = Expense(group_id=group.id, payer_id=ravi.id, amount=Decimal("400.00"), currency="INR")
    session.add(second)
    session.flush()
    session.add_all(
        [
            ExpenseSplit(expense_id=second.id, member_id=asha.id, amount=Decimal("200.00")),
            ExpenseSplit(expense_id=second.id, member_id=ravi.id, amount=Decimal("200.00")),
        ]
    )
    session.commit()

    balances = calculate_balances(session, group.id)

    assert balances == {
        "INR": [{"from_member_id": ravi.id, "to_member_id": asha.id, "amount": Decimal("400.00")}]
    }


def test_settlement_reduces_but_does_not_zero_the_balance(session):
    group, (asha, ravi) = _make_group_with_members(session, ["Asha", "Ravi"])

    expense = Expense(group_id=group.id, payer_id=asha.id, amount=Decimal("1200.00"), currency="INR")
    session.add(expense)
    session.flush()
    session.add_all(
        [
            ExpenseSplit(expense_id=expense.id, member_id=asha.id, amount=Decimal("600.00")),
            ExpenseSplit(expense_id=expense.id, member_id=ravi.id, amount=Decimal("600.00")),
        ]
    )
    session.add(
        Settlement(
            group_id=group.id,
            from_member_id=ravi.id,
            to_member_id=asha.id,
            amount=Decimal("300.00"),
            currency="INR",
        )
    )
    session.commit()

    balances = calculate_balances(session, group.id)

    assert balances == {
        "INR": [{"from_member_id": ravi.id, "to_member_id": asha.id, "amount": Decimal("300.00")}]
    }


def test_over_settlement_flips_balance_direction(session):
    group, (asha, ravi) = _make_group_with_members(session, ["Asha", "Ravi"])

    expense = Expense(group_id=group.id, payer_id=asha.id, amount=Decimal("600.00"), currency="INR")
    session.add(expense)
    session.flush()
    session.add_all(
        [
            ExpenseSplit(expense_id=expense.id, member_id=asha.id, amount=Decimal("300.00")),
            ExpenseSplit(expense_id=expense.id, member_id=ravi.id, amount=Decimal("300.00")),
        ]
    )
    session.add(
        Settlement(
            group_id=group.id,
            from_member_id=ravi.id,
            to_member_id=asha.id,
            amount=Decimal("400.00"),
            currency="INR",
        )
    )
    session.commit()

    balances = calculate_balances(session, group.id)

    assert balances == {
        "INR": [{"from_member_id": asha.id, "to_member_id": ravi.id, "amount": Decimal("100.00")}]
    }


def test_mixed_currency_balances_are_never_combined(session):
    group, (asha, ravi) = _make_group_with_members(session, ["Asha", "Ravi"])

    inr_expense = Expense(group_id=group.id, payer_id=asha.id, amount=Decimal("1000.00"), currency="INR")
    session.add(inr_expense)
    session.flush()
    session.add_all(
        [
            ExpenseSplit(expense_id=inr_expense.id, member_id=asha.id, amount=Decimal("500.00")),
            ExpenseSplit(expense_id=inr_expense.id, member_id=ravi.id, amount=Decimal("500.00")),
        ]
    )

    usd_expense = Expense(group_id=group.id, payer_id=ravi.id, amount=Decimal("100.00"), currency="USD")
    session.add(usd_expense)
    session.flush()
    session.add_all(
        [
            ExpenseSplit(expense_id=usd_expense.id, member_id=asha.id, amount=Decimal("50.00")),
            ExpenseSplit(expense_id=usd_expense.id, member_id=ravi.id, amount=Decimal("50.00")),
        ]
    )
    session.commit()

    balances = calculate_balances(session, group.id)

    assert balances == {
        "INR": [{"from_member_id": ravi.id, "to_member_id": asha.id, "amount": Decimal("500.00")}],
        "USD": [{"from_member_id": asha.id, "to_member_id": ravi.id, "amount": Decimal("50.00")}],
    }


def test_group_with_no_expenses_or_settlements_returns_empty_dict(session):
    group, _ = _make_group_with_members(session, ["Asha", "Ravi"])

    balances = calculate_balances(session, group.id)

    assert balances == {}


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client, TestingSessionLocal
    app.dependency_overrides.clear()


def _create_group_with_members(client, member_names):
    group = client.post("/groups", json={"name": "Trip to Goa"}).json()
    members = [
        client.post(f"/groups/{group['id']}/members", json={"name": name}).json()
        for name in member_names
    ]
    return group, members


def test_balances_endpoint_matches_direct_service_call(client):
    test_client, SessionLocal = client
    group, members = _create_group_with_members(test_client, ["Asha", "Ravi"])

    test_client.post(
        f"/groups/{group['id']}/expenses",
        json={
            "amount": "1200.00",
            "currency": "INR",
            "payer_id": members[0]["id"],
            "splits": [
                {"member_id": members[0]["id"], "amount": "600.00"},
                {"member_id": members[1]["id"], "amount": "600.00"},
            ],
        },
    )

    response = test_client.get(f"/groups/{group['id']}/balances")

    assert response.status_code == 200

    with SessionLocal() as session:
        expected = calculate_balances(session, group["id"])

    assert response.json() == {
        currency: [
            {
                "from_member_id": entry["from_member_id"],
                "to_member_id": entry["to_member_id"],
                "amount": str(entry["amount"]),
            }
            for entry in entries
        ]
        for currency, entries in expected.items()
    }


def test_balances_endpoint_returns_empty_result_for_group_with_no_activity(client):
    test_client, _ = client
    group, _ = _create_group_with_members(test_client, ["Asha", "Ravi"])

    response = test_client.get(f"/groups/{group['id']}/balances")

    assert response.status_code == 200
    assert response.json() == {}


def test_balances_endpoint_for_missing_group_returns_404(client):
    test_client, _ = client

    response = test_client.get("/groups/999/balances")

    assert response.status_code == 404
