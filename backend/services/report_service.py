from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from backend.models.session_note import SessionNote
from backend.models.supervision_note import SupervisionNote
from backend.models.client import Client
from typing import List, Dict
from datetime import date

class ReportService:

    @staticmethod
    def get_client_time_report(db: Session, start_date: date, end_date: date) -> List[Dict]:
        results = db.query(
            Client.id,
            Client.first_name,
            Client.last_name,
            func.sum(SessionNote.duration_minutes).label("total_minutes"),
            func.count(SessionNote.id).label("session_count"),
            func.sum(func.case((SessionNote.is_paid == True, 1), else_=0)).label("paid_sessions"),
            func.sum(func.case((SessionNote.is_paid == False, 1), else_=0)).label("unpaid_sessions")
        ).join(SessionNote)\
         .filter(and_(
             SessionNote.session_date >= start_date,
             SessionNote.session_date <= end_date
         ))\
         .group_by(Client.id)\
         .order_by(Client.first_name, Client.last_name)\
         .all()

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

    @staticmethod
    def get_supervision_time_report(db: Session, start_date: date, end_date: date) -> Dict:
        supervision_notes = db.query(SupervisionNote)\
                              .filter(and_(
                                  SupervisionNote.supervision_date >= start_date,
                                  SupervisionNote.supervision_date <= end_date
                              )).all()
        return {
            "total_sessions": len(supervision_notes),
            "total_days": len({n.supervision_date for n in supervision_notes}),
            "notes": [
                {"id": n.id, "date": n.supervision_date, "content_preview": n.content[:100] + "..."}
                for n in supervision_notes
            ]
        }
