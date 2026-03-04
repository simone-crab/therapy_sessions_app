from typing import Optional

from sqlalchemy.orm import Session

from backend.models.therapist_detail import TherapistDetail


class TherapistDetailService:
    @staticmethod
    def get_therapist_details(db: Session) -> Optional[TherapistDetail]:
        return db.query(TherapistDetail).order_by(TherapistDetail.id.asc()).first()

    @staticmethod
    def upsert_therapist_details(db: Session, payload: dict) -> TherapistDetail:
        details = TherapistDetailService.get_therapist_details(db)
        if details is None:
            details = TherapistDetail(**payload)
            db.add(details)
        else:
            for field, value in payload.items():
                setattr(details, field, value)

        db.commit()
        db.refresh(details)
        return details
