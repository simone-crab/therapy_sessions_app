from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.config import get_db
from backend.services.assessment_note_service import AssessmentNoteService
from backend.schemas.assessment_note import AssessmentNoteCreate, AssessmentNoteUpdate, AssessmentNoteResponse
from typing import List

router = APIRouter()

@router.get("/client/{client_id}", response_model=List[AssessmentNoteResponse])
def get_assessments(client_id: int, db: Session = Depends(get_db)):
    return AssessmentNoteService.get_client_assessments(db, client_id)

@router.get("/{assessment_id}", response_model=AssessmentNoteResponse)
def get_assessment(assessment_id: int, db: Session = Depends(get_db)):
    note = AssessmentNoteService.get_assessment_by_id(db, assessment_id)
    if not note:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return note

@router.post("/", response_model=AssessmentNoteResponse)
def create_assessment(note: AssessmentNoteCreate, db: Session = Depends(get_db)):
    return AssessmentNoteService.create_assessment(db, note)

@router.put("/{assessment_id}", response_model=AssessmentNoteResponse)
def update_assessment(assessment_id: int, update: AssessmentNoteUpdate, db: Session = Depends(get_db)):
    note = AssessmentNoteService.update_assessment(db, assessment_id, update)
    if not note:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return note

@router.delete("/{assessment_id}")
def delete_assessment(assessment_id: int, db: Session = Depends(get_db)):
    success = AssessmentNoteService.delete_assessment(db, assessment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {"message": "Assessment deleted"}
