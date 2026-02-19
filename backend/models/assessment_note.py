from sqlalchemy import Column, Integer, Date, Text, ForeignKey, Boolean, String
from sqlalchemy.orm import relationship
from backend.models.base import BaseModel

class AssessmentNote(BaseModel):
    __tablename__ = "assessment_notes"

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    assessment_date = Column(Date, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    is_paid = Column(Boolean, default=False)
    content = Column(Text)
    personal_notes = Column(Text)
    session_type = Column(String(20), nullable=False, default="Online")

    client = relationship("Client", back_populates="assessment_notes")
