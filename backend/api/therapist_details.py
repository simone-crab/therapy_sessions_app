from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, Dict, Optional

from backend.config import get_db
from backend.schemas.therapist_detail import TherapistDetailResponse, TherapistDetailUpsert
from backend.services.therapist_detail_service import TherapistDetailService

router = APIRouter()

_REQUIRED_FIELDS = {
    "business_name": "Business Name",
    "therapist_name": "Therapist Name",
    "therapy_type": "Therapy Type",
    "email": "Email",
    "bank": "Bank",
    "session_hourly_rate": "Session/Hourly Rate",
    "sort_code": "Sort Code",
    "account_number": "Account Number",
}


def _normalize_payload(payload: TherapistDetailUpsert) -> dict:
    raw = payload.model_dump()
    normalized = {
        "business_name": raw["business_name"].strip(),
        "therapist_name": raw["therapist_name"].strip(),
        "accreditation": (raw.get("accreditation") or "").strip(),
        "street": (raw.get("street") or "").strip(),
        "city": (raw.get("city") or "").strip(),
        "postcode": (raw.get("postcode") or "").strip(),
        "therapy_type": raw["therapy_type"].strip(),
        "website": (raw.get("website") or "").strip(),
        "email": str(raw["email"]).strip(),
        "bank": raw["bank"].strip(),
        "session_hourly_rate": raw["session_hourly_rate"].strip(),
        "currency": ((raw.get("currency") or "").strip().upper() or "GBP"),
        "sort_code": raw["sort_code"].strip(),
        "account_number": raw["account_number"].strip(),
    }

    missing = [label for key, label in _REQUIRED_FIELDS.items() if not normalized[key]]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required field(s): {', '.join(missing)}",
        )
    return normalized


def _to_response(data: Optional[Dict[str, Any]]) -> TherapistDetailResponse:
    if data is None:
        return TherapistDetailResponse()
    return TherapistDetailResponse(
        business_name=data.get("business_name", "") or "",
        therapist_name=data.get("therapist_name", "") or "",
        accreditation=data.get("accreditation", "") or "",
        street=data.get("street", "") or "",
        city=data.get("city", "") or "",
        postcode=data.get("postcode", "") or "",
        therapy_type=data.get("therapy_type", "") or "",
        website=data.get("website", "") or "",
        email=data.get("email", "") or "",
        bank=data.get("bank", "") or "",
        session_hourly_rate=data.get("session_hourly_rate", "") or "",
        currency=data.get("currency", "") or "GBP",
        sort_code=data.get("sort_code", "") or "",
        account_number=data.get("account_number", "") or "",
    )


@router.get("/", response_model=TherapistDetailResponse)
def get_therapist_details(db: Session = Depends(get_db)):
    details = TherapistDetailService.get_therapist_details(db)
    if details is None:
        return TherapistDetailResponse()
    return _to_response({
        "business_name": details.business_name,
        "therapist_name": details.therapist_name,
        "accreditation": details.accreditation,
        "street": details.street,
        "city": details.city,
        "postcode": details.postcode,
        "therapy_type": details.therapy_type,
        "website": details.website,
        "email": details.email,
        "bank": details.bank,
        "session_hourly_rate": details.session_hourly_rate,
        "currency": details.currency,
        "sort_code": details.sort_code,
        "account_number": details.account_number,
    })


@router.put("/", response_model=TherapistDetailResponse)
def upsert_therapist_details(payload: TherapistDetailUpsert, db: Session = Depends(get_db)):
    normalized = _normalize_payload(payload)
    details = TherapistDetailService.upsert_therapist_details(db, normalized)
    return _to_response({
        "business_name": details.business_name,
        "therapist_name": details.therapist_name,
        "accreditation": details.accreditation,
        "street": details.street,
        "city": details.city,
        "postcode": details.postcode,
        "therapy_type": details.therapy_type,
        "website": details.website,
        "email": details.email,
        "bank": details.bank,
        "session_hourly_rate": details.session_hourly_rate,
        "currency": details.currency,
        "sort_code": details.sort_code,
        "account_number": details.account_number,
    })
