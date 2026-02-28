from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, Text, Boolean
from sqlalchemy.orm import relationship

from backend.models.base import BaseModel


class Appointment(BaseModel):
    __tablename__ = "appointments"

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    start_datetime = Column(DateTime, nullable=False)
    end_datetime = Column(DateTime, nullable=False)
    timezone = Column(String(64), nullable=False, default="Europe/London")
    recurrence_rule = Column(Text, nullable=True)
    recurrence_until = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    client = relationship("Client", back_populates="appointments")
    exceptions = relationship("AppointmentException", back_populates="appointment", cascade="all, delete-orphan")
