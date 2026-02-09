from sqlalchemy.orm import Session
from backend.models.cpd_note import CPDNote
from backend.schemas.cpd_note import CPDNoteCreate, CPDNoteUpdate
from typing import List, Optional

class CPDNoteService:

    @staticmethod
    def get_all_cpd_notes(db: Session) -> List[CPDNote]:
        return db.query(CPDNote).order_by(CPDNote.cpd_date.asc()).all()

    @staticmethod
    def create_cpd_note(db: Session, note: CPDNoteCreate) -> CPDNote:
        db_note = CPDNote(**note.dict())
        db.add(db_note)
        db.commit()
        db.refresh(db_note)
        return db_note

    @staticmethod
    def update_cpd_note(db: Session, note_id: int, update_data: CPDNoteUpdate) -> Optional[CPDNote]:
        db_note = db.query(CPDNote).filter(CPDNote.id == note_id).first()
        if db_note:
            for field, value in update_data.dict(exclude_unset=True).items():
                setattr(db_note, field, value)
            db.commit()
            db.refresh(db_note)
        return db_note

    @staticmethod
    def delete_cpd_note(db: Session, note_id: int) -> bool:
        db_note = db.query(CPDNote).filter(CPDNote.id == note_id).first()
        if db_note:
            db.delete(db_note)
            db.commit()
            return True
        return False

