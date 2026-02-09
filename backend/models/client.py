"""
SQLAlchemy model for a Client and related enums.

This module defines the `Client` table schema, including its columns,
relationships, and any specific properties or helper methods.
It also defines the `ClientStatus` enum used for the client's status.
"""
from sqlalchemy import Column, String, Enum, Date
from sqlalchemy.orm import relationship
from backend.models.base import BaseModel
# Ensure related models are imported for SQLAlchemy relationship setup
from backend.models.session_note import SessionNote
from backend.models.assessment_note import AssessmentNote
import enum

class ClientStatus(enum.Enum):
    """Enumeration for the status of a client."""
    ACTIVE = "active"
    ARCHIVED = "archived"

class Client(BaseModel):
    """
    Represents a client in the therapy session management system.

    Attributes:
        id (int): Primary key.
        first_name (str): Client's first name.
        last_name (str): Client's last name.
        client_code (Optional[str]): Unique client code identifier.
        email (Optional[str]): Client's email address.
        phone (Optional[str]): Client's phone number.
        date_of_birth (Optional[date]): Client's date of birth.
        initial_assessment_date (Optional[date]): Date of initial assessment.
        address1 (Optional[str]): First line of client's address.
        address2 (Optional[str]): Second line of client's address.
        city (Optional[str]): City of client's address.
        postcode (Optional[str]): Postcode of client's address.
        emergency_contact_name (Optional[str]): Name of emergency contact.
        emergency_contact_relationship (Optional[str]): Relationship to emergency contact.
        emergency_contact_phone (Optional[str]): Phone number of emergency contact.
        gp_name (Optional[str]): Name of client's GP.
        gp_practice (Optional[str]): Name of GP's practice.
        gp_phone (Optional[str]): Phone number of GP's practice.
        status (ClientStatus): Current status of the client (e.g., active, archived).
        created_at (datetime): Timestamp of when the client record was created.
        updated_at (datetime): Timestamp of when the client record was last updated.
        session_notes (List[SessionNote]): Related session notes for this client.
        assessment_notes (List[AssessmentNote]): Related assessment notes for this client.
    """
    __tablename__ = "clients"

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    client_code = Column(String(50), unique=True, nullable=True)
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
        """Returns the client's full name."""
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        """Calculates the client's current age based on date_of_birth."""
        if self.date_of_birth:
            from datetime import date
            today = date.today()
            return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
        return None
