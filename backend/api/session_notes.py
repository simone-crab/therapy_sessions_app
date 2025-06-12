from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.config import get_db
from backend.services.session_note_service import SessionNoteService
from backend.schemas.session_note import SessionNoteCreate, SessionNoteUpdate, SessionNoteResponse
from typing import List

router = APIRouter()

@router.get("/client/{client_id}", response_model=List[SessionNoteResponse])
def get_sessions(client_id: int, db: Session = Depends(get_db)):
    return SessionNoteService.get_client_sessions(db, client_id)

@router.get("/{session_id}", response_model=SessionNoteResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = SessionNoteService.get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.post("/", response_model=SessionNoteResponse)
def create_session(session: SessionNoteCreate, db: Session = Depends(get_db)):
    return SessionNoteService.create_session(db, session)

@router.put("/{session_id}", response_model=SessionNoteResponse)
def update_session(session_id: int, update: SessionNoteUpdate, db: Session = Depends(get_db)):
    session = SessionNoteService.update_session(db, session_id, update)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.delete("/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    success = SessionNoteService.delete_session(db, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted"}
