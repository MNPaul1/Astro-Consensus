import os
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from shared.models.birth_data import ReportRequest
from shared.ai_client import (
    AIClientError,
    AIRequestConfig,
    load_local_env,
    parse_model_priority,
    use_request_ai_config,
)
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
    allow_headers=["*"],
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
        "supports_user_models": True,
    }


def build_request_ai_override(
    x_ai_mode: Optional[str],
    x_ai_base_url: Optional[str],
    x_ai_api_key: Optional[str],
    x_ai_model: Optional[str],
) -> Optional[AIRequestConfig]:
    mode = (x_ai_mode or "").strip().lower()
    if mode not in {"custom", "bring-your-own", "byom"}:
        return None

    base_url = (x_ai_base_url or "").strip().rstrip("/")
    api_key = (x_ai_api_key or "").strip()
    model = (x_ai_model or "").strip()

    if not base_url or not api_key or not model:
        raise HTTPException(
            status_code=422,
            detail="Custom AI settings require endpoint URL, API key, and model name.",
        )

    if not base_url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=422,
            detail="Custom AI endpoint must start with http:// or https://.",
        )

    if not base_url.endswith("/chat/completions"):
        if base_url.endswith("/v1"):
            base_url = f"{base_url}/chat/completions"
        elif base_url.endswith("/openai/v1"):
            base_url = f"{base_url}/chat/completions"
        else:
            base_url = f"{base_url}/chat/completions"

    return AIRequestConfig(
        api_url=base_url,
        api_key=api_key,
        model_order=[model],
        source_label=f"User model ({model})",
    )


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
def report(
    request: ReportRequest,
    x_request_id: Optional[str] = Header(default=None),
    x_ai_mode: Optional[str] = Header(default=None),
    x_ai_base_url: Optional[str] = Header(default=None),
    x_ai_api_key: Optional[str] = Header(default=None),
    x_ai_model: Optional[str] = Header(default=None),
):
    if x_request_id:
        start_request(x_request_id, "Preparing your astrology reading")
    try:
        ai_override = build_request_ai_override(
            x_ai_mode,
            x_ai_base_url,
            x_ai_api_key,
            x_ai_model,
        )
        with use_request_ai_config(ai_override):
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
