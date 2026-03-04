import os
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
    _ensure_personal_notes_columns()
    _ensure_appointment_indexes()

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
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_active_client "
            "ON appointments(client_id) WHERE is_active = 1"
        ))

# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
