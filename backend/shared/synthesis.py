from __future__ import annotations

from typing import Iterable


def _append_signal(bucket: list[dict], evidence_id: str, note: str, weight: int) -> None:
    bucket.append({"evidence_id": evidence_id, "note": note, "weight": weight})


def _confidence_from_score(score: int) -> str:
    if score >= 12:
        return "high"
    if score >= 7:
        return "moderate"
    return "speculative"


def _build_area(title: str, summary: str, signals: list[dict]) -> dict:
    evidence_ids = [signal["evidence_id"] for signal in signals]
    score = sum(signal["weight"] for signal in signals)
    return {
        "title": title,
        "summary": summary,
        "confidence": _confidence_from_score(score),
        "score": score,
        "evidence_ids": evidence_ids,
        "signals": signals,
    }


def _top_areas(areas: Iterable[dict]) -> list[dict]:
    filtered = [area for area in areas if area["signals"]]
    return sorted(filtered, key=lambda item: item["score"], reverse=True)


def _life_area_matches(life_area: str) -> tuple[str, ...]:
    mapping = {
        "general": (
            "Identity and temperament",
            "Relationships and emotional bonds",
            "Work and direction",
            "Growth and karmic pressure",
            "Growth and deeper lessons",
            "Growth and timing",
            "Timing and momentum",
        ),
        "love": ("Relationships and emotional bonds",),
        "career": ("Work and direction",),
        "money": ("Work and direction", "Timing and momentum", "Growth and timing"),
        "family": ("Relationships and emotional bonds", "Identity and temperament"),
        "growth": (
            "Growth and karmic pressure",
            "Growth and deeper lessons",
            "Growth and timing",
        ),
    }
    return mapping.get(life_area, mapping["general"])


def _focus_area(areas: list[dict], life_area: str) -> dict | None:
    matches = _life_area_matches(life_area)
    for area in areas:
        if area["title"] in matches:
            return area
    return areas[0] if areas else None


def _build_reality_checks(
    featured_areas: list[dict], overall_confidence: str, life_area: str
) -> dict:
    supported = []
    mixed = []
    cautions = []

    focus = _focus_area(featured_areas, life_area)
    if focus:
        supported.append(
            f"The clearest support in this reading is around {focus['title'].lower()}."
        )

    strong_areas = [area for area in featured_areas if area["confidence"] == "high"]
    moderate_areas = [area for area in featured_areas if area["confidence"] == "moderate"]
    speculative_areas = [
        area for area in featured_areas if area["confidence"] == "speculative"
    ]

    if strong_areas:
        supported.append(
            "The chart signals stack up most clearly in "
            + ", ".join(area["title"].lower() for area in strong_areas[:2])
            + "."
        )
    elif moderate_areas:
        supported.append(
            "The reading has decent support, but it is stronger as pattern recognition than as exact prediction."
        )

    if moderate_areas:
        mixed.append(
            "Some themes are present but layered, especially in "
            + ", ".join(area["title"].lower() for area in moderate_areas[:2])
            + "."
        )

    if speculative_areas:
        mixed.append(
            "A few areas are lighter signals, so they should be read as possibilities rather than certainties."
        )

    if overall_confidence == "speculative":
        cautions.append(
            "This reading should stay interpretive and selective rather than sounding absolute."
        )
    else:
        cautions.append(
            "Even where the reading is strong, it should describe tendencies, timing windows, and choices instead of fixed outcomes."
        )

    if life_area in {"love", "career", "money", "family", "growth"}:
        cautions.append(
            f"The {life_area} focus should stay central, but the report should not force that topic when the evidence is only indirect."
        )

    return {
        "supported": supported[:2],
        "mixed": mixed[:2],
        "cautions": cautions[:2],
    }


def _vedic_areas(data: dict, report_type: str) -> list[dict]:
    planets = data["planets"]
    areas = []

    identity_signals = []
    _append_signal(
        identity_signals,
        "V-ASC",
        f"Ascendant in {data['ascendant']['sign']} sets the outward style.",
        4,
    )
    _append_signal(
        identity_signals,
        "V-MOON",
        f"Moon in {data['moon_sign']} colors emotional instinct and memory.",
        4,
    )
    _append_signal(
        identity_signals,
        "V-NATAL-SUN",
        f"Sun in {planets['Sun']['sign']} and house {planets['Sun']['house']} shapes will and purpose.",
        3,
    )
    areas.append(
        _build_area(
            "Identity and temperament",
            f"{data['ascendant']['sign']} rising with a {data['moon_sign']} Moon suggests a clear difference between how this person comes across outwardly and how they process life inwardly. This card is showing the basic personality pattern the rest of the reading builds on.",
            identity_signals,
        )
    )

    relationship_signals = []
    _append_signal(
        relationship_signals,
        "V-NATAL-VENUS",
        f"Venus in {planets['Venus']['sign']} house {planets['Venus']['house']} shapes affection and attraction.",
        4,
    )
    _append_signal(
        relationship_signals,
        "V-NATAL-MOON",
        f"Moon in house {planets['Moon']['house']} shows emotional needs inside close bonds.",
        3,
    )
    _append_signal(
        relationship_signals,
        "V-NATAL-MARS",
        f"Mars in house {planets['Mars']['house']} shows conflict style and desire.",
        2,
    )
    areas.append(
        _build_area(
            "Relationships and emotional bonds",
            "This card is about how closeness actually works in daily life: what helps connection feel safe, what creates attraction, and where tension tends to build if emotional needs and desire are not moving together.",
            relationship_signals,
        )
    )

    work_signals = []
    _append_signal(
        work_signals,
        "V-NATAL-SATURN",
        f"Saturn in house {planets['Saturn']['house']} points to duty, pressure, and long-cycle growth.",
        4,
    )
    _append_signal(
        work_signals,
        "V-NATAL-JUPITER",
        f"Jupiter in house {planets['Jupiter']['house']} points to opportunity and guidance.",
        3,
    )
    _append_signal(
        work_signals,
        "V-NATAL-MERCURY",
        f"Mercury in house {planets['Mercury']['house']} shows the working mind and decision style.",
        3,
    )
    areas.append(
        _build_area(
            "Work and direction",
            "This card is showing how the person tends to build progress in work and life direction. It combines pressure, judgment, and decision-making style so the reading can say whether growth comes through patience, timing, communication, or responsibility.",
            work_signals,
        )
    )

    growth_signals = []
    _append_signal(
        growth_signals,
        "V-DASHA",
        f"Current dasha is {data['current_dasha']['mahadasha']['lord']} / {data['current_dasha']['antardasha']['lord']}.",
        5,
    )
    if data["yogas"]:
        _append_signal(
            growth_signals,
            "V-YOGA-1",
            f"Yoga emphasis begins with {data['yogas'][0]['name']}.",
            3,
        )
    _append_signal(
        growth_signals,
        "V-NATAL-KETU",
        f"Ketu in house {planets['Ketu']['house']} suggests detachment and karmic pressure.",
        2,
    )
    areas.append(
        _build_area(
            "Growth and karmic pressure",
            "This card highlights the deeper lesson running underneath the surface story. It points to the chapter of life that is active now, what it is trying to teach, and where the person may feel pressure to mature, release, or reorient.",
            growth_signals,
        )
    )

    if report_type != "personality":
        transit = data["transit_snapshots"]
        timeline_signals = []
        _append_signal(
            timeline_signals,
            f"V-TRANSIT-{transit[0]['date']}-MOON",
            f"The beginning of this period is more emotional and reactive, so first impressions and mood shifts matter more at the start.",
            3,
        )
        _append_signal(
            timeline_signals,
            f"V-TRANSIT-{transit[len(transit)//2]['date']}-MERCURY",
            f"The middle of the period asks for clearer thinking, better timing in communication, and more attention to details or decisions.",
            3,
        )
        _append_signal(
            timeline_signals,
            f"V-TRANSIT-{transit[-1]['date']}-SATURN",
            f"The closing phase feels slower and more serious, pushing the person to become practical about what can actually last.",
            4,
        )
        areas.append(
            _build_area(
                "Timing and momentum",
                "This card explains how the period develops over time instead of treating the forecast like one flat mood. It shows what changes first, what needs adjustment in the middle, and what becomes more serious or solid by the end.",
                timeline_signals,
            )
        )

    return _top_areas(areas)


def _western_areas(data: dict, report_type: str) -> list[dict]:
    planets = data["planets"]
    aspects = data["aspects"]
    areas = []

    identity_signals = []
    _append_signal(identity_signals, "W-ASC", f"Ascendant in {data['ascendant']['sign']} shapes first impression.", 4)
    _append_signal(identity_signals, "W-NATAL-SUN", f"Sun in {planets['Sun']['sign']} house {planets['Sun']['house']} speaks to identity.", 4)
    _append_signal(identity_signals, "W-NATAL-MOON", f"Moon in {planets['Moon']['sign']} house {planets['Moon']['house']} shapes feeling life.", 4)
    areas.append(
        _build_area(
            "Identity and temperament",
            f"{data['ascendant']['sign']} rising with Sun in {planets['Sun']['sign']} and Moon in {planets['Moon']['sign']} creates a layered personality signature. This card is showing how identity, emotional life, and outward style combine in a way other people can actually feel.",
            identity_signals,
        )
    )

    relationship_signals = []
    _append_signal(relationship_signals, "W-NATAL-VENUS", f"Venus in house {planets['Venus']['house']} shapes attraction and values.", 4)
    _append_signal(relationship_signals, "W-NATAL-MARS", f"Mars in house {planets['Mars']['house']} shows pursuit and tension.", 3)
    if aspects:
        _append_signal(
            relationship_signals,
            "W-ASPECT-1",
            f"Closest aspect is {aspects[0]['planets'][0]} {aspects[0]['aspect']} {aspects[0]['planets'][1]}.",
            3,
        )
    areas.append(
        _build_area(
            "Relationships and emotional bonds",
            "This card is about the relationship atmosphere around the person: how attraction works, where friction appears, and what kind of emotional pattern tends to repeat in close bonds.",
            relationship_signals,
        )
    )

    work_signals = []
    _append_signal(work_signals, "W-MC", f"Midheaven in {data['midheaven']['sign']} points toward public direction.", 5)
    _append_signal(work_signals, "W-NATAL-SATURN", f"Saturn in house {planets['Saturn']['house']} shows work pressure and endurance.", 3)
    _append_signal(work_signals, "W-NATAL-MERCURY", f"Mercury in house {planets['Mercury']['house']} shapes thought and work habits.", 3)
    areas.append(
        _build_area(
            "Work and direction",
            "This card is showing how career direction becomes visible in the outer world. It points to whether progress comes through discipline, reputation, communication, or sustained responsibility.",
            work_signals,
        )
    )

    growth_signals = []
    _append_signal(growth_signals, "W-HOUSES", data["house_system"], 2)
    _append_signal(growth_signals, "W-NATAL-JUPITER", f"Jupiter in house {planets['Jupiter']['house']} shows faith and expansion.", 3)
    _append_signal(growth_signals, "W-NATAL-PLUTO", f"Pluto in house {planets['Pluto']['house']} points to deep transformation.", 4)
    areas.append(
        _build_area(
            "Growth and deeper lessons",
            "This card points to the deeper life lesson underneath current events. It shows where growth asks for maturity, where old patterns are being outgrown, and where transformation may feel unavoidable.",
            growth_signals,
        )
    )

    if report_type != "personality":
        transit = data["transit_snapshots"]
        timeline_signals = []
        _append_signal(timeline_signals, f"W-TRANSIT-{transit[0]['date']}-MOON", "The opening phase is more emotional and reactive, so first impressions and mood changes shape the tone early on.", 3)
        _append_signal(timeline_signals, f"W-TRANSIT-{transit[len(transit)//2]['date']}-VENUS", "The middle phase is softer and more relational, so cooperation, attraction, or value-based choices matter more here.", 3)
        _append_signal(timeline_signals, f"W-TRANSIT-{transit[-1]['date']}-SATURN", "The closing phase becomes more realistic and demanding, making long-term consequences harder to ignore.", 4)
        areas.append(
            _build_area(
                "Timing and momentum",
                "This card explains how the forecast changes as time moves forward. It helps the user see when a period is emotional first, smoother in the middle, or heavier and more serious by the end.",
                timeline_signals,
            )
        )

    return _top_areas(areas)


def _numerology_areas(data: dict, report_type: str) -> list[dict]:
    core = data["core_numbers"]
    areas = []

    identity_signals = []
    _append_signal(identity_signals, "N-CORE-LIFE-PATH", f"Life Path {core['life_path']} is the backbone of the reading.", 5)
    _append_signal(identity_signals, "N-CORE-EXPRESSION", f"Expression {core['expression']} shows how the person tends to move in the world.", 4)
    _append_signal(identity_signals, "N-CORE-PERSONALITY", f"Personality {core['personality']} shapes first impression.", 3)
    areas.append(
        _build_area(
            "Identity and temperament",
            "The numerology profile is strongest when life path, expression, and personality are read together rather than in isolation.",
            identity_signals,
        )
    )

    relationship_signals = []
    _append_signal(relationship_signals, "N-CORE-SOUL-URGE", f"Soul Urge {core['soul_urge']} points to inner emotional needs.", 5)
    _append_signal(relationship_signals, "N-CORE-PERSONALITY", f"Personality {core['personality']} shapes how others first receive them.", 3)
    areas.append(
        _build_area(
            "Relationships and emotional bonds",
            "The relationship story is strongest where inner need and outer presentation either support each other or pull apart.",
            relationship_signals,
        )
    )

    work_signals = []
    _append_signal(work_signals, "N-CORE-EXPRESSION", f"Expression {core['expression']} points to talent and vocational style.", 4)
    _append_signal(work_signals, "N-CORE-BIRTHDAY", f"Birthday {core['birthday']} adds a natural working gift.", 3)
    areas.append(
        _build_area(
            "Work and direction",
            "The work signature in numerology comes from talent expression plus the natural gift shown by the birthday number.",
            work_signals,
        )
    )

    growth_signals = []
    if report_type == "personality":
        _append_signal(growth_signals, "N-CORE-LIFE-PATH", f"Life Path {core['life_path']} sets the long growth arc.", 4)
        _append_signal(growth_signals, "N-CORE-SOUL-URGE", f"Soul Urge {core['soul_urge']} shows the inner pull behind choices.", 4)
    else:
        _append_signal(growth_signals, f"N-CYCLE-{data['calculation_date']}-PERSONAL-YEAR", f"Personal Year {data['cycles']['personal_year']} sets the tone of the current cycle.", 5)
        _append_signal(growth_signals, f"N-CYCLE-{data['calculation_date']}-PERSONAL-MONTH", f"Personal Month {data['cycles']['personal_month']} adds shorter timing.", 3)
    areas.append(
        _build_area(
            "Growth and timing",
            "The growth pattern is shown through long-cycle identity numbers and, for forecasts, the current personal timing cycle.",
            growth_signals,
        )
    )

    return _top_areas(areas)


def _consensus_areas(data: dict, report_type: str) -> list[dict]:
    vedic = _vedic_areas(data["vedic"], report_type)
    western = _western_areas(data["western"], report_type)
    numerology = _numerology_areas(data["numerology"], report_type)
    areas = []
    for title in (
        "Identity and temperament",
        "Relationships and emotional bonds",
        "Work and direction",
        "Growth and deeper lessons",
        "Growth and timing",
        "Timing and momentum",
    ):
        picked = []
        for collection in (vedic, western, numerology):
            match = next((area for area in collection if area["title"] == title), None)
            if match:
                picked.append(match)
        if not picked:
            continue
        merged_signals = []
        for area in picked:
            merged_signals.extend(area["signals"][:2])
        summary = "Cross-system synthesis highlights where multiple traditions point in a similar direction and where they add nuance."
        areas.append(_build_area(title, summary, merged_signals))
    return _top_areas(areas)


def build_synthesis(
    system: str,
    data: dict,
    evidence: dict,
    report_type: str,
    period: str,
    life_area: str = "general",
) -> dict:
    if system == "vedic":
        areas = _vedic_areas(data, report_type)
    elif system == "western":
        areas = _western_areas(data, report_type)
    elif system == "numerology":
        areas = _numerology_areas(data, report_type)
    else:
        areas = _consensus_areas(data, report_type)

    featured_areas = areas[:4]
    average_score = (
        sum(area["score"] for area in featured_areas) // len(featured_areas)
        if featured_areas
        else 0
    )
    overall_confidence = _confidence_from_score(average_score)

    timing_windows = []
    if report_type != "personality":
        timing_windows = [
            {
                "label": "Opening phase",
                "window": period.split(" to ")[0] if " to " in period else period,
                "focus": featured_areas[0]["title"] if featured_areas else "Core themes",
                "confidence": overall_confidence,
            },
            {
                "label": "Middle phase",
                "window": "Mid-period",
                "focus": featured_areas[1]["title"] if len(featured_areas) > 1 else "Adjustment and response",
                "confidence": overall_confidence,
            },
            {
                "label": "Closing phase",
                "window": period.split(" to ")[-1] if " to " in period else period,
                "focus": featured_areas[2]["title"] if len(featured_areas) > 2 else "Integration",
                "confidence": overall_confidence,
            },
        ]

    top_evidence_ids = []
    for area in featured_areas:
        for evidence_id in area["evidence_ids"]:
            if evidence_id in evidence and evidence_id not in top_evidence_ids:
                top_evidence_ids.append(evidence_id)

    focus_area = _focus_area(featured_areas, life_area)
    reality_checks = _build_reality_checks(
        featured_areas, overall_confidence, life_area
    )

    return {
        "overall_confidence": overall_confidence,
        "featured_themes": [area["title"] for area in featured_areas],
        "areas": featured_areas,
        "timing_windows": timing_windows,
        "focus_area": focus_area,
        "reality_checks": reality_checks,
        "top_evidence_ids": top_evidence_ids[:10],
    }


def format_synthesis_for_prompt(synthesis: dict, evidence: dict) -> str:
    lines = [f"Overall confidence: {synthesis['overall_confidence']}"]
    if synthesis.get("focus_area"):
        lines.append(
            f"Focused area: {synthesis['focus_area']['title']} ({synthesis['focus_area']['confidence']} confidence)"
        )
    if synthesis.get("reality_checks"):
        lines.append("Reality checks:")
        for bucket in ("supported", "mixed", "cautions"):
            values = synthesis["reality_checks"].get(bucket, [])
            if values:
                lines.append(f"- {bucket.title()}: " + " ".join(values))
    for area in synthesis["areas"]:
        lines.append(f"- {area['title']} ({area['confidence']} confidence)")
        lines.append(f"  Summary: {area['summary']}")
        for signal in area["signals"][:3]:
            evidence_text = evidence.get(signal["evidence_id"], "")
            lines.append(
                f"  Signal {signal['evidence_id']}: {signal['note']} | {evidence_text}"
            )
    if synthesis["timing_windows"]:
        lines.append("Timing windows:")
        for window in synthesis["timing_windows"]:
            lines.append(
                f"- {window['label']}: {window['window']} | focus: {window['focus']} | confidence: {window['confidence']}"
            )
    return "\n".join(lines)
