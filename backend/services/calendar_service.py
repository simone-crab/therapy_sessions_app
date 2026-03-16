from datetime import datetime, timedelta
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from backend.models.appointment import Appointment
from backend.models.appointment_exception import AppointmentException
from backend.models.client import Client, ClientStatus
from backend.schemas.calendar import AppointmentCreate, AppointmentUpdate, OccurrenceMoveRequest


class CalendarService:
    ACTIVE_APPOINTMENT_ERROR = "This client already has an active booked slot. Edit the existing appointment instead."
    ALLOWED_EXCEPTION_ACTIONS = {"CANCELLED", "MOVED"}

    @staticmethod
    def _validate_client_active(db: Session, client_id: int) -> Client:
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise ValueError("Client not found.")
        if client.status != ClientStatus.ACTIVE:
            raise ValueError("Appointments can only be created for active clients.")
        return client

    @staticmethod
    def _ensure_client_has_no_other_active_appointment(db: Session, client_id: int, excluding_appointment_id: Optional[int] = None):
        query = db.query(Appointment).filter(
            Appointment.client_id == client_id,
            Appointment.is_active.is_(True),
        )
        if excluding_appointment_id is not None:
            query = query.filter(Appointment.id != excluding_appointment_id)
        if query.first():
            raise ValueError(CalendarService.ACTIVE_APPOINTMENT_ERROR)

    @staticmethod
    def _validate_time_range(start_datetime: datetime, end_datetime: datetime):
        if end_datetime <= start_datetime:
            raise ValueError("End time must be after start time.")

    @staticmethod
    def _parse_recurrence_rule(recurrence_rule: Optional[str]) -> Optional[Dict[str, str]]:
        if not recurrence_rule:
            return None
        parts = {}
        for item in recurrence_rule.split(";"):
          if not item:
              continue
          if "=" not in item:
              continue
          key, value = item.split("=", 1)
          parts[key.upper()] = value.upper()
        return parts or None

    @staticmethod
    def _build_default_weekly_rule(start_datetime: datetime) -> str:
        weekday_map = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]
        return f"FREQ=WEEKLY;INTERVAL=1;BYDAY={weekday_map[start_datetime.weekday()]}"

    @staticmethod
    def _expand_occurrences_for_appointment(appointment: Appointment, range_start: datetime, range_end: datetime) -> List[Dict]:
        occurrences = []
        base_duration = appointment.end_datetime - appointment.start_datetime
        recurrence = CalendarService._parse_recurrence_rule(appointment.recurrence_rule)

        if not recurrence:
            if appointment.start_datetime < range_end and appointment.end_datetime > range_start:
                occurrences.append({
                    "start": appointment.start_datetime,
                    "end": appointment.end_datetime,
                    "original_start": appointment.start_datetime,
                    "is_exception": False,
                })
            return occurrences

        if recurrence.get("FREQ") != "WEEKLY":
            return occurrences

        interval = int(recurrence.get("INTERVAL", "1"))
        if interval < 1:
            interval = 1

        current_start = appointment.start_datetime
        recurrence_until = appointment.recurrence_until

        while current_start < range_end:
            current_end = current_start + base_duration
            if recurrence_until and current_start > recurrence_until:
                break
            if current_end > range_start and current_start < range_end:
                occurrences.append({
                    "start": current_start,
                    "end": current_end,
                    "original_start": current_start,
                    "is_exception": False,
                })
            current_start = current_start + timedelta(weeks=interval)

        return occurrences

    @staticmethod
    def _apply_exceptions(appointment: Appointment, occurrences: List[Dict]) -> List[Dict]:
        exception_map = {
            exc.occurrence_start_datetime: exc
            for exc in appointment.exceptions
        }
        result = []
        for occurrence in occurrences:
            exception = exception_map.get(occurrence["original_start"])
            if not exception:
                result.append({
                    **occurrence,
                    "status": "ACTIVE",
                    "is_exception": occurrence["is_exception"],
                })
                continue

            if exception.action == "CANCELLED":
                result.append({
                    **occurrence,
                    "status": "CANCELLED",
                    "is_exception": True,
                })
                continue

            if exception.action == "MOVED" and exception.new_start_datetime and exception.new_end_datetime:
                result.append({
                    **occurrence,
                    "start": exception.new_start_datetime,
                    "end": exception.new_end_datetime,
                    "status": "ACTIVE",
                    "is_exception": True,
                })
                continue

            result.append({
                **occurrence,
                "status": "ACTIVE",
                "is_exception": occurrence["is_exception"],
            })
        return result

    @staticmethod
    def get_events(db: Session, range_start: datetime, range_end: datetime) -> List[Dict]:
        appointments = db.query(Appointment).filter(Appointment.is_active.is_(True)).all()
        events = []

        for appointment in appointments:
            client_name = appointment.title or appointment.client.full_name
            occurrences = CalendarService._expand_occurrences_for_appointment(appointment, range_start, range_end)
            for occurrence in CalendarService._apply_exceptions(appointment, occurrences):
                occurrence_id = f"{appointment.id}:{occurrence['original_start'].isoformat()}"
                events.append({
                    "occurrence_id": occurrence_id,
                    "appointment_id": appointment.id,
                    "client_id": appointment.client_id,
                    "client_name": client_name,
                    "start": occurrence["start"].isoformat(),
                    "end": occurrence["end"].isoformat(),
                    "status": occurrence["status"],
                    "is_exception": occurrence["is_exception"],
                })

        events.sort(key=lambda item: item["start"])
        return events

    @staticmethod
    def get_today_sessions(db: Session, reference_time: Optional[datetime] = None) -> List[Dict]:
        now = reference_time or datetime.now()
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        events = CalendarService.get_events(db, day_start, day_end)
        sessions = []

        for event in events:
            if event.get("status") == "CANCELLED":
                continue

            event_start = datetime.fromisoformat(event["start"])
            event_end = datetime.fromisoformat(event["end"])
            if now < event_start:
                status = "UPCOMING"
            elif now < event_end:
                status = "IN_PROGRESS"
            else:
                status = "COMPLETED"

            sessions.append({
                **event,
                "status": status,
            })

        sessions.sort(key=lambda item: item["start"])
        return sessions

    @staticmethod
    def create_appointment(db: Session, payload: AppointmentCreate) -> Appointment:
        CalendarService._validate_time_range(payload.start_datetime, payload.end_datetime)
        client = CalendarService._validate_client_active(db, payload.client_id)
        CalendarService._ensure_client_has_no_other_active_appointment(db, payload.client_id)

        recurrence_rule = payload.recurrence_rule
        if recurrence_rule == "WEEKLY":
            recurrence_rule = CalendarService._build_default_weekly_rule(payload.start_datetime)

        appointment = Appointment(
            client_id=payload.client_id,
            title=(payload.title or client.full_name).strip() or client.full_name,
            start_datetime=payload.start_datetime,
            end_datetime=payload.end_datetime,
            timezone=payload.timezone or "Europe/London",
            recurrence_rule=recurrence_rule,
            recurrence_until=payload.recurrence_until,
            is_active=True,
        )
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        return appointment

    @staticmethod
    def update_appointment(db: Session, appointment_id: int, payload: AppointmentUpdate) -> Appointment:
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise ValueError("Appointment not found.")

        start_datetime = payload.start_datetime or appointment.start_datetime
        end_datetime = payload.end_datetime or appointment.end_datetime
        CalendarService._validate_time_range(start_datetime, end_datetime)
        CalendarService._ensure_client_has_no_other_active_appointment(db, appointment.client_id, excluding_appointment_id=appointment.id)

        update_data = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)
        if update_data.get("recurrence_rule") == "WEEKLY":
            update_data["recurrence_rule"] = CalendarService._build_default_weekly_rule(start_datetime)

        for field, value in update_data.items():
            setattr(appointment, field, value)

        db.commit()
        db.refresh(appointment)
        return appointment

    @staticmethod
    def cancel_occurrence(db: Session, appointment_id: int, occurrence_start_datetime: datetime) -> AppointmentException:
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.is_active.is_(True)).first()
        if not appointment:
            raise ValueError("Appointment not found.")

        exception = db.query(AppointmentException).filter(
            AppointmentException.appointment_id == appointment_id,
            AppointmentException.occurrence_start_datetime == occurrence_start_datetime,
        ).first()
        if not exception:
            exception = AppointmentException(
                appointment_id=appointment_id,
                occurrence_start_datetime=occurrence_start_datetime,
                action="CANCELLED",
            )
            db.add(exception)
        else:
            exception.action = "CANCELLED"
            exception.new_start_datetime = None
            exception.new_end_datetime = None

        db.commit()
        db.refresh(exception)
        return exception

    @staticmethod
    def move_occurrence(db: Session, appointment_id: int, payload: OccurrenceMoveRequest) -> AppointmentException:
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.is_active.is_(True)).first()
        if not appointment:
            raise ValueError("Appointment not found.")
        CalendarService._validate_time_range(payload.new_start_datetime, payload.new_end_datetime)

        exception = db.query(AppointmentException).filter(
            AppointmentException.appointment_id == appointment_id,
            AppointmentException.occurrence_start_datetime == payload.occurrence_start_datetime,
        ).first()
        if not exception:
            exception = AppointmentException(
                appointment_id=appointment_id,
                occurrence_start_datetime=payload.occurrence_start_datetime,
                action="MOVED",
            )
            db.add(exception)

        exception.action = "MOVED"
        exception.new_start_datetime = payload.new_start_datetime
        exception.new_end_datetime = payload.new_end_datetime

        db.commit()
        db.refresh(exception)
        return exception

    @staticmethod
    def delete_occurrence(db: Session, appointment_id: int, scope: str, occurrence_start_datetime: Optional[datetime] = None) -> Appointment:
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise ValueError("Appointment not found.")

        if scope == "all":
            appointment.is_active = False
            db.commit()
            db.refresh(appointment)
            return appointment

        if scope == "future":
            if not appointment.recurrence_rule:
                appointment.is_active = False
                db.commit()
                db.refresh(appointment)
                return appointment
            if occurrence_start_datetime is None:
                raise ValueError("occurrence_start_datetime is required for future scope.")
            appointment.recurrence_until = occurrence_start_datetime - timedelta(seconds=1)
            db.commit()
            db.refresh(appointment)
            return appointment

        if scope == "this":
            if not appointment.recurrence_rule:
                appointment.is_active = False
                db.commit()
                db.refresh(appointment)
                return appointment
            if occurrence_start_datetime is None:
                raise ValueError("occurrence_start_datetime is required for this scope.")
            CalendarService.cancel_occurrence(db, appointment_id, occurrence_start_datetime)
            db.refresh(appointment)
            return appointment

        raise ValueError("Invalid delete scope.")
