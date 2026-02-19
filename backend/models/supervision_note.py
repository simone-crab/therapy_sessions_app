from sqlalchemy import Column, Date, Text, Integer, ForeignKey, String
from backend.models.base import BaseModel

class SupervisionNote(BaseModel):
    __tablename__ = "supervision_notes"

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    supervision_date = Column(Date, nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=50)
    content = Column(Text)
    personal_notes = Column(Text)
    summary = Column(String(100), nullable=False, default="")
    session_type = Column(String(20), nullable=False, default="Online")
