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
        data = getattr(note, "model_dump", None) and note.model_dump() or note.dict()
        db_note = CPDNote(**data)
        db.add(db_note)
        db.commit()
        db.refresh(db_note)
        return db_note

    @staticmethod
    def update_cpd_note(db: Session, note_id: int, update_data: CPDNoteUpdate) -> Optional[CPDNote]:
        db_note = db.query(CPDNote).filter(CPDNote.id == note_id).first()
        if db_note:
            update_dict = getattr(update_data, "model_dump", None) and update_data.model_dump(exclude_unset=True) or update_data.dict(exclude_unset=True)
            for field, value in update_dict.items():
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

