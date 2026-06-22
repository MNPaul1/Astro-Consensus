from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health_does_not_expose_api_key():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert "api_key" not in response.json()


def test_location_search_returns_calculation_fields(monkeypatch):
    monkeypatch.setattr(
        "main.search_locations",
        lambda _query: [
            {
                "id": 1,
                "name": "Vancouver",
                "label": "Vancouver, British Columbia, Canada",
                "latitude": 49.24966,
                "longitude": -123.11934,
                "timezone": "America/Vancouver",
            }
        ],
    )

    response = client.get("/api/locations", params={"q": "Vancouver"})

    assert response.status_code == 200
    location = response.json()["results"][0]
    assert location["timezone"] == "America/Vancouver"
    assert location["latitude"] == 49.24966


def test_report_validation_returns_422():
    response = client.post("/api/reports", json={"name": "Incomplete"})
    assert response.status_code == 422


def test_all_report_systems_dispatch(monkeypatch):
    monkeypatch.setattr(
        "shared.report_service.validate_report_evidence",
        lambda _report, _evidence: None,
    )
    monkeypatch.setattr(
        "shared.report_service.ask_ai",
        lambda _prompt, system_prompt=None: "Test report",
    )
    base = {
        "name": "Test User",
        "year": 1995,
        "month": 4,
        "day": 12,
        "hour": 22,
        "minute": 30,
        "latitude": 43.6532,
        "longitude": -79.3832,
        "timezone": "America/Toronto",
        "report_type": "weekly",
        "question": "What matters this week?",
    }

    for system in ("vedic", "western", "numerology", "consensus"):
        response = client.post(
            "/api/reports", json={**base, "system": system}
        )
        assert response.status_code == 200
        body = response.json()
        assert body["system"] == system
        assert body["report"] == "Test report"
        assert body["themes"]


def test_calculation_endpoint_does_not_require_ai():
    response = client.post(
        "/api/calculations",
        json={
            "name": "Test User",
            "year": 1995,
            "month": 4,
            "day": 12,
            "system": "numerology",
            "report_type": "personality",
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["core_numbers"]["life_path"] == 4
