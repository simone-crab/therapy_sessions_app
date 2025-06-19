from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.config import get_db
from backend.services.client_service import ClientService
from backend.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from typing import List
from pydantic import BaseModel

router = APIRouter()

class ArchiveRequest(BaseModel):
    archive: bool

@router.get("/", response_model=List[ClientResponse])
def get_clients(filter: str = "active", db: Session = Depends(get_db)):
    return ClientService.get_clients(db, filter)

@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = ClientService.get_client_by_id(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.post("/", response_model=ClientResponse)
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    return ClientService.create_client(db, client)

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, update: ClientUpdate, db: Session = Depends(get_db)):
    client = ClientService.update_client(db, client_id, update)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.post("/{client_id}/archive")
def set_archive_status(
    client_id: int,
    archive: bool = Query(None),
    archive_request: ArchiveRequest = None,
    db: Session = Depends(get_db)
):
    # Use either the query parameter or the request body value
    archive_status = archive if archive is not None else (archive_request.archive if archive_request else None)
    
    if archive_status is None:
        raise HTTPException(status_code=400, detail="Archive status must be provided either as a query parameter or in the request body")
    
    client = ClientService.set_archive_status(db, client_id, archive_status)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": f"Client {'archived' if archive_status else 'unarchived'}"}

@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    success = ClientService.delete_client(db, client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted"}
