import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.main import app # Corrected import path
from backend.models.base import Base
from backend.config import get_db
from backend.models.client import Client as ClientModel
# Ensure all models are imported so Base.metadata knows about them
from backend.models.session_note import SessionNote
from backend.models.assessment_note import AssessmentNote
from backend.models.supervision_note import SupervisionNote
# It's assumed ClientModel, SessionNote, AssessmentNote, SupervisionNote are registered with the same Base

from sqlalchemy.pool import StaticPool # Import StaticPool

# Setup in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool  # Use StaticPool for in-memory DB consistency
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override the get_db dependency to use the test database
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Create tables ONCE per session
@pytest.fixture(scope="session", autouse=True)
def create_tables_session_scoped():
    print("\nCreating tables (session-scoped fixture)...")
    print(f"Metadata tables BEFORE create_all: {list(Base.metadata.tables.keys())}")
    Base.metadata.create_all(bind=engine)
    print(f"Metadata tables AFTER create_all: {list(Base.metadata.tables.keys())}")
    print("Tables created (session-scoped fixture).")
    yield
    print("\nDropping tables (session-scoped fixture)...")
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped (session-scoped fixture).")

@pytest.fixture
def db_session(): # This provides a session for direct DB manipulation if needed by a test
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()

@pytest.fixture
def client(db_session): # This db_session ensures transactionality for setup if needed
    # Clean data from tables before each test, but tables should already exist.
    print("\nCleaning data from tables (client fixture)...")
    for table in reversed(Base.metadata.sorted_tables):
        # Use a new session for cleanup to ensure it's handled correctly
        temp_db = TestingSessionLocal()
        try:
            temp_db.execute(table.delete())
            temp_db.commit()
        except Exception as e:
            print(f"Error cleaning table {table.name}: {e}")
            temp_db.rollback()
            # If tables don't exist, this might still fail.
            # The session-scoped create_tables should ensure they exist.
        finally:
            temp_db.close()

    with TestClient(app) as c:
        yield c

import datetime

# API tests will be added below

def test_get_clients_empty(client):
    response = client.get("/api/clients/") # Default filter is "active"
    assert response.status_code == 200
    assert response.json() == []

def test_create_and_get_clients(client, db_session):
    # Corrected client data to match ClientCreate schema
    client_data1 = {
        "first_name": "John", "last_name": "Doe", "email": "john.doe@example.com",
        "phone": "1234567001", "date_of_birth": datetime.date(1990, 1, 1).isoformat()
    }
    response1 = client.post("/api/clients/", json=client_data1)
    assert response1.status_code == 200
    created_client1_id = response1.json()["id"]

    client_data2 = {
        "first_name": "Jane", "last_name": "Smith", "email": "jane.smith@example.com",
        "phone": "1234567002", "date_of_birth": datetime.date(1992, 2, 2).isoformat()
    }
    response2 = client.post("/api/clients/", json=client_data2)
    assert response2.status_code == 200
    # created_client2_id = response2.json()["id"] # Not used directly, but good to check

    # Archive John Doe
    archive_payload = {"archive": True}
    archive_response = client.post(f"/api/clients/{created_client1_id}/archive", json=archive_payload)
    assert archive_response.status_code == 200


    # Test get active clients (default filter)
    response_active = client.get("/api/clients/")
    assert response_active.status_code == 200
    active_clients = response_active.json()
    assert len(active_clients) == 1
    assert active_clients[0]["first_name"] == "Jane"
    assert active_clients[0]["status"] == "active"

    # Test get archived clients
    response_archived = client.get("/api/clients/?filter=archived")
    assert response_archived.status_code == 200
    archived_clients = response_archived.json()
    assert len(archived_clients) == 1
    assert archived_clients[0]["first_name"] == "John"
    assert archived_clients[0]["status"] == "archived"

    # Test get all clients
    response_all = client.get("/api/clients/?filter=all")
    assert response_all.status_code == 200
    all_clients = response_all.json()
    assert len(all_clients) == 2

def test_create_client_success(client):
    client_data = {
        "first_name": "Test", "last_name": "Client", "email": "test.client@example.com",
        "phone": "1234567890", "date_of_birth": datetime.date(1985, 5, 15).isoformat()
    }
    response = client.post("/api/clients/", json=client_data)
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == client_data["first_name"]
    assert data["last_name"] == client_data["last_name"]
    assert data["email"] == client_data["email"]
    assert "id" in data
    assert data["status"] == "active"

    get_response = client.get(f"/api/clients/{data['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["first_name"] == client_data["first_name"]

def test_create_client_missing_first_name(client):
    client_data = { # Missing first_name
        "last_name": "Client", "email": "test.client@example.com",
        "phone": "1234567890", "date_of_birth": datetime.date(1985, 5, 15).isoformat()
    }
    response = client.post("/api/clients/", json=client_data)
    assert response.status_code == 422
    # FastAPI should return a detail about the missing field
    error_loc = response.json()["detail"][0]["loc"]
    assert "first_name" in error_loc or ("body", "first_name") == tuple(error_loc)


def test_create_client_missing_phone(client): # phone is mandatory for ClientCreate
    client_data = {
        "first_name": "Test", "last_name": "Client", "email": "test.client@example.com",
         "date_of_birth": datetime.date(1985, 5, 15).isoformat()
    } # Missing phone
    response = client.post("/api/clients/", json=client_data)
    assert response.status_code == 422
    error_loc = response.json()["detail"][0]["loc"]
    assert "phone" in error_loc or ("body", "phone") == tuple(error_loc)


def test_create_client_invalid_email(client):
    client_data = {
        "first_name": "Test", "last_name": "Client", "email": "not-an-email",
        "phone": "1234567890", "date_of_birth": datetime.date(1985, 5, 15).isoformat()
    }
    response = client.post("/api/clients/", json=client_data)
    assert response.status_code == 422
    error_loc = response.json()["detail"][0]["loc"]
    assert "email" in error_loc or ("body", "email") == tuple(error_loc)


def test_get_client_by_id_found(client):
    client_data = {
        "first_name": "Specific", "last_name": "Client", "email": "specific@example.com",
        "phone": "0987654321", "date_of_birth": datetime.date(1970, 10, 20).isoformat()
    }
    create_response = client.post("/api/clients/", json=client_data)
    assert create_response.status_code == 200
    client_id = create_response.json()["id"]

    response = client.get(f"/api/clients/{client_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == client_id
    assert data["first_name"] == client_data["first_name"]
    assert data["email"] == client_data["email"]

def test_get_client_by_id_not_found(client):
    response = client.get("/api/clients/99999") # Non-existent ID
    assert response.status_code == 404
    assert response.json()["detail"] == "Client not found"

def test_update_client_success(client):
    client_data = {
        "first_name": "Original", "last_name": "Name", "email": "original@example.com",
        "phone": "111222333", "date_of_birth": datetime.date(1980, 1, 1).isoformat()
    }
    create_response = client.post("/api/clients/", json=client_data)
    assert create_response.status_code == 200
    client_id = create_response.json()["id"]

    update_payload = { # ClientUpdate allows all fields to be optional
        "first_name": "Updated", "last_name": "Name", "email": "updated@example.com",
        "phone": "444555666",
    }
    response = client.put(f"/api/clients/{client_id}", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == client_id
    assert data["first_name"] == update_payload["first_name"]
    assert data["email"] == update_payload["email"]
    assert data["phone"] == update_payload["phone"]
    assert data["status"] == create_response.json()["status"]

    get_response = client.get(f"/api/clients/{client_id}")
    assert get_response.status_code == 200
    assert get_response.json()["first_name"] == update_payload["first_name"]

def test_update_client_partial_update(client):
    client_data = {
        "first_name": "Partial", "last_name": "Original", "email": "partial.original@example.com",
        "phone": "777888999", "date_of_birth": datetime.date(1995, 3, 3).isoformat()
    }
    create_response = client.post("/api/clients/", json=client_data)
    assert create_response.status_code == 200
    client_id = create_response.json()["id"]

    update_payload = {"first_name": "Partial Updated Name", "last_name": "Original Still"} # Provide last_name as well
    response = client.put(f"/api/clients/{client_id}", json=update_payload)
    assert response.status_code == 200 # Expecting success now
    data = response.json()
    assert data["first_name"] == update_payload["first_name"]
    assert data["last_name"] == update_payload["last_name"] # Check last_name is also updated
    assert data["email"] == client_data["email"]

def test_update_client_not_found(client):
    update_payload = {"first_name": "Nobody", "last_name": "Exists"}
    response = client.put("/api/clients/99999", json=update_payload)
    assert response.status_code == 404
    assert response.json()["detail"] == "Client not found"

def test_update_client_invalid_email(client):
    client_data = {
        "first_name": "Email", "last_name": "Test", "email": "valid@example.com",
        "phone": "123123123", "date_of_birth": datetime.date(1990, 4, 4).isoformat()
    }
    create_response = client.post("/api/clients/", json=client_data)
    assert create_response.status_code == 200
    client_id = create_response.json()["id"]

    update_payload = {"email": "not-a-valid-email"}
    response = client.put(f"/api/clients/{client_id}", json=update_payload)
    assert response.status_code == 422
    error_detail = response.json()["detail"]
    # Check if any of the error items refer to the 'email' field in the body
    assert any(err_item["loc"] == ["body", "email"] for err_item in error_detail)


def test_archive_client(client):
    client_data = {
        "first_name": "To", "last_name": "Archive", "email": "archive@example.com",
        "phone": "555666777", "date_of_birth": datetime.date(2000, 1, 1).isoformat()
    }
    create_response = client.post("/api/clients/", json=client_data)
    assert create_response.status_code == 200
    client_id = create_response.json()["id"]
    assert create_response.json()["status"] == "active"

    archive_payload_test = {"archive": True}
    response = client.post(f"/api/clients/{client_id}/archive", json=archive_payload_test)
    assert response.status_code == 200
    archived_data = response.json() # Expect ClientResponse
    assert archived_data["id"] == client_id
    assert archived_data["status"] == "archived"
    assert archived_data["first_name"] == client_data["first_name"]

    get_response = client.get(f"/api/clients/{client_id}")
    assert get_response.status_code == 200
    assert get_response.json()["status"] == "archived"

def test_unarchive_client(client):
    client_data = {
        "first_name": "To", "last_name": "Unarchive", "email": "unarchive@example.com",
        "phone": "888999000", "date_of_birth": datetime.date(2001, 2, 2).isoformat()
    }
    create_response = client.post("/api/clients/", json=client_data)
    assert create_response.status_code == 200
    client_id = create_response.json()["id"]

    archive_payload = {"archive": True}
    response_arc = client.post(f"/api/clients/{client_id}/archive", json=archive_payload)
    assert response_arc.status_code == 200
    archived_data_arc = response_arc.json() # Expect ClientResponse
    assert archived_data_arc["id"] == client_id
    assert archived_data_arc["status"] == "archived"

    get_response_archived = client.get(f"/api/clients/{client_id}")
    assert get_response_archived.json()["status"] == "archived"

    unarchive_payload_test = {"archive": False}
    response_unarc = client.post(f"/api/clients/{client_id}/archive", json=unarchive_payload_test)
    assert response_unarc.status_code == 200
    unarchived_data = response_unarc.json() # Expect ClientResponse
    assert unarchived_data["id"] == client_id
    assert unarchived_data["status"] == "active"

    get_response_unarchived = client.get(f"/api/clients/{client_id}")
    assert get_response_unarchived.status_code == 200
    assert get_response_unarchived.json()["status"] == "active"

def test_archive_client_not_found(client):
    archive_payload_not_found = {"archive": True}
    response = client.post("/api/clients/99999/archive", json=archive_payload_not_found)
    assert response.status_code == 404
    assert response.json()["detail"] == "Client not found"

def test_archive_client_invalid_body(client): # Renamed and logic updated
    client_data = {
        "first_name": "Test", "last_name": "ArchiveInvalidBody", "email": "invalid.body@example.com",
        "phone": "123000123", "date_of_birth": datetime.date(2002, 3, 3).isoformat()
    }
    create_response = client.post("/api/clients/", json=client_data)
    assert create_response.status_code == 200
    client_id = create_response.json()["id"]

    # Test with empty JSON body
    response_empty_body = client.post(f"/api/clients/{client_id}/archive", json={})
    assert response_empty_body.status_code == 422 # Pydantic validation error
    assert response_empty_body.json()["detail"][0]["type"] == "missing"
    assert response_empty_body.json()["detail"][0]["loc"] == ["body", "archive"]

    # Test with incorrect field type in body
    response_wrong_type = client.post(f"/api/clients/{client_id}/archive", json={"archive": "not-a-boolean"})
    assert response_wrong_type.status_code == 422
    assert response_wrong_type.json()["detail"][0]["type"] == "bool_parsing"
    assert response_wrong_type.json()["detail"][0]["loc"] == ["body", "archive"]

def test_delete_client_success(client):
    client_data = {
        "first_name": "To", "last_name": "Delete", "email": "delete@example.com",
        "phone": "000111222", "date_of_birth": datetime.date(1999, 12, 31).isoformat()
    }
    create_response = client.post("/api/clients/", json=client_data)
    assert create_response.status_code == 200
    client_id = create_response.json()["id"]

    response = client.delete(f"/api/clients/{client_id}")
    assert response.status_code == 200
    deleted_data = response.json() # Expect ClientResponse of the deleted client
    assert deleted_data["id"] == client_id
    assert deleted_data["first_name"] == client_data["first_name"]
    assert deleted_data["email"] == client_data["email"]
    # The status in the returned object would be its status before deletion
    assert deleted_data["status"] == "active"

    get_response = client.get(f"/api/clients/{client_id}")
    assert get_response.status_code == 404

def test_delete_client_not_found(client):
    response = client.delete("/api/clients/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Client not found"
