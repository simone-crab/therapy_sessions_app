from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from backend.models.session_note import SessionNote
from backend.models.assessment_note import AssessmentNote
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

            # Get session notes aggregated by client
            session_results = db.query(
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
             .all()
            
            # Get assessment notes aggregated by client
            assessment_results = db.query(
                Client.id,
                func.coalesce(func.sum(AssessmentNote.duration_minutes), 0).label("total_minutes"),
                func.coalesce(func.count(AssessmentNote.id), 0).label("session_count"),
                func.coalesce(func.sum(case((AssessmentNote.is_paid == True, 1), else_=0)), 0).label("paid_sessions"),
                func.coalesce(func.sum(case((AssessmentNote.is_paid == False, 1), else_=0)), 0).label("unpaid_sessions")
            ).outerjoin(AssessmentNote, and_(
                AssessmentNote.client_id == Client.id,
                AssessmentNote.assessment_date >= start_date,
                AssessmentNote.assessment_date <= end_date
            ))\
             .group_by(Client.id)\
             .all()
            
            # Combine results by client
            session_dict = {r.id: r for r in session_results}
            assessment_dict = {r.id: r for r in assessment_results}
            
            # Get all unique client IDs
            all_client_ids = set(session_dict.keys()) | set(assessment_dict.keys())
            
            # Build combined results
            results = []
            for client_id in all_client_ids:
                session = session_dict.get(client_id)
                assessment = assessment_dict.get(client_id)
                
                if session:
                    first_name = session.first_name
                    last_name = session.last_name
                    total_minutes = (session.total_minutes or 0) + (assessment.total_minutes if assessment else 0)
                    session_count = (session.session_count or 0) + (assessment.session_count if assessment else 0)
                    paid_sessions = (session.paid_sessions or 0) + (assessment.paid_sessions if assessment else 0)
                    unpaid_sessions = (session.unpaid_sessions or 0) + (assessment.unpaid_sessions if assessment else 0)
                else:
                    # Only assessment notes for this client - need to get client info
                    assessment = assessment_dict[client_id]
                    client = db.query(Client).filter(Client.id == client_id).first()
                    if not client:
                        continue  # Skip if client doesn't exist
                    first_name = client.first_name
                    last_name = client.last_name
                    total_minutes = assessment.total_minutes or 0
                    session_count = assessment.session_count or 0
                    paid_sessions = assessment.paid_sessions or 0
                    unpaid_sessions = assessment.unpaid_sessions or 0
                
                results.append({
                    'id': client_id,
                    'first_name': first_name,
                    'last_name': last_name,
                    'total_minutes': total_minutes,
                    'session_count': session_count,
                    'paid_sessions': paid_sessions,
                    'unpaid_sessions': unpaid_sessions
                })
            
            # Sort by name
            results.sort(key=lambda x: (x['first_name'], x['last_name']))

            logger.info(f"Found {len(results)} clients in the date range")

            return [
                {
                    "client_id": r['id'],
                    "client_name": f"{r['first_name']} {r['last_name']}",
                    "total_hours": (r['total_minutes'] or 0) / 60,
                    "session_count": r['session_count'] or 0,
                    "paid_sessions": r['paid_sessions'] or 0,
                    "unpaid_sessions": r['unpaid_sessions'] or 0
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
