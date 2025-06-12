from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.config import get_db
from backend.services.supervision_note_service import SupervisionNoteService
from backend.schemas.supervision_note import SupervisionNoteCreate, SupervisionNoteUpdate, SupervisionNoteResponse
from typing import List

router = APIRouter()

@router.get("/", response_model=List[SupervisionNoteResponse])
def get_supervision_notes(db: Session = Depends(get_db)):
    return SupervisionNoteService.get_all_supervision_notes(db)

@router.post("/", response_model=SupervisionNoteResponse)
def create_supervision(note: SupervisionNoteCreate, db: Session = Depends(get_db)):
    return SupervisionNoteService.create_supervision_note(db, note)

@router.put("/{note_id}", response_model=SupervisionNoteResponse)
def update_supervision(note_id: int, update: SupervisionNoteUpdate, db: Session = Depends(get_db)):
    note = SupervisionNoteService.update_supervision_note(db, note_id, update)
    if not note:
        raise HTTPException(status_code=404, detail="Supervision note not found")
    return note

@router.delete("/{note_id}")
def delete_supervision(note_id: int, db: Session = Depends(get_db)):
    success = SupervisionNoteService.delete_supervision_note(db, note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Supervision note not found")
    return {"message": "Supervision note deleted"}
