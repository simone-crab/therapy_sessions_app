from sqlalchemy import Column, String

from backend.models.base import BaseModel


class TherapistDetail(BaseModel):
    __tablename__ = "therapist_details"

    business_name = Column(String(255), nullable=False)
    therapist_name = Column(String(255), nullable=False)
    accreditation = Column(String(255), nullable=True)
    street = Column(String(255), nullable=True)
    city = Column(String(120), nullable=True)
    postcode = Column(String(32), nullable=True)
    therapy_type = Column(String(255), nullable=False)
    website = Column(String(512), nullable=True)
    email = Column(String(255), nullable=False)
    bank = Column(String(255), nullable=False)
    session_hourly_rate = Column(String(64), nullable=False)
    currency = Column(String(16), nullable=False, default="GBP")
    sort_code = Column(String(64), nullable=False)
    account_number = Column(String(64), nullable=False)
    iban = Column(String(128), nullable=False, default="")
    bic = Column(String(128), nullable=False, default="")
