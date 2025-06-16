from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.config import create_tables
from backend.api import clients, session_notes, assessment_notes, supervision_notes, reports

app = FastAPI(title="Therapy Session Manager", version="1.0")

# Create tables on startup
create_tables()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Static and template files
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def root():
    with open("frontend/templates/index.html") as f:
        return HTMLResponse(content=f.read())

@app.get("/reports", response_class=HTMLResponse)
async def reports_page():
    with open("frontend/templates/reports.html") as f:
        return HTMLResponse(content=f.read())

# Routers
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(session_notes.router, prefix="/api/sessions", tags=["Session Notes"])
app.include_router(assessment_notes.router, prefix="/api/assessments", tags=["Assessment Notes"])
app.include_router(supervision_notes.router, prefix="/api/supervisions", tags=["Supervision Notes"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
