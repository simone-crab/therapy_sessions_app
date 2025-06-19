"""
API Endpoints for client management.

This module defines the FastAPI routes for CRUD operations on clients,
including listing, creating, retrieving, updating, deleting,
and managing the archive status of clients.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.config import get_db
from backend.services.client_service import ClientService
from backend.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from typing import List
from pydantic import BaseModel
from backend import constants # Import constants

router = APIRouter()

class ArchiveRequest(BaseModel):
    """Request model for archiving or unarchiving a client."""
    archive: bool

@router.get("/", response_model=List[ClientResponse])
def get_clients(filter: str = "active", db: Session = Depends(get_db)):
    """
    Retrieve a list of clients.

    Args:
        filter: Filter clients by status ("active", "archived", "all").
                Defaults to "active".
        db: Database session dependency.

    Returns:
        A list of client objects.
    """
    return ClientService.get_clients(db, filter)

@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a single client by their ID.

    Args:
        client_id: The ID of the client to retrieve.
        db: Database session dependency.

    Raises:
        HTTPException: If the client is not found (404).

    Returns:
        The client object.
    """
    client = ClientService.get_client_by_id(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail=constants.MSG_CLIENT_NOT_FOUND)
    return client

@router.post("/", response_model=ClientResponse)
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    """
    Create a new client.

    Args:
        client: Client creation data.
        db: Database session dependency.

    Returns:
        The newly created client object.
    """
    return ClientService.create_client(db, client)

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, update: ClientUpdate, db: Session = Depends(get_db)):
    """
    Update an existing client.

    Args:
        client_id: The ID of the client to update.
        update: Client update data.
        db: Database session dependency.

    Raises:
        HTTPException: If the client is not found (404).

    Returns:
        The updated client object.
    """
    client = ClientService.update_client(db, client_id, update)
    if not client:
        raise HTTPException(status_code=404, detail=constants.MSG_CLIENT_NOT_FOUND)
    return client

@router.post("/{client_id}/archive", response_model=ClientResponse)
def set_archive_status(
    client_id: int,
    archive_request: ArchiveRequest,
    db: Session = Depends(get_db)
):
    """
    Set the archive status of a client.

    Args:
        client_id: The ID of the client.
        archive_request: Request body containing the archive status.
        db: Database session dependency.

    Raises:
        HTTPException: If the client is not found (404).

    Returns:
        The updated client object with its new archive status.
    """
    archive_status = archive_request.archive

    client = ClientService.set_archive_status(db, client_id, archive_status)
    if not client:
        raise HTTPException(status_code=404, detail=constants.MSG_CLIENT_NOT_FOUND)
    return client

@router.delete("/{client_id}", response_model=ClientResponse)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    """
    Delete a client.

    The client object is returned before being deleted from the database.

    Args:
        client_id: The ID of the client to delete.
        db: Database session dependency.

    Raises:
        HTTPException: If the client is not found (404).

    Returns:
        The client object that was deleted.
    """
    deleted_client = ClientService.delete_client(db, client_id)
    if not deleted_client:
        raise HTTPException(status_code=404, detail=constants.MSG_CLIENT_NOT_FOUND)
    return deleted_client
