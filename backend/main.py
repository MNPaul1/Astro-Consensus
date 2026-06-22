import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from shared.models.birth_data import ReportRequest
from shared.ai_client import AIClientError, load_local_env
from shared.geocoding import LocationLookupError, search_locations
from shared.report_service import calculate_system_data, generate_report


load_local_env()

app = FastAPI(
    title="Astro Consensus API",
    version="1.0.0",
    description="Deterministic chart calculations with AI-assisted interpretation.",
)

origins = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/")
def root():
    return {
        "status": "running",
        "service": "Astro Consensus API",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "ai_configured": bool(os.getenv("GROQ_API_KEY")),
        "model": os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
    }


@app.get("/api/locations")
def locations(q: str = Query(min_length=2, max_length=100)):
    try:
        return {"results": search_locations(q.strip())}
    except LocationLookupError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/reports")
def report(request: ReportRequest):
    try:
        return generate_report(request)
    except AIClientError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/calculations")
def calculations(request: ReportRequest):
    try:
        return {
            "system": request.system,
            "data": calculate_system_data(request),
        }
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
