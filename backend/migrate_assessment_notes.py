#!/usr/bin/env python3
"""
Migration script to add duration_minutes and is_paid columns to assessment_notes table.

This script:
1. Adds duration_minutes column (default: 50 minutes)
2. Adds is_paid column (default: False)
3. Sets default values for existing records

Run this script before starting the app after updating the models.
"""

import os
import sqlite3
import sys
from pathlib import Path

# Get the database path (same as in config.py)
HOME_DIR = os.path.expanduser("~")
APP_DATA_DIR = os.path.join(HOME_DIR, "Library", "Application Support", "therapy-sessions-app")
DB_PATH = os.path.join(APP_DATA_DIR, "therapy.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        print("No migration needed - database will be created with new schema.")
        return
    
    print(f"Connecting to database at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if migration is already done
        cursor.execute("PRAGMA table_info(assessment_notes)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'duration_minutes' in columns and 'is_paid' in columns:
            print("Migration already completed - duration_minutes and is_paid exist.")
            return
        
        # Add columns if they don't exist
        if 'duration_minutes' not in columns:
            print("Adding duration_minutes column to assessment_notes...")
            cursor.execute("ALTER TABLE assessment_notes ADD COLUMN duration_minutes INTEGER DEFAULT 50")
            # Set default for existing records
            cursor.execute("UPDATE assessment_notes SET duration_minutes = 50 WHERE duration_minutes IS NULL")
        
        if 'is_paid' not in columns:
            print("Adding is_paid column to assessment_notes...")
            cursor.execute("ALTER TABLE assessment_notes ADD COLUMN is_paid BOOLEAN DEFAULT 0")
            # Set default for existing records
            cursor.execute("UPDATE assessment_notes SET is_paid = 0 WHERE is_paid IS NULL")
        
        # Make duration_minutes NOT NULL (SQLite doesn't support this directly, so we recreate)
        # But first check if we need to
        cursor.execute("SELECT COUNT(*) FROM assessment_notes WHERE duration_minutes IS NULL")
        null_count = cursor.fetchone()[0]
        
        if null_count > 0:
            cursor.execute("UPDATE assessment_notes SET duration_minutes = 50 WHERE duration_minutes IS NULL")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        print(f"   - Added duration_minutes column (default: 50)")
        print(f"   - Added is_paid column (default: False)")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

