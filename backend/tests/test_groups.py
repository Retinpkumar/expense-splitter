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


def test_create_group_returns_created_group(client):
    response = client.post("/groups", json={"name": "Trip to Goa"})

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Trip to Goa"
    assert isinstance(body["id"], int)


def test_create_group_requires_name(client):
    response = client.post("/groups", json={})

    assert response.status_code == 422


def test_add_member_returns_created_member(client):
    group = client.post("/groups", json={"name": "Trip to Goa"}).json()

    response = client.post(f"/groups/{group['id']}/members", json={"name": "Asha"})

    assert response.status_code == 201
    body = response.json()
    assert body["group_id"] == group["id"]
    assert body["name"] == "Asha"
    assert isinstance(body["id"], int)


def test_add_member_requires_name(client):
    group = client.post("/groups", json={"name": "Trip to Goa"}).json()

    response = client.post(f"/groups/{group['id']}/members", json={})

    assert response.status_code == 422


def test_add_member_rejects_duplicate_name_in_same_group(client):
    group = client.post("/groups", json={"name": "Trip to Goa"}).json()
    client.post(f"/groups/{group['id']}/members", json={"name": "Asha"})

    response = client.post(f"/groups/{group['id']}/members", json={"name": "Asha"})

    assert response.status_code == 400


def test_add_member_allows_same_name_in_different_groups(client):
    group_a = client.post("/groups", json={"name": "Trip to Goa"}).json()
    group_b = client.post("/groups", json={"name": "Office Lunch"}).json()
    client.post(f"/groups/{group_a['id']}/members", json={"name": "Asha"})

    response = client.post(f"/groups/{group_b['id']}/members", json={"name": "Asha"})

    assert response.status_code == 201


def test_add_member_to_missing_group_returns_404(client):
    response = client.post("/groups/999/members", json={"name": "Asha"})

    assert response.status_code == 404
