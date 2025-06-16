import sqlite3

DB_PATH = "data/therapy.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if the column already exists
    cursor.execute("PRAGMA table_info(session_notes)")
    columns = [col[1] for col in cursor.fetchall()]
    if "session_type" not in columns:
        # Add the new column with default value 'In-Person'
        cursor.execute("ALTER TABLE session_notes ADD COLUMN session_type TEXT NOT NULL DEFAULT 'In-Person'")
        print("Added session_type column to session_notes table.")
    else:
        print("session_type column already exists.")

    # Ensure all existing rows have the default value
    cursor.execute("UPDATE session_notes SET session_type = 'In-Person' WHERE session_type IS NULL OR session_type = ''")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate() 