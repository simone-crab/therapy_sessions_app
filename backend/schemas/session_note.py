from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class SessionNoteBase(BaseModel):
    session_date: date
    duration_minutes: int
    is_paid: bool = False
    content: Optional[str] = None
    session_type: str = "In-Person"

class SessionNoteCreate(SessionNoteBase):
    client_id: int

class SessionNoteUpdate(SessionNoteBase):
    session_date: Optional[date] = None
    duration_minutes: Optional[int] = None
    is_paid: Optional[bool] = None
    content: Optional[str] = None
    session_type: Optional[str] = None

class SessionNoteResponse(SessionNoteBase):
    id: int
    client_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
