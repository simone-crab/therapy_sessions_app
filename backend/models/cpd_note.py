from sqlalchemy import Column, Date, Text, String, Float
from backend.models.base import BaseModel

# Medium options: Online, Podcast, Book, In-Person
MEDIUM_OPTIONS = ("Online", "Podcast", "Book", "In-Person")


class CPDNote(BaseModel):
    __tablename__ = "cpd_notes"

    cpd_date = Column(Date, nullable=False)
    duration_hours = Column(Float, nullable=False, default=1.0)
    content = Column(Text)  # Focus and Outcome
    organisation = Column(String(255), nullable=False, default="")
    title = Column(String(255), nullable=False, default="")
    medium = Column(String(64), nullable=False, default="Online")
