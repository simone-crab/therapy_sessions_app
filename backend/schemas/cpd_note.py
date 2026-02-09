from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class CPDNoteBase(BaseModel):
    cpd_date: date
    content: Optional[str] = None
    duration_minutes: Optional[int] = None

class CPDNoteCreate(CPDNoteBase):
    pass

class CPDNoteResponse(CPDNoteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
        
class CPDNoteUpdate(BaseModel):
    cpd_date: Optional[date] = None
    content: Optional[str] = None
    duration_minutes: Optional[int] = None

