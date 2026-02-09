from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from backend.config import get_db
from backend.services.cpd_note_service import CPDNoteService
from backend.schemas.cpd_note import CPDNoteCreate, CPDNoteUpdate, CPDNoteResponse
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=List[CPDNoteResponse])
def get_cpd_notes(db: Session = Depends(get_db)):
    return CPDNoteService.get_all_cpd_notes(db)

@router.post("/", response_model=CPDNoteResponse)
def create_cpd_note(note: CPDNoteCreate, db: Session = Depends(get_db)):
    try:
        return CPDNoteService.create_cpd_note(db, note)
    except OperationalError as e:
        logger.exception("CPD note create DB error")
        raise HTTPException(
            status_code=500,
            detail=f"Database error. If you have existing CPD data, run the migration: python3 migrate_database.py from the project root. Error: {str(e)}",
        )
    except Exception as e:
        logger.exception("CPD note create error")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{note_id}", response_model=CPDNoteResponse)
def update_cpd_note(note_id: int, update: CPDNoteUpdate, db: Session = Depends(get_db)):
    note = CPDNoteService.update_cpd_note(db, note_id, update)
    if not note:
        raise HTTPException(status_code=404, detail="CPD note not found")
    return note

@router.delete("/{note_id}")
def delete_cpd_note(note_id: int, db: Session = Depends(get_db)):
    success = CPDNoteService.delete_cpd_note(db, note_id)
    if not success:
        raise HTTPException(status_code=404, detail="CPD note not found")
    return {"message": "CPD note deleted"}

