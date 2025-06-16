import sqlite3

DB_PATH = "data/therapy.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Add the client_id column if it doesn't exist
    cursor.execute("PRAGMA table_info(supervision_notes)")
    columns = [col[1] for col in cursor.fetchall()]
    if "client_id" not in columns:
        cursor.execute("ALTER TABLE supervision_notes ADD COLUMN client_id INTEGER REFERENCES clients(id)")
        print("Added client_id column to supervision_notes table.")
    else:
        print("client_id column already exists.")

    # Optionally, set a default client_id for existing rows (set to NULL or a valid client id)
    cursor.execute("UPDATE supervision_notes SET client_id = NULL WHERE client_id IS NULL")
    print("Set client_id to NULL for existing supervision notes.")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()