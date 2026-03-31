import os
from datetime import datetime
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
from backend.models.client import Client  # noqa: F401
from backend.models.session_note import SessionNote  # noqa: F401
from backend.models.assessment_note import AssessmentNote  # noqa: F401
from backend.models.supervision_note import SupervisionNote  # noqa: F401
from backend.models.cpd_note import CPDNote  # noqa: F401
from backend.models.appointment import Appointment  # noqa: F401
from backend.models.appointment_exception import AppointmentException  # noqa: F401
from backend.models.therapist_detail import TherapistDetail  # noqa: F401
from backend.models.invoice import Invoice  # noqa: F401

# Get the user's home directory
HOME_DIR = os.path.expanduser("~")
# Create app data directory in the user's Library/Application Support
APP_DATA_DIR = os.path.join(HOME_DIR, "Library", "Application Support", "therapy-sessions-app")
# Ensure the directory exists
os.makedirs(APP_DATA_DIR, exist_ok=True)

# Database URL pointing to the user's app data directory
DATABASE_URL = f"sqlite:///{os.path.join(APP_DATA_DIR, 'therapy.db')}"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)
    _ensure_client_columns()
    _ensure_personal_notes_columns()
    _ensure_appointment_indexes()
    _deactivate_stale_appointments()
    _ensure_therapist_details_columns()
    _ensure_invoice_indexes()

def _ensure_client_columns():
    inspector = inspect(engine)
    if "clients" not in inspector.get_table_names():
        return

    with engine.begin() as conn:
        existing_columns = {col["name"] for col in inspector.get_columns("clients")}
        if "session_hourly_rate" not in existing_columns:
            conn.execute(
                text("ALTER TABLE clients ADD COLUMN session_hourly_rate VARCHAR(64) NOT NULL DEFAULT ''")
            )
        if "therapy_modality" not in existing_columns:
            conn.execute(
                text("ALTER TABLE clients ADD COLUMN therapy_modality VARCHAR(255)")
            )

def _ensure_personal_notes_columns():
    inspector = inspect(engine)
    text_column_specs = [
        ("session_notes", "personal_notes"),
        ("assessment_notes", "personal_notes"),
        ("supervision_notes", "personal_notes"),
    ]
    varchar_column_specs = [
        ("cpd_notes", "link_url", 2048),
        ("assessment_notes", "session_type", 20),
        ("supervision_notes", "session_type", 20),
        ("supervision_notes", "summary", 100),
        ("supervision_notes", "supervisor_details", 255),
    ]

    with engine.begin() as conn:
        for table_name, column_name in text_column_specs:
            existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
            if column_name not in existing_columns:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} TEXT"))
        for table_name, column_name, size in varchar_column_specs:
            existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
            if column_name not in existing_columns:
                default_value = "Online" if column_name == "session_type" else ""
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} VARCHAR({size}) NOT NULL DEFAULT '{default_value}'"))

def _ensure_appointment_indexes():
    with engine.begin() as conn:
        conn.execute(text("DROP INDEX IF EXISTS idx_appointments_active_client"))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_appointments_client_active "
            "ON appointments(client_id, is_active)"
        ))

def _deactivate_stale_appointments():
    now = datetime.now()
    db = SessionLocal()
    try:
        stale_updated = False
        active_appointments = db.query(Appointment).filter(Appointment.is_active.is_(True)).all()
        for appointment in active_appointments:
            base_duration = appointment.end_datetime - appointment.start_datetime
            cancelled_single_appointment = (
                not appointment.recurrence_rule and
                any(
                    exc.action == "CANCELLED" and exc.occurrence_start_datetime == appointment.start_datetime
                    for exc in appointment.exceptions
                )
            )
            if not appointment.recurrence_rule:
                is_stale = appointment.end_datetime < now
            elif appointment.recurrence_until is not None:
                is_stale = appointment.recurrence_until + base_duration < now
            else:
                is_stale = False

            if is_stale or cancelled_single_appointment:
                appointment.is_active = False
                stale_updated = True

        if stale_updated:
            db.commit()
    finally:
        db.close()

def _ensure_therapist_details_columns():
    inspector = inspect(engine)
    if "therapist_details" not in inspector.get_table_names():
        return

    column_specs = [
        ("therapist_name", "VARCHAR(255) NOT NULL DEFAULT ''"),
        ("accreditation", "VARCHAR(255) NOT NULL DEFAULT ''"),
        ("session_hourly_rate", "VARCHAR(64) NOT NULL DEFAULT ''"),
        ("street", "VARCHAR(255) NOT NULL DEFAULT ''"),
        ("city", "VARCHAR(120) NOT NULL DEFAULT ''"),
        ("postcode", "VARCHAR(32) NOT NULL DEFAULT ''"),
        ("currency", "VARCHAR(16) NOT NULL DEFAULT 'GBP'"),
        ("iban", "VARCHAR(128) NOT NULL DEFAULT ''"),
        ("bic", "VARCHAR(128) NOT NULL DEFAULT ''"),
    ]

    with engine.begin() as conn:
        existing_columns = {col["name"] for col in inspector.get_columns("therapist_details")}
        for column_name, column_definition in column_specs:
            if column_name not in existing_columns:
                conn.execute(
                    text(f"ALTER TABLE therapist_details ADD COLUMN {column_name} {column_definition}")
                )

def _ensure_invoice_indexes():
    inspector = inspect(engine)
    if "invoices" not in inspector.get_table_names():
        return

    with engine.begin() as conn:
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_source "
            "ON invoices(source_type, source_id)"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_year_sequence "
            "ON invoices(year, sequence_number)"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number "
            "ON invoices(invoice_number)"
        ))

# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
