from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.config import get_db
from backend.services.report_service import ReportService
from typing import List, Dict
from datetime import date
from sqlalchemy import func
from backend.models.client import Client, ClientStatus
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/client-time", response_model=List[Dict])
def client_time_report(start_date: date, end_date: date, db: Session = Depends(get_db)):
    try:
        logger.info(f"Generating client time report for period {start_date} to {end_date}")
        result = ReportService.get_client_time_report(db, start_date, end_date)
        logger.info(f"Successfully generated client time report with {len(result)} clients")
        return result
    except Exception as e:
        logger.error(f"Error generating client time report: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating client time report: {str(e)}")

@router.get("/supervision-time", response_model=Dict)
def supervision_time_report(start_date: date, end_date: date, db: Session = Depends(get_db)):
    try:
        logger.info(f"Generating supervision time report for period {start_date} to {end_date}")
        result = ReportService.get_supervision_time_report(db, start_date, end_date)
        logger.info(f"Successfully generated supervision time report with {result['total_sessions']} sessions")
        return result
    except Exception as e:
        logger.error(f"Error generating supervision time report: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating supervision time report: {str(e)}")

@router.get("/session-notes", response_model=Dict)
def session_notes_report(start_date: date, end_date: date, db: Session = Depends(get_db)):
    try:
        logger.info(f"Generating session notes report for period {start_date} to {end_date}")
        result = ReportService.get_session_notes_report(db, start_date, end_date)
        logger.info(f"Successfully generated session notes report with {result['total_sessions']} notes")
        return result
    except Exception as e:
        logger.error(f"Error generating session notes report: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating session notes report: {str(e)}")

@router.get("/totals")
def get_totals(filter: str = "active", db: Session = Depends(get_db)):
    try:
        from backend.models.session_note import SessionNote
        from backend.models.assessment_note import AssessmentNote
        from backend.models.supervision_note import SupervisionNote

        logger.info(f"Calculating totals with filter: {filter}")

        # Base queries for session and assessment notes (time)
        session_time_query = db.query(func.sum(SessionNote.duration_minutes))
        assessment_time_query = db.query(func.sum(AssessmentNote.duration_minutes))
        supervision_time_query = db.query(func.sum(SupervisionNote.duration_minutes))
        
        # Base queries for counts
        session_count_query = db.query(func.count(SessionNote.id))
        assessment_count_query = db.query(func.count(AssessmentNote.id))
        supervision_count_query = db.query(func.count(SupervisionNote.id))

        # Apply client filter if needed
        if filter == "active":
            session_time_query = session_time_query.join(Client).filter(Client.status == ClientStatus.ACTIVE)
            assessment_time_query = assessment_time_query.join(Client).filter(Client.status == ClientStatus.ACTIVE)
            supervision_time_query = supervision_time_query.join(Client).filter(Client.status == ClientStatus.ACTIVE)
            session_count_query = session_count_query.join(Client).filter(Client.status == ClientStatus.ACTIVE)
            assessment_count_query = assessment_count_query.join(Client).filter(Client.status == ClientStatus.ACTIVE)
            supervision_count_query = supervision_count_query.join(Client).filter(Client.status == ClientStatus.ACTIVE)
        elif filter == "archived":
            session_time_query = session_time_query.join(Client).filter(Client.status == ClientStatus.ARCHIVED)
            assessment_time_query = assessment_time_query.join(Client).filter(Client.status == ClientStatus.ARCHIVED)
            supervision_time_query = supervision_time_query.join(Client).filter(Client.status == ClientStatus.ARCHIVED)
            session_count_query = session_count_query.join(Client).filter(Client.status == ClientStatus.ARCHIVED)
            assessment_count_query = assessment_count_query.join(Client).filter(Client.status == ClientStatus.ARCHIVED)
            supervision_count_query = supervision_count_query.join(Client).filter(Client.status == ClientStatus.ARCHIVED)
        # For "all" filter, we don't apply any status filter

        # Execute queries and combine session + assessment notes
        session_total = (session_time_query.scalar() or 0) + (assessment_time_query.scalar() or 0)
        supervision_total = supervision_time_query.scalar() or 0
        session_count = (session_count_query.scalar() or 0) + (assessment_count_query.scalar() or 0)
        supervision_count = supervision_count_query.scalar() or 0

        logger.info(f"Calculated totals - Session: {session_total} minutes ({session_count} sessions), Supervision: {supervision_total} minutes ({supervision_count} sessions)")

        return {
            "total_session_minutes": session_total,
            "total_supervision_minutes": supervision_total,
            "total_session_count": session_count,
            "total_supervision_count": supervision_count
        }
    except Exception as e:
        logger.error(f"Error calculating totals: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calculating totals: {str(e)}")

@router.get("/client/{client_id}/totals")
def get_client_totals(client_id: int, db: Session = Depends(get_db)):
    try:
        from backend.models.session_note import SessionNote
        from backend.models.assessment_note import AssessmentNote
        from backend.models.supervision_note import SupervisionNote

        logger.info(f"Calculating totals for client {client_id}")

        # Query for session notes time (includes assessment notes)
        session_total = (
            db.query(func.sum(SessionNote.duration_minutes))
            .filter(SessionNote.client_id == client_id)
            .scalar() or 0
        ) + (
            db.query(func.sum(AssessmentNote.duration_minutes))
            .filter(AssessmentNote.client_id == client_id)
            .scalar() or 0
        )

        # Query for supervision notes time
        supervision_total = db.query(func.sum(SupervisionNote.duration_minutes))\
            .filter(SupervisionNote.client_id == client_id)\
            .scalar() or 0
        
        # Query for counts
        session_count = (
            db.query(func.count(SessionNote.id))
            .filter(SessionNote.client_id == client_id)
            .scalar() or 0
        ) + (
            db.query(func.count(AssessmentNote.id))
            .filter(AssessmentNote.client_id == client_id)
            .scalar() or 0
        )
        
        supervision_count = db.query(func.count(SupervisionNote.id))\
            .filter(SupervisionNote.client_id == client_id)\
            .scalar() or 0

        logger.info(f"Calculated totals for client {client_id} - Session: {session_total} minutes ({session_count} sessions), Supervision: {supervision_total} minutes ({supervision_count} sessions)")

        return {
            "session_total": session_total,
            "supervision_total": supervision_total,
            "session_count": session_count,
            "supervision_count": supervision_count
        }
    except Exception as e:
        logger.error(f"Error calculating client totals: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calculating client totals: {str(e)}")

