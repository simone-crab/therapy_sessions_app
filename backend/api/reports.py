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

@router.get("/totals")
def get_totals(filter: str = "active", db: Session = Depends(get_db)):
    try:
        from backend.models.session_note import SessionNote
        from backend.models.supervision_note import SupervisionNote

        logger.info(f"Calculating totals with filter: {filter}")

        # Base query for session notes
        session_query = db.query(func.sum(SessionNote.duration_minutes))
        
        # Base query for supervision notes
        supervision_query = db.query(func.sum(SupervisionNote.duration_minutes))

        # Apply client filter for session notes
        if filter == "active":
            session_query = session_query.join(Client).filter(Client.status == ClientStatus.ACTIVE)
        elif filter == "archived":
            session_query = session_query.join(Client).filter(Client.status == ClientStatus.ARCHIVED)
        # For "all" filter, we don't apply any status filter, so it includes all sessions
        # including those from deleted clients (since the sessions still exist in the database)

        # Execute queries
        session_total = session_query.scalar() or 0
        supervision_total = supervision_query.scalar() or 0

        logger.info(f"Calculated totals - Session: {session_total} minutes, Supervision: {supervision_total} minutes")

        return {
            "total_session_minutes": session_total,
            "total_supervision_minutes": supervision_total
        }
    except Exception as e:
        logger.error(f"Error calculating totals: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calculating totals: {str(e)}")

@router.get("/client/{client_id}/totals")
def get_client_totals(client_id: int, db: Session = Depends(get_db)):
    try:
        from backend.models.session_note import SessionNote
        from backend.models.supervision_note import SupervisionNote

        logger.info(f"Calculating totals for client {client_id}")

        # Query for session notes
        session_total = db.query(func.sum(SessionNote.duration_minutes))\
            .filter(SessionNote.client_id == client_id)\
            .scalar() or 0

        # Query for supervision notes
        supervision_total = db.query(func.sum(SupervisionNote.duration_minutes))\
            .filter(SupervisionNote.client_id == client_id)\
            .scalar() or 0

        logger.info(f"Calculated totals for client {client_id} - Session: {session_total} minutes, Supervision: {supervision_total} minutes")

        return {
            "session_total": session_total,
            "supervision_total": supervision_total
        }
    except Exception as e:
        logger.error(f"Error calculating client totals: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calculating client totals: {str(e)}")

