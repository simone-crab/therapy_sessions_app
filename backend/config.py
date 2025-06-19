import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base

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

# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
