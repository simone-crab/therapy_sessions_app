from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.models.base import BaseModel


class AppointmentException(BaseModel):
    __tablename__ = "appointment_exceptions"
    __table_args__ = (
        UniqueConstraint("appointment_id", "occurrence_start_datetime", name="uq_appointment_occurrence_exception"),
    )

    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False, index=True)
    occurrence_start_datetime = Column(DateTime, nullable=False)
    action = Column(String(16), nullable=False)
    new_start_datetime = Column(DateTime, nullable=True)
    new_end_datetime = Column(DateTime, nullable=True)

    appointment = relationship("Appointment", back_populates="exceptions")
