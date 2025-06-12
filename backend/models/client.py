from sqlalchemy import Column, String, Enum
from sqlalchemy.orm import relationship
from backend.models.base import BaseModel
import enum

class ClientStatus(enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"

class Client(BaseModel):
    __tablename__ = "clients"

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    status = Column(Enum(ClientStatus), default=ClientStatus.ACTIVE)

    session_notes = relationship("SessionNote", back_populates="client", cascade="all, delete")
    assessment_notes = relationship("AssessmentNote", back_populates="client", cascade="all, delete")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
