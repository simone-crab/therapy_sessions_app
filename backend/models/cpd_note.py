from sqlalchemy import Column, Date, Text, Integer
from backend.models.base import BaseModel

class CPDNote(BaseModel):
    __tablename__ = "cpd_notes"

    cpd_date = Column(Date, nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=50)
    content = Column(Text)

