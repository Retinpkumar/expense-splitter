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


def _create_even_split_expense(client, group_id, payer_id, member_ids, amount, currency="INR"):
    per_member = amount / len(member_ids)
    client.post(
        f"/groups/{group_id}/expenses",
        json={
            "amount": f"{amount:.2f}",
            "currency": currency,
            "payer_id": payer_id,
            "splits": [
                {"member_id": member_id, "amount": f"{per_member:.2f}"} for member_id in member_ids
            ],
        },
    )


def test_settlement_records_payment(client):
    group, members = _create_group_with_members(client, ["Asha", "Ravi"])
    asha, ravi = members

    response = client.post(
        f"/groups/{group['id']}/settlements",
        json={
            "from_member_id": ravi["id"],
            "to_member_id": asha["id"],
            "amount": "300.00",
            "currency": "INR",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["group_id"] == group["id"]
    assert body["from_member_id"] == ravi["id"]
    assert body["to_member_id"] == asha["id"]
    assert body["amount"] == "300.00"
    assert body["currency"] == "INR"
    assert "id" in body and "created_at" in body


def test_valid_settlement_reduces_balance(client):
    group, members = _create_group_with_members(client, ["Asha", "Ravi"])
    asha, ravi = members
    _create_even_split_expense(client, group["id"], asha["id"], [asha["id"], ravi["id"]], 1200.00)

    client.post(
        f"/groups/{group['id']}/settlements",
        json={
            "from_member_id": ravi["id"],
            "to_member_id": asha["id"],
            "amount": "300.00",
            "currency": "INR",
        },
    )

    balances = client.get(f"/groups/{group['id']}/balances").json()

    assert balances == {
        "INR": [{"from_member_id": ravi["id"], "to_member_id": asha["id"], "amount": "300.00"}]
    }


def test_over_settlement_flips_balance_direction(client):
    group, members = _create_group_with_members(client, ["Asha", "Ravi"])
    asha, ravi = members
    _create_even_split_expense(client, group["id"], asha["id"], [asha["id"], ravi["id"]], 600.00)

    response = client.post(
        f"/groups/{group['id']}/settlements",
        json={
            "from_member_id": ravi["id"],
            "to_member_id": asha["id"],
            "amount": "400.00",
            "currency": "INR",
        },
    )

    assert response.status_code == 201

    balances = client.get(f"/groups/{group['id']}/balances").json()

    assert balances == {
        "INR": [{"from_member_id": asha["id"], "to_member_id": ravi["id"], "amount": "100.00"}]
    }


def test_settlement_for_missing_group_returns_404(client):
    response = client.post(
        "/groups/999/settlements",
        json={
            "from_member_id": 1,
            "to_member_id": 2,
            "amount": "100.00",
            "currency": "INR",
        },
    )

    assert response.status_code == 404
