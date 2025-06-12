from sqlalchemy.orm import Session
from backend.models.supervision_note import SupervisionNote
from backend.schemas.supervision_note import SupervisionNoteCreate, SupervisionNoteUpdate
from typing import List, Optional

class SupervisionNoteService:

    @staticmethod
    def get_all_supervision_notes(db: Session) -> List[SupervisionNote]:
        return db.query(SupervisionNote).order_by(SupervisionNote.supervision_date.desc()).all()

    @staticmethod
    def create_supervision_note(db: Session, note: SupervisionNoteCreate) -> SupervisionNote:
        db_note = SupervisionNote(**note.dict())
        db.add(db_note)
        db.commit()
        db.refresh(db_note)
        return db_note

    @staticmethod
    def update_supervision_note(db: Session, note_id: int, update_data: SupervisionNoteUpdate) -> Optional[SupervisionNote]:
        db_note = db.query(SupervisionNote).filter(SupervisionNote.id == note_id).first()
        if db_note:
            for field, value in update_data.dict(exclude_unset=True).items():
                setattr(db_note, field, value)
            db.commit()
            db.refresh(db_note)
        return db_note

    @staticmethod
    def delete_supervision_note(db: Session, note_id: int) -> bool:
        db_note = db.query(SupervisionNote).filter(SupervisionNote.id == note_id).first()
        if db_note:
            db.delete(db_note)
            db.commit()
            return True
        return False
