from sqlalchemy.orm import Session
from backend.models.assessment_note import AssessmentNote
from backend.schemas.assessment_note import AssessmentNoteCreate, AssessmentNoteUpdate
from typing import List, Optional

class AssessmentNoteService:

    @staticmethod
    def get_client_assessments(db: Session, client_id: int) -> List[AssessmentNote]:
        return db.query(AssessmentNote)\
                 .filter(AssessmentNote.client_id == client_id)\
                 .order_by(AssessmentNote.assessment_date.desc()).all()

    @staticmethod
    def get_assessment_by_id(db: Session, assessment_id: int) -> Optional[AssessmentNote]:
        return db.query(AssessmentNote).filter(AssessmentNote.id == assessment_id).first()

    @staticmethod
    def create_assessment(db: Session, note: AssessmentNoteCreate) -> AssessmentNote:
        db_note = AssessmentNote(**note.dict())
        db.add(db_note)
        db.commit()
        db.refresh(db_note)
        return db_note

    @staticmethod
    def update_assessment(db: Session, assessment_id: int, update_data: AssessmentNoteUpdate) -> Optional[AssessmentNote]:
        db_note = db.query(AssessmentNote).filter(AssessmentNote.id == assessment_id).first()
        if db_note:
            for field, value in update_data.dict(exclude_unset=True).items():
                setattr(db_note, field, value)
            db.commit()
            db.refresh(db_note)
        return db_note

    @staticmethod
    def delete_assessment(db: Session, assessment_id: int) -> bool:
        db_note = db.query(AssessmentNote).filter(AssessmentNote.id == assessment_id).first()
        if db_note:
            db.delete(db_note)
            db.commit()
            return True
        return False
