from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime

class SupervisionNoteBase(BaseModel):
    client_id: int
    supervision_date: date
    content: Optional[str] = None
    personal_notes: Optional[str] = None
    summary: str = Field(default="", max_length=100)
    duration_minutes: Optional[int] = None
    session_type: str = "Online"

class SupervisionNoteCreate(SupervisionNoteBase):
    pass

class SupervisionNoteResponse(SupervisionNoteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
        
class SupervisionNoteUpdate(BaseModel):
    supervision_date: Optional[date] = None
    content: Optional[str] = None
    personal_notes: Optional[str] = None
    summary: Optional[str] = Field(default=None, max_length=100)
    duration_minutes: Optional[int] = None
    client_id: Optional[int] = None
    session_type: Optional[str] = None
