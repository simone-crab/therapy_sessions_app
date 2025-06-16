from sqlalchemy import Column, String, Enum, Date
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
    date_of_birth = Column(Date, nullable=True)
    initial_assessment_date = Column(Date, nullable=True)
    address1 = Column(String(255), nullable=True)
    address2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    postcode = Column(String(20), nullable=True)
    emergency_contact_name = Column(String(100), nullable=True)
    emergency_contact_relationship = Column(String(100), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    gp_name = Column(String(100), nullable=True)
    gp_practice = Column(String(255), nullable=True)
    gp_phone = Column(String(50), nullable=True)
    status = Column(Enum(ClientStatus), default=ClientStatus.ACTIVE)

    session_notes = relationship("SessionNote", back_populates="client", cascade="all, delete")
    assessment_notes = relationship("AssessmentNote", back_populates="client", cascade="all, delete")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        if self.date_of_birth:
            from datetime import date
            today = date.today()
            return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
        return None
