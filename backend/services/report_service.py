from sqlalchemy.orm import Session
from sqlalchemy import func, and_, outerjoin, case
from backend.models.session_note import SessionNote
from backend.models.supervision_note import SupervisionNote
from backend.models.client import Client
from typing import List, Dict
from datetime import date
import logging

logger = logging.getLogger(__name__)

class ReportService:

    @staticmethod
    def get_client_time_report(db: Session, start_date: date, end_date: date) -> List[Dict]:
        try:
            logger.info(f"Querying client time report from {start_date} to {end_date}")
            
            # First check if we have any clients
            client_count = db.query(Client).count()
            logger.info(f"Found {client_count} total clients in database")
            
            if client_count == 0:
                return []

            # Use outerjoin to include clients even if they have no sessions
            results = db.query(
                Client.id,
                Client.first_name,
                Client.last_name,
                func.coalesce(func.sum(SessionNote.duration_minutes), 0).label("total_minutes"),
                func.coalesce(func.count(SessionNote.id), 0).label("session_count"),
                func.coalesce(func.sum(case((SessionNote.is_paid == True, 1), else_=0)), 0).label("paid_sessions"),
                func.coalesce(func.sum(case((SessionNote.is_paid == False, 1), else_=0)), 0).label("unpaid_sessions")
            ).outerjoin(SessionNote, and_(
                SessionNote.client_id == Client.id,
                SessionNote.session_date >= start_date,
                SessionNote.session_date <= end_date
            ))\
             .group_by(Client.id)\
             .order_by(Client.first_name, Client.last_name)\
             .all()

            logger.info(f"Found {len(results)} clients in the date range")

            return [
                {
                    "client_id": r.id,
                    "client_name": f"{r.first_name} {r.last_name}",
                    "total_hours": (r.total_minutes or 0) / 60,
                    "session_count": r.session_count or 0,
                    "paid_sessions": r.paid_sessions or 0,
                    "unpaid_sessions": r.unpaid_sessions or 0
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error in get_client_time_report: {str(e)}", exc_info=True)
            raise

    @staticmethod
    def get_supervision_time_report(db: Session, start_date: date, end_date: date) -> Dict:
        try:
            logger.info(f"Querying supervision time report from {start_date} to {end_date}")
            
            supervision_notes = db.query(SupervisionNote)\
                                .filter(and_(
                                    SupervisionNote.supervision_date >= start_date,
                                    SupervisionNote.supervision_date <= end_date
                                )).all()
            
            logger.info(f"Found {len(supervision_notes)} supervision notes in the date range")
            
            return {
                "total_sessions": len(supervision_notes),
                "total_days": len({n.supervision_date for n in supervision_notes}),
                "notes": [
                    {"id": n.id, "date": n.supervision_date, "content_preview": n.content[:100] + "..." if n.content else ""}
                    for n in supervision_notes
                ]
            }
        except Exception as e:
            logger.error(f"Error in get_supervision_time_report: {str(e)}", exc_info=True)
            raise
