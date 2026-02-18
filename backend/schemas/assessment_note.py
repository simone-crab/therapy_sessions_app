from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class AssessmentNoteBase(BaseModel):
    assessment_date: date
    duration_minutes: int
    is_paid: bool = False
    content: Optional[str] = None
    personal_notes: Optional[str] = None

class AssessmentNoteCreate(AssessmentNoteBase):
    client_id: int

class AssessmentNoteUpdate(AssessmentNoteBase):
    assessment_date: Optional[date] = None
    duration_minutes: Optional[int] = None
    is_paid: Optional[bool] = None
    content: Optional[str] = None
    personal_notes: Optional[str] = None

class AssessmentNoteResponse(AssessmentNoteBase):
    id: int
    client_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
