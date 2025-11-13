#!/usr/bin/env python3
"""
Standalone database migration script for Therapy Session Manager.

This script migrates the assessment_notes table to add duration_minutes and is_paid columns.

Run this script if the app cannot read session data after updating.

Usage:
    python3 migrate_database.py
"""

import os
import sqlite3
import sys

# Get the database path (same as in the app)
HOME_DIR = os.path.expanduser("~")
APP_DATA_DIR = os.path.join(HOME_DIR, "Library", "Application Support", "therapy-sessions-app")
DB_PATH = os.path.join(APP_DATA_DIR, "therapy.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        print("   The database will be created automatically when you first run the app.")
        return False
    
    print(f"📂 Found database at: {DB_PATH}")
    print("🔍 Checking if migration is needed...")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if assessment_notes table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='assessment_notes'")
        if not cursor.fetchone():
            print("ℹ️  assessment_notes table doesn't exist yet. No migration needed.")
            conn.close()
            return True
        
        # Check current columns
        cursor.execute("PRAGMA table_info(assessment_notes)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'duration_minutes' in columns and 'is_paid' in columns:
            print("✅ Migration already completed - database is up to date!")
            conn.close()
            return True
        
        print("🔄 Migrating database...")
        
        # Add columns if they don't exist
        if 'duration_minutes' not in columns:
            print("   Adding duration_minutes column...")
            cursor.execute("ALTER TABLE assessment_notes ADD COLUMN duration_minutes INTEGER DEFAULT 50")
            cursor.execute("UPDATE assessment_notes SET duration_minutes = 50 WHERE duration_minutes IS NULL")
            print("   ✅ duration_minutes column added (default: 50 minutes)")
        
        if 'is_paid' not in columns:
            print("   Adding is_paid column...")
            cursor.execute("ALTER TABLE assessment_notes ADD COLUMN is_paid BOOLEAN DEFAULT 0")
            cursor.execute("UPDATE assessment_notes SET is_paid = 0 WHERE is_paid IS NULL")
            print("   ✅ is_paid column added (default: False)")
        
        conn.commit()
        conn.close()
        
        print("\n✅ Migration completed successfully!")
        print("   Your database is now compatible with the new app version.")
        print("   You can now run the app and all your data will be accessible.")
        return True
        
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Therapy Session Manager - Database Migration")
    print("=" * 60)
    print()
    
    success = migrate()
    
    print()
    if success:
        print("✅ Migration process completed!")
        sys.exit(0)
    else:
        print("❌ Migration failed. Please check the error messages above.")
        sys.exit(1)



