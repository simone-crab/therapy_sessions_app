from sqlalchemy import Column, Date, Text
from backend.models.base import BaseModel

class SupervisionNote(BaseModel):
    __tablename__ = "supervision_notes"

    supervision_date = Column(Date, nullable=False)
    content = Column(Text)
