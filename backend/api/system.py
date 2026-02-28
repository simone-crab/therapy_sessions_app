from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
import os
import sqlite3
import tempfile

from backend.config import APP_DATA_DIR

router = APIRouter()

DB_PATH = os.path.join(APP_DATA_DIR, "therapy.db")


def _cleanup_file(file_path: str):
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        pass


@router.post("/backup-snapshot")
def create_backup_snapshot():
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="Database file not found")

    tmp_handle, tmp_path = tempfile.mkstemp(prefix="solu-notes-backup-", suffix=".db")
    os.close(tmp_handle)

    source_conn = None
    dest_conn = None
    try:
        source_conn = sqlite3.connect(DB_PATH)
        dest_conn = sqlite3.connect(tmp_path)
        source_conn.backup(dest_conn)
    except sqlite3.Error as exc:
        _cleanup_file(tmp_path)
        raise HTTPException(status_code=500, detail=f"Failed to create backup snapshot: {exc}") from exc
    finally:
        if dest_conn is not None:
            dest_conn.close()
        if source_conn is not None:
            source_conn.close()

    return FileResponse(
        tmp_path,
        media_type="application/octet-stream",
        filename="solu-notes-backup.db",
        background=BackgroundTask(_cleanup_file, tmp_path),
    )
