from sqlalchemy import Column, String

from backend.models.base import BaseModel


class TherapistDetail(BaseModel):
    __tablename__ = "therapist_details"

    business_name = Column(String(255), nullable=False)
    therapy_type = Column(String(255), nullable=False)
    website = Column(String(512), nullable=True)
    email = Column(String(255), nullable=False)
    bank = Column(String(255), nullable=False)
    sort_code = Column(String(64), nullable=False)
    account_number = Column(String(64), nullable=False)
