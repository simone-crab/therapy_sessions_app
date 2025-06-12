from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class SupervisionNoteBase(BaseModel):
    supervision_date: date
    content: Optional[str] = None

class SupervisionNoteCreate(SupervisionNoteBase):
    pass

class SupervisionNoteUpdate(SupervisionNoteBase):
    supervision_date: Optional[date] = None
    content: Optional[str] = None

class SupervisionNoteResponse(SupervisionNoteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
