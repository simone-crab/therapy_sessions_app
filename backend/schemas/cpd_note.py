from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class CPDNoteBase(BaseModel):
    cpd_date: date
    content: Optional[str] = None
    duration_hours: float = Field(ge=0, description="Time logged in hours (e.g. 1.5, 3)")
    organisation: str = ""
    title: str = ""
    medium: str = "Online"  # Online | Podcast | Book | In-Person


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
    duration_hours: Optional[float] = Field(None, ge=0)
    organisation: Optional[str] = None
    title: Optional[str] = None
    medium: Optional[str] = None
