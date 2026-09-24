import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import get_db
from app.main import app
from app.models import Base


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
        yield test_client
    app.dependency_overrides.clear()


def _create_group_with_members(client, member_names):
    group = client.post("/groups", json={"name": "Trip to Goa"}).json()
    members = [
        client.post(f"/groups/{group['id']}/members", json={"name": name}).json()
        for name in member_names
    ]
    return group, members


def test_create_expense_with_even_split(client):
    group, members = _create_group_with_members(client, ["Asha", "Ravi"])

    response = client.post(
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

    assert response.status_code == 201
    body = response.json()
    assert body["group_id"] == group["id"]
    assert body["amount"] == "1200.00"
    assert body["currency"] == "INR"
    assert body["payer_id"] == members[0]["id"]
    assert {(s["member_id"], s["amount"]) for s in body["splits"]} == {
        (members[0]["id"], "600.00"),
        (members[1]["id"], "600.00"),
    }


def test_create_expense_with_custom_ratio_split(client):
    group, members = _create_group_with_members(client, ["Asha", "Ravi"])

    response = client.post(
        f"/groups/{group['id']}/expenses",
        json={
            "amount": "1200.00",
            "currency": "INR",
            "payer_id": members[0]["id"],
            "splits": [
                {"member_id": members[0]["id"], "amount": "700.00"},
                {"member_id": members[1]["id"], "amount": "500.00"},
            ],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert {(s["member_id"], s["amount"]) for s in body["splits"]} == {
        (members[0]["id"], "700.00"),
        (members[1]["id"], "500.00"),
    }


def test_create_expense_rejects_splits_that_do_not_sum_to_amount(client):
    group, members = _create_group_with_members(client, ["Asha", "Ravi"])

    response = client.post(
        f"/groups/{group['id']}/expenses",
        json={
            "amount": "1200.00",
            "currency": "INR",
            "payer_id": members[0]["id"],
            "splits": [
                {"member_id": members[0]["id"], "amount": "600.00"},
                {"member_id": members[1]["id"], "amount": "500.00"},
            ],
        },
    )

    assert response.status_code == 422


def test_create_expense_for_missing_group_returns_404(client):
    response = client.post(
        "/groups/999/expenses",
        json={
            "amount": "100.00",
            "currency": "INR",
            "payer_id": 1,
            "splits": [{"member_id": 1, "amount": "100.00"}],
        },
    )

    assert response.status_code == 404


def test_list_expenses_returns_empty_list_for_group_with_no_expenses(client):
    group, _ = _create_group_with_members(client, ["Asha", "Ravi"])

    response = client.get(f"/groups/{group['id']}/expenses")

    assert response.status_code == 200
    assert response.json() == []


def test_list_expenses_returns_most_recent_first(client):
    group, members = _create_group_with_members(client, ["Asha", "Ravi"])

    first = client.post(
        f"/groups/{group['id']}/expenses",
        json={
            "amount": "100.00",
            "currency": "INR",
            "payer_id": members[0]["id"],
            "splits": [{"member_id": members[0]["id"], "amount": "100.00"}],
        },
    ).json()
    second = client.post(
        f"/groups/{group['id']}/expenses",
        json={
            "amount": "200.00",
            "currency": "INR",
            "payer_id": members[1]["id"],
            "splits": [{"member_id": members[1]["id"], "amount": "200.00"}],
        },
    ).json()

    response = client.get(f"/groups/{group['id']}/expenses")

    assert response.status_code == 200
    body = response.json()
    assert [expense["id"] for expense in body] == [second["id"], first["id"]]


def test_list_expenses_for_missing_group_returns_404(client):
    response = client.get("/groups/999/expenses")

    assert response.status_code == 404
