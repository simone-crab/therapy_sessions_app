#!/usr/bin/env python3
"""
Standalone database migration script for Therapy Session Manager.

This script migrates the database schema for the app.

Run this script if the app cannot read session data after updating.

Usage:
    python3 migrate_database.py
"""

import os
import sqlite3
import sys
import argparse

# Get the database path (same as in the app)
HOME_DIR = os.path.expanduser("~")
APP_DATA_DIR = os.path.join(HOME_DIR, "Library", "Application Support", "therapy-sessions-app")
DEFAULT_DB_PATH = os.path.join(APP_DATA_DIR, "therapy.db")

def migrate(db_path: str):
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        print("   The database will be created automatically when you first run the app.")
        return False
    
    print(f"📂 Found database at: {db_path}")
    print("🔍 Checking if migration is needed...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if assessment_notes table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='assessment_notes'")
        has_assessment_notes = cursor.fetchone() is not None

        # Check if clients table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='clients'")
        has_clients = cursor.fetchone() is not None

        if not has_assessment_notes and not has_clients:
            print("ℹ️  No relevant tables exist yet. No migration needed.")
            conn.close()
            return True
        
        migration_needed = False

        if has_assessment_notes:
            # Check current columns
            cursor.execute("PRAGMA table_info(assessment_notes)")
            assessment_columns = [row[1] for row in cursor.fetchall()]

            if 'duration_minutes' in assessment_columns and 'is_paid' in assessment_columns:
                print("✅ Assessment notes table is up to date.")
            else:
                migration_needed = True
                print("🔄 Migrating assessment_notes table...")

                # Add columns if they don't exist
                if 'duration_minutes' not in assessment_columns:
                    print("   Adding duration_minutes column...")
                    cursor.execute("ALTER TABLE assessment_notes ADD COLUMN duration_minutes INTEGER DEFAULT 50")
                    cursor.execute("UPDATE assessment_notes SET duration_minutes = 50 WHERE duration_minutes IS NULL")
                    print("   ✅ duration_minutes column added (default: 50 minutes)")
                
                if 'is_paid' not in assessment_columns:
                    print("   Adding is_paid column...")
                    cursor.execute("ALTER TABLE assessment_notes ADD COLUMN is_paid BOOLEAN DEFAULT 0")
                    cursor.execute("UPDATE assessment_notes SET is_paid = 0 WHERE is_paid IS NULL")
                    print("   ✅ is_paid column added (default: False)")

        if has_clients:
            cursor.execute("PRAGMA table_info(clients)")
            client_columns = [row[1] for row in cursor.fetchall()]

            if 'client_code' in client_columns:
                print("✅ Clients table already has client_code.")
            else:
                migration_needed = True
                print("🔄 Migrating clients table...")
                print("   Adding client_code column...")
                cursor.execute("ALTER TABLE clients ADD COLUMN client_code TEXT")
                print("   ✅ client_code column added.")

            # Create unique index for client_code if it doesn't exist
            cursor.execute("PRAGMA index_list(clients)")
            index_names = [row[1] for row in cursor.fetchall()]
            if "ux_clients_client_code" not in index_names:
                migration_needed = True
                print("   Adding unique index for client_code...")
                cursor.execute(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_client_code ON clients(client_code)"
                )
                print("   ✅ Unique index for client_code added.")

        # CPD notes: ensure table exists with new structure (duration_hours, organisation, title, medium)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cpd_notes'")
        has_cpd_notes = cursor.fetchone() is not None

        if not has_cpd_notes:
            migration_needed = True
            print("🔄 Creating cpd_notes table (new schema)...")
            cursor.execute("""
                CREATE TABLE cpd_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    cpd_date DATE NOT NULL,
                    duration_hours REAL NOT NULL DEFAULT 1.0,
                    content TEXT,
                    organisation TEXT NOT NULL DEFAULT '',
                    title TEXT NOT NULL DEFAULT '',
                    medium TEXT NOT NULL DEFAULT 'Online'
                )
            """)
            print("   ✅ cpd_notes table created.")
        else:
            cursor.execute("PRAGMA table_info(cpd_notes)")
            cpd_columns = [row[1] for row in cursor.fetchall()]

            if 'duration_hours' not in cpd_columns or 'organisation' not in cpd_columns or 'title' not in cpd_columns or 'medium' not in cpd_columns:
                migration_needed = True
                print("🔄 Migrating cpd_notes table...")
            if 'duration_hours' not in cpd_columns:
                print("   Adding duration_hours column...")
                cursor.execute("ALTER TABLE cpd_notes ADD COLUMN duration_hours REAL DEFAULT 1.0")
                cursor.execute(
                    "UPDATE cpd_notes SET duration_hours = CAST(duration_minutes AS REAL) / 60.0 WHERE duration_minutes IS NOT NULL"
                )
                cursor.execute("UPDATE cpd_notes SET duration_hours = 1.0 WHERE duration_hours IS NULL")
                print("   ✅ duration_hours column added.")
            if 'organisation' not in cpd_columns:
                cursor.execute("ALTER TABLE cpd_notes ADD COLUMN organisation TEXT DEFAULT ''")
                print("   ✅ organisation column added.")
            if 'title' not in cpd_columns:
                cursor.execute("ALTER TABLE cpd_notes ADD COLUMN title TEXT DEFAULT ''")
                print("   ✅ title column added.")
            if 'medium' not in cpd_columns:
                cursor.execute("ALTER TABLE cpd_notes ADD COLUMN medium TEXT DEFAULT 'Online'")
                print("   ✅ medium column added.")

            # If old schema has duration_minutes (NOT NULL), rebuild table to drop it
            if 'duration_minutes' in cpd_columns:
                migration_needed = True
                print("🔄 Rebuilding cpd_notes table to remove duration_minutes...")
                cursor.execute("ALTER TABLE cpd_notes RENAME TO cpd_notes_old")
                cursor.execute("""
                    CREATE TABLE cpd_notes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        cpd_date DATE NOT NULL,
                        duration_hours REAL NOT NULL DEFAULT 1.0,
                        content TEXT,
                        organisation TEXT NOT NULL DEFAULT '',
                        title TEXT NOT NULL DEFAULT '',
                        medium TEXT NOT NULL DEFAULT 'Online'
                    )
                """)
                # Build safe select expressions based on existing columns
                content_expr = "content" if "content" in cpd_columns else "''"
                duration_hours_expr = "duration_hours" if "duration_hours" in cpd_columns else "CAST(duration_minutes AS REAL) / 60.0"
                organisation_expr = "organisation" if "organisation" in cpd_columns else "''"
                title_expr = "title" if "title" in cpd_columns else "''"
                medium_expr = "medium" if "medium" in cpd_columns else "'Online'"
                cursor.execute(f"""
                    INSERT INTO cpd_notes (cpd_date, duration_hours, content, organisation, title, medium)
                    SELECT cpd_date, {duration_hours_expr}, {content_expr}, {organisation_expr}, {title_expr}, {medium_expr}
                    FROM cpd_notes_old
                """)
                cursor.execute("DROP TABLE cpd_notes_old")
                print("   ✅ cpd_notes table rebuilt without duration_minutes.")

            # Ensure created_at/updated_at are set for existing rows
            cursor.execute("SELECT COUNT(*) FROM cpd_notes WHERE created_at IS NULL")
            null_created_at_count = cursor.fetchone()[0]
            if null_created_at_count > 0:
                migration_needed = True
                print(f"   Backfilling created_at on {null_created_at_count} CPD rows...")
                cursor.execute("UPDATE cpd_notes SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")

            cursor.execute("SELECT COUNT(*) FROM cpd_notes WHERE updated_at IS NULL")
            null_updated_at_count = cursor.fetchone()[0]
            if null_updated_at_count > 0:
                migration_needed = True
                print(f"   Backfilling updated_at on {null_updated_at_count} CPD rows...")
                cursor.execute("UPDATE cpd_notes SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")

        if not migration_needed:
            print("✅ Migration already completed - database is up to date!")
            conn.close()
            return True
        
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
    
    parser = argparse.ArgumentParser(description="Migrate Therapy Session Manager SQLite database.")
    parser.add_argument(
        "--db-path",
        default=DEFAULT_DB_PATH,
        help=f"Path to therapy.db (default: {DEFAULT_DB_PATH})",
    )
    args = parser.parse_args()

    success = migrate(args.db_path)
    
    print()
    if success:
        print("✅ Migration process completed!")
        sys.exit(0)
    else:
        print("❌ Migration failed. Please check the error messages above.")
        sys.exit(1)









