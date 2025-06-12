import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

DATABASE_URL = "sqlite:///./data/therapy.db"

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
