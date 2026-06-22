# Astro Consensus

Astro Consensus calculates Vedic, Western, and Pythagorean numerology data and
uses a hosted open-weight language model to write an evidence-cited interpretation.
Consensus reports compare all three deterministic datasets in one normal model call.

## What is real

- Vedic positions use Swiss Ephemeris with Lahiri ayanamsa and whole-sign houses.
- Western positions use the tropical zodiac, Placidus houses, and major aspects.
- Birth instants are converted from an IANA timezone to UTC, including historical DST.
- Numerology values are calculated locally with the Pythagorean letter system.
- Forecast reports calculate dated transit/cycle snapshots for their requested period.
- Every report receives an evidence catalog derived from the calculations.
- Model citations are checked against that catalog; unknown evidence IDs are rejected.
- High-latitude Western charts disclose a whole-sign fallback when Placidus is unavailable.

Astrology and numerology are interpretive traditions, not scientifically validated
forecasting methods. Reports are for reflection and entertainment.

## Backend

Python 3.9 or newer is required.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

Add a Groq key to `backend/.env`, then start the API:

```bash
PYTHONPATH=backend uvicorn main:app --app-dir backend --reload
```

API documentation is available at `http://127.0.0.1:8000/docs`.

Main endpoints:

- `POST /api/calculations`: deterministic data only; no AI request.
- `POST /api/reports`: calculations, evidence catalog, and AI-assisted interpretation.
- `GET /api/locations`: city search with coordinates and IANA timezone data.
- `GET /api/health`: service and model configuration status without secrets.

Birthplace search uses Open-Meteo's geocoding API, backed by GeoNames location
data. The selected IANA timezone is applied to the historical birth date locally.

## Frontend

```bash
cd frontend
npm ci
npm run dev
```

Vite proxies `/api` to the local FastAPI server. Set `VITE_API_URL` only when the
API is deployed on another origin.

## Checks

```bash
PYTHONPATH=backend .venv/bin/pytest backend/tests
cd frontend && npm run lint && npm run build
```

Never commit `backend/.env` or paste an API key into source code.

## Source layout

- `backend/systems/`: deterministic Vedic, Western, and numerology engines.
- `backend/shared/forecast.py`: report-period sampling dates.
- `backend/shared/evidence.py`: evidence catalog and citation validation.
- `backend/shared/report_service.py`: system orchestration and report prompting.
- `frontend/src/components/`: form and transparent report/evidence presentation.
