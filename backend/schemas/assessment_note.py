from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class AssessmentNoteBase(BaseModel):
    assessment_date: date
    content: Optional[str] = None

class AssessmentNoteCreate(AssessmentNoteBase):
    client_id: int

class AssessmentNoteUpdate(AssessmentNoteBase):
    assessment_date: Optional[date] = None
    content: Optional[str] = None

class AssessmentNoteResponse(AssessmentNoteBase):
    id: int
    client_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
