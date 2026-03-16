from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.config import get_db
from backend.schemas.calendar import (
    AppointmentCreate,
    AppointmentUpdate,
    OccurrenceCancelRequest,
    OccurrenceMoveRequest,
)
from backend.services.calendar_service import CalendarService

router = APIRouter()


@router.get("/events")
def get_events(
    start: datetime = Query(...),
    end: datetime = Query(...),
    db: Session = Depends(get_db),
):
    try:
        return CalendarService.get_events(db, start, end)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/today-sessions")
def get_today_sessions(db: Session = Depends(get_db)):
    try:
        return CalendarService.get_today_sessions(db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/appointments")
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    try:
        appointment = CalendarService.create_appointment(db, payload)
        return {"id": appointment.id}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/appointments/{appointment_id}")
def update_appointment(appointment_id: int, payload: AppointmentUpdate, db: Session = Depends(get_db)):
    try:
        appointment = CalendarService.update_appointment(db, appointment_id, payload)
        return {"id": appointment.id}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/occurrences/{appointment_id}/cancel")
def cancel_occurrence(appointment_id: int, payload: OccurrenceCancelRequest, db: Session = Depends(get_db)):
    try:
        exception = CalendarService.cancel_occurrence(db, appointment_id, payload.occurrence_start_datetime)
        return {"id": exception.id}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/occurrences/{appointment_id}/move")
def move_occurrence(appointment_id: int, payload: OccurrenceMoveRequest, db: Session = Depends(get_db)):
    try:
        exception = CalendarService.move_occurrence(db, appointment_id, payload)
        return {"id": exception.id}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/occurrences/{appointment_id}")
def delete_occurrence(
    appointment_id: int,
    scope: str = Query(..., pattern="^(this|future|all)$"),
    occurrence_start_datetime: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    try:
        appointment = CalendarService.delete_occurrence(db, appointment_id, scope, occurrence_start_datetime)
        return {"id": appointment.id}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
