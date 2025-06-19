import os
import sys

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from backend.models.base import Base
from backend.models.client import Client, ClientStatus
from backend.models.session_note import SessionNote
from backend.models.assessment_note import AssessmentNote
from backend.models.supervision_note import SupervisionNote

# Get the user's home directory
HOME_DIR = os.path.expanduser("~")
# Create app data directory in the user's Library/Application Support
APP_DATA_DIR = os.path.join(HOME_DIR, "Library", "Application Support", "therapy-sessions-app")
# Ensure the directory exists
os.makedirs(APP_DATA_DIR, exist_ok=True)

# Database URL
DATABASE_URL = f"sqlite:///{os.path.join(APP_DATA_DIR, 'therapy.db')}"

def init_db():
    # Create engine
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    print("Database initialized successfully!")

if __name__ == "__main__":
    init_db() 