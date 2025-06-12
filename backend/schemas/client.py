from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from backend.models.client import ClientStatus

class ClientBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(ClientBase):
    status: Optional[ClientStatus] = None

class ClientResponse(ClientBase):
    id: int
    status: ClientStatus
    created_at: datetime
    updated_at: Optional[datetime]
    full_name: str

    class Config:
        from_attributes = True

class ClientWithNotes(ClientResponse):
    session_notes: List["SessionNoteResponse"] = []
    assessment_notes: List["AssessmentNoteResponse"] = []
