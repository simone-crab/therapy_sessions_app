from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case, extract
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
            
            # Aggregate supervision notes by month with total duration
            monthly_data = db.query(
                extract('year', SupervisionNote.supervision_date).label('year'),
                extract('month', SupervisionNote.supervision_date).label('month'),
                func.sum(SupervisionNote.duration_minutes).label('total_minutes'),
                func.count(SupervisionNote.id).label('session_count')
            ).filter(and_(
                SupervisionNote.supervision_date >= start_date,
                SupervisionNote.supervision_date <= end_date
            )).group_by(
                extract('year', SupervisionNote.supervision_date),
                extract('month', SupervisionNote.supervision_date)
            ).all()
            
            # Create a dictionary of month -> data
            monthly_dict = {}
            for row in monthly_data:
                month_key = f"{int(row.year)}-{int(row.month):02d}"
                monthly_dict[month_key] = {
                    "year": int(row.year),
                    "month": int(row.month),
                    "total_hours": (row.total_minutes or 0) / 60.0,
                    "session_count": row.session_count or 0
                }
            
            # Generate all months in the date range
            all_months = []
            current = start_date.replace(day=1)
            end_month = end_date.replace(day=1)
            
            while current <= end_month:
                month_key = f"{current.year}-{current.month:02d}"
                month_name = current.strftime("%B %Y")
                
                if month_key in monthly_dict:
                    all_months.append({
                        "month_key": month_key,
                        "month_name": month_name,
                        "total_hours": monthly_dict[month_key]["total_hours"],
                        "session_count": monthly_dict[month_key]["session_count"]
                    })
                else:
                    all_months.append({
                        "month_key": month_key,
                        "month_name": month_name,
                        "total_hours": 0.0,
                        "session_count": 0
                    })
                
                # Move to next month
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)
            
            # Get all supervision notes for the table
            supervision_notes = db.query(SupervisionNote)\
                                .filter(and_(
                                    SupervisionNote.supervision_date >= start_date,
                                    SupervisionNote.supervision_date <= end_date
                                )).all()
            
            total_minutes = sum(n.duration_minutes for n in supervision_notes)
            
            logger.info(f"Found {len(supervision_notes)} supervision notes in the date range, {len(all_months)} months")
            
            return {
                "total_sessions": len(supervision_notes),
                "total_hours": total_minutes / 60.0,
                "monthly_data": all_months,
                "notes": [
                    {
                        "id": n.id,
                        "date": n.supervision_date,
                        "content_preview": n.content[:100] + "..." if n.content and len(n.content) > 100 else (n.content or ""),
                        "content": n.content or ""
                    }
                    for n in supervision_notes
                ]
            }
        except Exception as e:
            logger.error(f"Error in get_supervision_time_report: {str(e)}", exc_info=True)
            raise

    @staticmethod
    def get_session_notes_report(db: Session, start_date: date, end_date: date) -> Dict:
        try:
            logger.info(f"Querying session notes report from {start_date} to {end_date}")
            
            # Aggregate session notes by month with total duration
            session_monthly_data = db.query(
                extract('year', SessionNote.session_date).label('year'),
                extract('month', SessionNote.session_date).label('month'),
                func.sum(SessionNote.duration_minutes).label('total_minutes'),
                func.count(SessionNote.id).label('session_count')
            ).filter(and_(
                SessionNote.session_date >= start_date,
                SessionNote.session_date <= end_date
            )).group_by(
                extract('year', SessionNote.session_date),
                extract('month', SessionNote.session_date)
            ).all()
            
            # Aggregate assessment notes by month with total duration
            assessment_monthly_data = db.query(
                extract('year', AssessmentNote.assessment_date).label('year'),
                extract('month', AssessmentNote.assessment_date).label('month'),
                func.sum(AssessmentNote.duration_minutes).label('total_minutes'),
                func.count(AssessmentNote.id).label('session_count')
            ).filter(and_(
                AssessmentNote.assessment_date >= start_date,
                AssessmentNote.assessment_date <= end_date
            )).group_by(
                extract('year', AssessmentNote.assessment_date),
                extract('month', AssessmentNote.assessment_date)
            ).all()
            
            # Combine monthly data
            monthly_dict = {}
            
            # Add session notes
            for row in session_monthly_data:
                month_key = f"{int(row.year)}-{int(row.month):02d}"
                if month_key not in monthly_dict:
                    monthly_dict[month_key] = {
                        "year": int(row.year),
                        "month": int(row.month),
                        "session_minutes": 0,
                        "assessment_minutes": 0,
                        "session_count": 0,
                        "assessment_count": 0
                    }
                monthly_dict[month_key]["session_minutes"] = row.total_minutes or 0
                monthly_dict[month_key]["session_count"] = row.session_count or 0
            
            # Add assessment notes
            for row in assessment_monthly_data:
                month_key = f"{int(row.year)}-{int(row.month):02d}"
                if month_key not in monthly_dict:
                    monthly_dict[month_key] = {
                        "year": int(row.year),
                        "month": int(row.month),
                        "session_minutes": 0,
                        "assessment_minutes": 0,
                        "session_count": 0,
                        "assessment_count": 0
                    }
                monthly_dict[month_key]["assessment_minutes"] = row.total_minutes or 0
                monthly_dict[month_key]["assessment_count"] = row.session_count or 0
            
            # Generate all months in the date range
            all_months = []
            current = start_date.replace(day=1)
            end_month = end_date.replace(day=1)
            
            while current <= end_month:
                month_key = f"{current.year}-{current.month:02d}"
                month_name = current.strftime("%B %Y")
                
                if month_key in monthly_dict:
                    data = monthly_dict[month_key]
                    all_months.append({
                        "month_key": month_key,
                        "month_name": month_name,
                        "session_hours": data["session_minutes"] / 60.0,
                        "assessment_hours": data["assessment_minutes"] / 60.0,
                        "total_hours": (data["session_minutes"] + data["assessment_minutes"]) / 60.0,
                        "session_count": data["session_count"],
                        "assessment_count": data["assessment_count"]
                    })
                else:
                    all_months.append({
                        "month_key": month_key,
                        "month_name": month_name,
                        "session_hours": 0.0,
                        "assessment_hours": 0.0,
                        "total_hours": 0.0,
                        "session_count": 0,
                        "assessment_count": 0
                    })
                
                # Move to next month
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)
            
            # Get all session notes for the table
            session_notes = db.query(SessionNote)\
                            .filter(and_(
                                SessionNote.session_date >= start_date,
                                SessionNote.session_date <= end_date
                            )).all()
            
            # Get all assessment notes for the table
            assessment_notes = db.query(AssessmentNote)\
                              .filter(and_(
                                  AssessmentNote.assessment_date >= start_date,
                                  AssessmentNote.assessment_date <= end_date
                              )).all()
            
            # Combine and sort notes by date
            all_notes = []
            
            # Add session notes
            for note in session_notes:
                all_notes.append({
                    "id": note.id,
                    "date": note.session_date,
                    "type": "Session",
                    "content_preview": note.content[:100] + "..." if note.content and len(note.content) > 100 else (note.content or ""),
                    "content": note.content or ""
                })
            
            # Add assessment notes
            for note in assessment_notes:
                all_notes.append({
                    "id": note.id,
                    "date": note.assessment_date,
                    "type": "Assessment",
                    "content_preview": note.content[:100] + "..." if note.content and len(note.content) > 100 else (note.content or ""),
                    "content": note.content or ""
                })
            
            # Sort by date
            all_notes.sort(key=lambda x: x["date"])
            
            total_minutes = sum(n.duration_minutes for n in session_notes) + sum(n.duration_minutes for n in assessment_notes)
            
            logger.info(f"Found {len(session_notes)} session notes and {len(assessment_notes)} assessment notes, {len(all_months)} months")
            
            return {
                "total_sessions": len(session_notes) + len(assessment_notes),
                "total_hours": total_minutes / 60.0,
                "monthly_data": all_months,
                "notes": all_notes
            }
        except Exception as e:
            logger.error(f"Error in get_session_notes_report: {str(e)}", exc_info=True)
            raise
