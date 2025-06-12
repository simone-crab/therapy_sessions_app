from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.config import get_db
from backend.services.report_service import ReportService
from typing import List, Dict
from datetime import date

router = APIRouter()

@router.get("/client-time", response_model=List[Dict])
def client_time_report(start_date: date, end_date: date, db: Session = Depends(get_db)):
    return ReportService.get_client_time_report(db, start_date, end_date)

@router.get("/supervision-time", response_model=Dict)
def supervision_time_report(start_date: date, end_date: date, db: Session = Depends(get_db)):
    return ReportService.get_supervision_time_report(db, start_date, end_date)
