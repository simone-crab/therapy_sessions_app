from typing import Optional

from pydantic import BaseModel, EmailStr


class TherapistDetailUpsert(BaseModel):
    business_name: str
    therapy_type: str
    website: Optional[str] = None
    email: EmailStr
    bank: str
    sort_code: str
    account_number: str


class TherapistDetailResponse(BaseModel):
    business_name: str = ""
    therapy_type: str = ""
    website: str = ""
    email: str = ""
    bank: str = ""
    sort_code: str = ""
    account_number: str = ""

    class Config:
        from_attributes = True
