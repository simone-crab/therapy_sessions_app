from sqlalchemy.orm import Session
from backend.models.session_note import SessionNote
from backend.schemas.session_note import SessionNoteCreate, SessionNoteUpdate
from typing import List, Optional

class SessionNoteService:

    @staticmethod
    def get_client_sessions(db: Session, client_id: int) -> List[SessionNote]:
        return db.query(SessionNote).filter(SessionNote.client_id == client_id).order_by(SessionNote.session_date.desc()).all()

    @staticmethod
    def get_session_by_id(db: Session, session_id: int) -> Optional[SessionNote]:
        return db.query(SessionNote).filter(SessionNote.id == session_id).first()

    @staticmethod
    def create_session(db: Session, session: SessionNoteCreate) -> SessionNote:
        db_session = SessionNote(**session.dict())
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session

    @staticmethod
    def update_session(db: Session, session_id: int, update_data: SessionNoteUpdate) -> Optional[SessionNote]:
        db_session = db.query(SessionNote).filter(SessionNote.id == session_id).first()
        if db_session:
            for field, value in update_data.dict(exclude_unset=True).items():
                setattr(db_session, field, value)
            db.commit()
            db.refresh(db_session)
        return db_session

    @staticmethod
    def delete_session(db: Session, session_id: int) -> bool:
        db_session = db.query(SessionNote).filter(SessionNote.id == session_id).first()
        if db_session:
            db.delete(db_session)
            db.commit()
            return True
        return False
