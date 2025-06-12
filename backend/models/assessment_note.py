from sqlalchemy import Column, Integer, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.models.base import BaseModel

class AssessmentNote(BaseModel):
    __tablename__ = "assessment_notes"

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    assessment_date = Column(Date, nullable=False)
    content = Column(Text)

    client = relationship("Client", back_populates="assessment_notes")
