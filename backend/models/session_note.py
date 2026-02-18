from sqlalchemy import Column, Integer, Date, Boolean, Text, ForeignKey, String
from sqlalchemy.orm import relationship
from backend.models.base import BaseModel

class SessionNote(BaseModel):
    __tablename__ = "session_notes"

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    session_date = Column(Date, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    is_paid = Column(Boolean, default=False)
    content = Column(Text)
    personal_notes = Column(Text)
    session_type = Column(String(20), nullable=False, default="In-Person")

    client = relationship("Client", back_populates="session_notes")
