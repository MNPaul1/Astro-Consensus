import os
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from shared.models.birth_data import ReportRequest
from shared.ai_client import AIClientError, load_local_env, parse_model_priority
from shared.ai_progress import finish_request, get_request_status, start_request
from shared.geocoding import LocationLookupError, search_locations
from shared.report_service import calculate_system_data, generate_report


load_local_env()

app = FastAPI(
    title="Astro Consensus API",
    version="1.0.0",
    description="Deterministic chart calculations with AI-assisted interpretation.",
)

origins = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,https://astro-consensus.vercel.app"
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
    forced_model = os.getenv("GROQ_MODEL", "").strip() or None
    return {
        "status": "ok",
        "ai_configured": bool(os.getenv("GROQ_API_KEY")),
        "forced_model": forced_model,
        "model_priority": parse_model_priority(),
    }


@app.get("/api/locations")
def locations(q: str = Query(min_length=2, max_length=100)):
    try:
        return {"results": search_locations(q.strip())}
    except LocationLookupError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/ai-progress/{request_id}")
def ai_progress(request_id: str):
    status = get_request_status(request_id)
    if not status:
        raise HTTPException(status_code=404, detail="Unknown request id")
    return status


@app.post("/api/reports")
def report(request: ReportRequest, x_request_id: Optional[str] = Header(default=None)):
    if x_request_id:
        start_request(x_request_id, "Preparing your astrology reading")
    try:
        result = generate_report(request, request_id=x_request_id)
        if x_request_id:
            finish_request(x_request_id, "complete", "Report ready")
        return result
    except AIClientError as exc:
        if x_request_id:
            finish_request(x_request_id, "failed", str(exc))
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        if x_request_id:
            finish_request(x_request_id, "failed", str(exc))
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
