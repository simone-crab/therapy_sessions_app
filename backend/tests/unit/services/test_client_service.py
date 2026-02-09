import pytest
import datetime # Added for date_of_birth
from unittest.mock import MagicMock
from sqlalchemy.orm import Session
from backend.services.client_service import ClientService # Corrected: use ClientService class
from backend.models.client import Client, ClientStatus # Corrected: import ClientStatus
from backend.schemas.client import ClientCreate, ClientUpdate
from fastapi import HTTPException

@pytest.fixture
def db_session_mock():
    return MagicMock(spec=Session)

def test_get_clients_active(db_session_mock):
    # Adjusted Client instantiation
    mock_client_1 = Client(id=1, first_name="Client", last_name="1", email="client1@example.com", status=ClientStatus.ACTIVE)
    mock_client_2 = Client(id=2, first_name="Client", last_name="2", email="client2@example.com", status=ClientStatus.ACTIVE)
    # Adjusted mock to include order_by
    db_session_mock.query(Client).filter(Client.status == ClientStatus.ACTIVE).order_by(Client.first_name, Client.last_name).all.return_value = [mock_client_1, mock_client_2]

    clients = ClientService.get_clients(db_session_mock, filter="active")
    assert len(clients) == 2
    assert clients[0].first_name == "Client"
    db_session_mock.query(Client).filter(Client.status == ClientStatus.ACTIVE).order_by(Client.first_name, Client.last_name).all.assert_called_once()

def test_get_clients_archived(db_session_mock):
    mock_client_1 = Client(id=3, first_name="Client", last_name="3", email="client3@example.com", status=ClientStatus.ARCHIVED)
    # Adjusted mock to include order_by
    db_session_mock.query(Client).filter(Client.status == ClientStatus.ARCHIVED).order_by(Client.first_name, Client.last_name).all.return_value = [mock_client_1]

    clients = ClientService.get_clients(db_session_mock, filter="archived")
    assert len(clients) == 1
    assert clients[0].first_name == "Client"
    assert clients[0].status == ClientStatus.ARCHIVED
    db_session_mock.query(Client).filter(Client.status == ClientStatus.ARCHIVED).order_by(Client.first_name, Client.last_name).all.assert_called_once()

def test_get_clients_all(db_session_mock):
    mock_client_1 = Client(id=1, first_name="Client", last_name="1", email="client1@example.com", status=ClientStatus.ACTIVE)
    mock_client_2 = Client(id=3, first_name="Client", last_name="3", email="client3@example.com", status=ClientStatus.ARCHIVED)
    # Adjusted mock to include order_by
    db_session_mock.query(Client).order_by(Client.first_name, Client.last_name).all.return_value = [mock_client_1, mock_client_2]

    clients = ClientService.get_clients(db_session_mock, filter="all")
    assert len(clients) == 2
    db_session_mock.query(Client).order_by(Client.first_name, Client.last_name).all.assert_called_once()

def test_get_client_by_id_found(db_session_mock):
    mock_client = Client(id=1, first_name="Client", last_name="1", email="client1@example.com")
    db_session_mock.query(Client).filter(Client.id == 1).first.return_value = mock_client

    client = ClientService.get_client_by_id(db_session_mock, client_id=1) # Corrected service call
    assert client is not None
    assert client.first_name == "Client"
    db_session_mock.query(Client).filter(Client.id == 1).first.assert_called_once()

def test_get_client_by_id_not_found(db_session_mock):
    db_session_mock.query(Client).filter(Client.id == 1).first.return_value = None

    client = ClientService.get_client_by_id(db_session_mock, client_id=1) # Corrected service call
    assert client is None
    db_session_mock.query(Client).filter(Client.id == 1).first.assert_called_once()

def test_create_client(db_session_mock):
    # Adjusted ClientCreate instantiation with required fields
    client_data = ClientCreate(
        first_name="New",
        last_name="Client",
        client_code="CL001",
        email="new@example.com",
        phone="1234567890",
        date_of_birth=datetime.date(2000, 1, 1)
    )

    # The service method itself creates the Client instance. We don't mock Client() directly here.
    # We expect the service to call db.add(), db.commit(), db.refresh()

    # Simulate the behavior of db.refresh, which populates the ID of the added object
    def refresh_side_effect(instance):
        instance.id = 1 # Simulate ID assignment
    db_session_mock.refresh.side_effect = refresh_side_effect
    db_session_mock.query(Client).filter(Client.client_code == client_data.client_code).first.return_value = None

    # We also need to make sure that when ClientService.create_client creates a Client model instance,
    # it's correctly formed. The service itself handles this.
    # The test focuses on the service's interaction with the DB session.

    created_client = ClientService.create_client(db_session_mock, client_data) # Corrected service call

    db_session_mock.add.assert_called_once()
    added_instance = db_session_mock.add.call_args[0][0]
    assert added_instance.first_name == client_data.first_name
    assert added_instance.email == client_data.email

    db_session_mock.commit.assert_called_once()
    db_session_mock.refresh.assert_called_once()

    assert created_client is not None
    assert created_client.id == 1 # Check if ID was assigned (simulated by refresh side effect)
    assert created_client.first_name == "New"
    assert created_client.email == "new@example.com"

def test_update_client_found(db_session_mock):
    existing_client = Client(id=1, first_name="Old", last_name="Name", email="old@example.com")
    db_session_mock.query(Client).filter(Client.id == 1).first.return_value = existing_client

    # Adjusted ClientUpdate instantiation
    update_data = ClientUpdate(first_name="Updated", last_name="Name", email="new@example.com")

    updated_client = ClientService.update_client(db_session_mock, client_id=1, update_data=update_data) # Corrected service call

    assert updated_client is not None
    assert updated_client.first_name == "Updated"
    assert updated_client.email == "new@example.com"
    db_session_mock.commit.assert_called_once()
    db_session_mock.refresh.assert_called_once_with(existing_client)

def test_update_client_not_found(db_session_mock):
    db_session_mock.query(Client).filter(Client.id == 1).first.return_value = None
    update_data = ClientUpdate(first_name="New", last_name="Name") # Adjusted

    updated_client = ClientService.update_client(db_session_mock, client_id=1, update_data=update_data) # Corrected service call
    assert updated_client is None
    db_session_mock.commit.assert_not_called()
    db_session_mock.refresh.assert_not_called()

def test_update_client_duplicate_client_code(db_session_mock):
    existing_client = Client(id=1, first_name="Old", last_name="Name", email="old@example.com")
    duplicate_client = Client(id=2, first_name="Dup", last_name="Code", email="dup@example.com")

    query_for_client = MagicMock()
    query_for_client.filter.return_value.first.return_value = existing_client
    query_for_duplicate = MagicMock()
    query_for_duplicate.filter.return_value.first.return_value = duplicate_client

    db_session_mock.query.side_effect = [query_for_client, query_for_duplicate]

    update_data = ClientUpdate(first_name="Old", last_name="Name", client_code="DUP001")

    with pytest.raises(ValueError):
        ClientService.update_client(db_session_mock, client_id=1, update_data=update_data)

    db_session_mock.commit.assert_not_called()
    db_session_mock.refresh.assert_not_called()

def test_set_archive_status_archive_client(db_session_mock):
    client_to_archive = Client(id=1, first_name="Client", last_name="Archive", email="client@example.com", status=ClientStatus.ACTIVE)
    db_session_mock.query(Client).filter(Client.id == 1).first.return_value = client_to_archive

    archived_client = ClientService.set_archive_status(db_session_mock, client_id=1, archive=True) # Corrected service call

    assert archived_client is not None
    assert archived_client.status == ClientStatus.ARCHIVED # Check status enum
    db_session_mock.commit.assert_called_once()
    db_session_mock.refresh.assert_called_once_with(client_to_archive)

def test_set_archive_status_unarchive_client(db_session_mock):
    client_to_unarchive = Client(id=1, first_name="Client", last_name="Unarchive", email="client@example.com", status=ClientStatus.ARCHIVED)
    db_session_mock.query(Client).filter(Client.id == 1).first.return_value = client_to_unarchive

    unarchived_client = ClientService.set_archive_status(db_session_mock, client_id=1, archive=False) # Corrected service call

    assert unarchived_client is not None
    assert unarchived_client.status == ClientStatus.ACTIVE # Check status enum
    db_session_mock.commit.assert_called_once()
    db_session_mock.refresh.assert_called_once_with(client_to_unarchive)

def test_set_archive_status_client_not_found(db_session_mock):
    db_session_mock.query(Client).filter(Client.id == 1).first.return_value = None

    result = ClientService.set_archive_status(db_session_mock, client_id=1, archive=True) # Corrected service call

    assert result is None
    db_session_mock.commit.assert_not_called()
    db_session_mock.refresh.assert_not_called()

def test_delete_client_found(db_session_mock):
    client_to_delete = Client(id=1, first_name="Client", last_name="Delete", email="client@example.com")
    db_session_mock.query(Client).filter(Client.id == 1).first.return_value = client_to_delete

    # delete_client service method now returns the client object or None
    deleted_client_object = ClientService.delete_client(db_session_mock, client_id=1)

    assert deleted_client_object is client_to_delete # Check if the returned object is the one we expected to delete
    db_session_mock.delete.assert_called_once_with(client_to_delete)
    db_session_mock.commit.assert_called_once()

def test_delete_client_not_found(db_session_mock):
    db_session_mock.query(Client).filter(Client.id == 1).first.return_value = None

    deleted_client_object = ClientService.delete_client(db_session_mock, client_id=1)

    assert deleted_client_object is None # Check if None is returned for not found client
    db_session_mock.delete.assert_not_called()
    db_session_mock.commit.assert_not_called()
