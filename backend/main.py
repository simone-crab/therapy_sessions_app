from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
import traceback

# Ensure errors are printed to stderr
def print_error(msg):
    print(msg, file=sys.stderr, flush=True)

try:
    from backend.config import create_tables
    from backend.api import clients, session_notes, assessment_notes, supervision_notes, reports
except Exception as e:
    print_error(f"ERROR: Failed to import modules: {e}")
    print_error(traceback.format_exc())
    sys.exit(1)

app = FastAPI(title="Therapy Session Manager", version="1.0")

# Create tables on startup
try:
    create_tables() # Re-enable for Alembic to recognize existing schema
except Exception as e:
    print_error(f"ERROR: Failed to create tables: {e}")
    print_error(traceback.format_exc())
    sys.exit(1)

# Configure CORS
# More restrictive origins - common for local development including frontend dev server
allowed_origins = [
    "http://localhost:8000", # Assuming backend might be served here directly
    "http://127.0.0.1:8000",
    "http://localhost:5173", # Common for Vite dev server
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Determine if we're running in production (packaged) mode
is_production = getattr(sys, 'frozen', False)

# Set up paths for static files and templates
try:
    if is_production:
        # When running as a packaged application
        # PyInstaller sets sys._MEIPASS to the directory containing the data files
        if not hasattr(sys, '_MEIPASS'):
            print_error("ERROR: Running in production mode but sys._MEIPASS is not set!")
            sys.exit(1)
        base_path = sys._MEIPASS
        static_dir = os.path.join(base_path, 'frontend', 'static')
        templates_dir = os.path.join(base_path, 'frontend', 'templates')
    else:
        # When running in development
        static_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'static')
        templates_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'templates')

    print(f"Static directory: {static_dir}")
    print(f"Templates directory: {templates_dir}")
    
    # Verify directories exist
    if not os.path.exists(static_dir):
        print_error(f"ERROR: Static directory does not exist: {static_dir}")
        sys.exit(1)
    if not os.path.exists(templates_dir):
        print_error(f"ERROR: Templates directory does not exist: {templates_dir}")
        sys.exit(1)
        
    # Static and template files
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
except Exception as e:
    print_error(f"ERROR: Failed to set up paths: {e}")
    print_error(traceback.format_exc())
    sys.exit(1)

@app.get("/", response_class=HTMLResponse)
async def root():
    with open(os.path.join(templates_dir, "index.html")) as f:
        return HTMLResponse(content=f.read())

@app.get("/reports", response_class=HTMLResponse)
async def reports_page():
    with open(os.path.join(templates_dir, "reports.html")) as f:
        return HTMLResponse(content=f.read())

# Routers
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(session_notes.router, prefix="/api/sessions", tags=["Session Notes"])
app.include_router(assessment_notes.router, prefix="/api/assessments", tags=["Assessment Notes"])
app.include_router(supervision_notes.router, prefix="/api/supervisions", tags=["Supervision Notes"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

if __name__ == "__main__":
    try:
        import uvicorn
        print("Starting uvicorn server...")
        uvicorn.run(app, host="127.0.0.1", port=8000)
    except Exception as e:
        print_error(f"ERROR: Failed to start uvicorn server: {e}")
        print_error(traceback.format_exc())
        sys.exit(1)
