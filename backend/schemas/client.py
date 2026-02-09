from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date
from backend.models.client import ClientStatus

class ClientBase(BaseModel):
    first_name: str
    last_name: str
    client_code: Optional[str] = Field(
        None,
        pattern=r"^[A-Za-z0-9_.-]+$",
        description="Client code may include letters, numbers, hyphen, underscore, and dot."
    )
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, description="Phone number is required for new clients")
    date_of_birth: Optional[date] = Field(None, description="Date of birth is required for new clients")
    initial_assessment_date: Optional[date] = None
    address1: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    gp_name: Optional[str] = None
    gp_practice: Optional[str] = None
    gp_phone: Optional[str] = None

class ClientCreate(ClientBase):
    phone: str = Field(..., description="Phone number is required")
    date_of_birth: date = Field(..., description="Date of birth is required")
    client_code: str = Field(
        ...,
        min_length=1,
        pattern=r"^[A-Za-z0-9_.-]+$",
        description="Client code is required and may include letters, numbers, hyphen, underscore, and dot."
    )

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
