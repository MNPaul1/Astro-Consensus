from datetime import date, datetime, timedelta, timezone

import pytest

from shared.ai_client import AIClientError
from shared.models.birth_data import ReportRequest
from shared.report_service import (
    calculate_system_data,
    forecast_dates,
    generate_report,
    validate_report_evidence,
)
from systems.numerology.engines.numerology_engine import calculate_numerology
from systems.vedic.engines.vedic_engine import calculate_vimshottari_dasha


BASE_REQUEST = {
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
    "question": "What patterns matter this week?",
}


def request_for(system):
    return ReportRequest(**BASE_REQUEST, system=system)


def test_request_rejects_invalid_calendar_date():
    with pytest.raises(ValueError):
        ReportRequest(**{**BASE_REQUEST, "month": 2, "day": 30}, system="vedic")


def test_request_rejects_future_birth_date():
    future = date.today() + timedelta(days=1)
    with pytest.raises(ValueError):
        ReportRequest(
            **{
                **BASE_REQUEST,
                "year": future.year,
                "month": future.month,
                "day": future.day,
            },
            system="vedic",
        )


def test_vedic_chart_uses_historical_timezone_and_opposite_nodes():
    chart = calculate_system_data(request_for("vedic"))
    assert chart["birth_time"]["utc"].startswith("1995-04-13T02:30")
    node_distance = (
        chart["planets"]["Ketu"]["longitude"]
        - chart["planets"]["Rahu"]["longitude"]
    ) % 360
    assert node_distance == pytest.approx(180, abs=0.02)
    assert len(chart["transit_snapshots"]) == 7


def test_starting_dasha_begins_before_birth():
    birth = datetime(2000, 1, 1, tzinfo=timezone.utc)
    dasha = calculate_vimshottari_dasha(5.0, birth, target_datetime=birth)
    assert dasha["mahadasha"]["start"] < birth.date().isoformat()


def test_western_chart_has_real_positions_houses_and_aspects():
    chart = calculate_system_data(request_for("western"))
    assert chart["zodiac"] == "Tropical"
    assert chart["house_system"] == "Placidus"
    assert len(chart["house_cusps"]) == 12
    assert len(chart["planets"]) == 11
    assert chart["aspects"]


def test_western_chart_discloses_polar_house_fallback():
    chart = calculate_system_data(
        ReportRequest(**{**BASE_REQUEST, "latitude": 80}, system="western")
    )
    assert "Whole Sign" in chart["house_system"]


def test_numerology_known_reductions():
    result = calculate_numerology("Ada Lovelace", 1815, 12, 10)
    assert result["core_numbers"]["life_path"] == 1
    assert 1 <= result["core_numbers"]["expression"] <= 33


def test_numerology_request_does_not_require_astrology_fields():
    request = ReportRequest(
        name="Test User",
        year=1995,
        month=4,
        day=12,
        report_type="personality",
        system="numerology",
    )
    assert calculate_system_data(request)["core_numbers"]["life_path"] == 4


def test_forecast_sampling_matches_report_period():
    assert len(forecast_dates("daily")) == 1
    assert len(forecast_dates("weekly")) == 7
    monthly_dates = forecast_dates("monthly")
    assert len(monthly_dates) == 7
    assert (monthly_dates[-1].date() - monthly_dates[0].date()).days == 29
    assert len(forecast_dates("yearly")) >= 2


def test_report_rejects_unknown_evidence_ids():
    with pytest.raises(AIClientError, match="unsupported evidence"):
        validate_report_evidence(
            "Claim [V-ASC] [V-MOON] [MADE-UP]",
            {"V-ASC": "one", "V-MOON": "two", "V-DASHA": "three"},
        )


def test_report_accepts_valid_bare_evidence_id():
    citations = validate_report_evidence(
        "This claim cites V-ASC without brackets.",
        {"V-ASC": "Vedic ascendant"},
    )
    assert citations == {"V-ASC"}


def test_report_repairs_missing_citations(monkeypatch):
    calls = []

    def fake_ai(prompt, system_prompt=None):
        calls.append(prompt)
        if len(calls) == 1:
            return "An uncited draft."
        return "A repaired draft [N-CORE-LIFE-PATH]."

    monkeypatch.setattr("shared.report_service.ask_ai", fake_ai)
    request = ReportRequest(
        name="Test User",
        year=1995,
        month=4,
        day=12,
        system="numerology",
        report_type="personality",
    )
    result = generate_report(request)
    assert len(calls) == 2
    assert "An uncited draft." in calls[1]
    assert result["report"] == "A repaired draft."


def test_report_adds_evidence_basis_when_repair_omits_citations(monkeypatch):
    calls = []

    def fake_ai(prompt, system_prompt=None):
        calls.append(prompt)
        return "A grounded interpretation without citation formatting."

    monkeypatch.setattr("shared.report_service.ask_ai", fake_ai)
    request = ReportRequest(
        name="Test User",
        year=1995,
        month=4,
        day=12,
        system="numerology",
        report_type="personality",
    )

    result = generate_report(request)

    assert len(calls) == 2
    assert "### Evidence basis" not in result["report"]
    assert "[N-CORE-LIFE-PATH]" not in result["report"]
    assert result["report"] == "A grounded interpretation without citation formatting."


def test_report_survives_failed_citation_repair(monkeypatch):
    calls = []

    def fake_ai(prompt, system_prompt=None):
        calls.append(prompt)
        if len(calls) == 1:
            return "A generated report without citation formatting."
        raise AIClientError("The repair request reached its token limit.")

    monkeypatch.setattr("shared.report_service.ask_ai", fake_ai)
    request = ReportRequest(
        name="Test User",
        year=1995,
        month=4,
        day=12,
        system="numerology",
        report_type="personality",
    )

    result = generate_report(request)

    assert result["report"].startswith("A generated report")
    assert "[N-CORE-LIFE-PATH]" not in result["report"]


def test_report_strips_unsupported_citations_and_recovers(monkeypatch):
    calls = []

    def fake_ai(prompt, system_prompt=None):
        calls.append(prompt)
        if len(calls) == 1:
            return "First draft without citations."
        return "Detailed reading [W-ASC-10] [W-ASPECT-99]"

    monkeypatch.setattr("shared.report_service.ask_ai", fake_ai)
    request = ReportRequest(
        name="Test User",
        year=1995,
        month=4,
        day=12,
        system="numerology",
        report_type="personality",
    )

    result = generate_report(request)

    assert "[W-ASC-10]" not in result["report"]
    assert "[W-ASPECT-99]" not in result["report"]
    assert "[N-CORE-LIFE-PATH]" not in result["report"]


def test_report_returns_v2_synthesis_fields(monkeypatch):
    monkeypatch.setattr(
        "shared.report_service.ask_ai",
        lambda _prompt, system_prompt=None: "Grounded [N-CORE-LIFE-PATH] [N-CORE-EXPRESSION]",
    )
    request = ReportRequest(
        name="Test User",
        year=1995,
        month=4,
        day=12,
        system="numerology",
        report_type="weekly",
    )

    result = generate_report(request)

    assert result["confidence"] in {"high", "moderate", "speculative"}
    assert result["insight_map"]
    assert result["insight_map"][0]["signals"]
    assert result["timing_windows"]
    assert result["transit_calendar"]


def test_report_preserves_selected_life_area_and_builds_calendar(monkeypatch):
    monkeypatch.setattr(
        "shared.report_service.ask_ai",
        lambda _prompt, system_prompt=None: "Grounded [N-CORE-LIFE-PATH] [N-CORE-EXPRESSION]",
    )
    request = ReportRequest(
        name="Test User",
        year=1995,
        month=4,
        day=12,
        system="numerology",
        report_type="monthly",
        life_area="career",
    )

    result = generate_report(request)

    assert result["life_area"] == "career"
    assert result["transit_calendar"]
    assert all("title" in entry and "body" in entry for entry in result["transit_calendar"])


def test_consensus_uses_one_ai_call(monkeypatch):
    calls = []

    def fake_ai(prompt, system_prompt=None):
        calls.append((prompt, system_prompt))
        return "Generated consensus [V-ASC] [W-ASC] [N-CORE-LIFE-PATH]"

    monkeypatch.setattr("shared.report_service.ask_ai", fake_ai)
    result = generate_report(request_for("consensus"))

    assert result["report"].startswith("Generated consensus")
    assert set(result["data"]) == {"vedic", "western", "numerology"}
    assert len(calls) == 1


def test_ai_prompt_uses_only_catalogued_evidence(monkeypatch):
    captured = {}

    def fake_ai(prompt, system_prompt=None):
        captured["prompt"] = prompt
        return "Grounded [N-CORE-LIFE-PATH] [N-CORE-EXPRESSION] [N-CORE-BIRTHDAY]"

    monkeypatch.setattr("shared.report_service.ask_ai", fake_ai)
    request = ReportRequest(
        name="Test User",
        year=1995,
        month=4,
        day=12,
        system="numerology",
        report_type="personality",
    )
    result = generate_report(request)
    assert "Evidence catalog:" in captured["prompt"]
    assert "## Core Pattern" in captured["prompt"]
    assert "Be directive" in captured["prompt"]
    assert "900 to 1400 words" in captured["prompt"]
    assert "## Life Themes" in captured["prompt"]
    assert "Do not restate the same point across" in captured["prompt"]
    assert "clear narrative flow" in captured["prompt"]
    assert "strongest 2 to 4 themes" in captured["prompt"]
    assert "Bad output to avoid" in captured["prompt"]
    assert "Life area focus: General focus." in captured["prompt"]
    assert "core_numbers" not in captured["prompt"]
    assert result["evidence"]["N-CORE-LIFE-PATH"].endswith("4")
    assert not any(key.startswith("N-CYCLE") for key in result["evidence"])
