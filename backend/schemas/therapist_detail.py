from typing import Optional

from pydantic import BaseModel, EmailStr


class TherapistDetailUpsert(BaseModel):
    business_name: str
    therapist_name: str
    accreditation: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    therapy_type: str
    website: Optional[str] = None
    email: EmailStr
    bank: str
    session_hourly_rate: Optional[str] = None
    currency: Optional[str] = None
    sort_code: str
    account_number: str
    iban: Optional[str] = None
    bic: Optional[str] = None


class TherapistDetailResponse(BaseModel):
    business_name: str = ""
    therapist_name: str = ""
    accreditation: str = ""
    street: str = ""
    city: str = ""
    postcode: str = ""
    therapy_type: str = ""
    website: str = ""
    email: str = ""
    bank: str = ""
    session_hourly_rate: str = ""
    currency: str = "GBP"
    sort_code: str = ""
    account_number: str = ""
    iban: str = ""
    bic: str = ""

    class Config:
        from_attributes = True
