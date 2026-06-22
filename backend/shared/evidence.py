import re

from shared.ai_client import AIClientError


def _slug(value):
    return re.sub(r"[^A-Z0-9]+", "-", value.upper()).strip("-")


def build_evidence(system, data, report_type):
    evidence = {}

    def add_vedic(chart):
        evidence["V-ASC"] = (
            f"Vedic ascendant: {chart['ascendant']['sign']} "
            f"{chart['ascendant']['degree']} degrees"
        )
        evidence["V-MOON"] = (
            f"Vedic Moon: {chart['moon_sign']}; nakshatra "
            f"{chart['moon_nakshatra']['nakshatra']}, pada "
            f"{chart['moon_nakshatra']['pada']}"
        )
        dasha = chart["current_dasha"]
        evidence["V-DASHA"] = (
            f"Vimshottari period: {dasha['mahadasha']['lord']} mahadasha "
            f"and {dasha['antardasha']['lord']} antardasha"
        )
        for name, planet in chart["planets"].items():
            evidence[f"V-NATAL-{_slug(name)}"] = (
                f"Vedic {name}: {planet['sign']} {planet['degree']} degrees, "
                f"house {planet['house']}, dignity {planet['dignity']}"
            )
        for index, yoga in enumerate(chart["yogas"], start=1):
            evidence[f"V-YOGA-{index}"] = (
                f"{yoga['name']}: {', '.join(yoga['planets'])}; "
                f"strength {yoga['strength']}"
            )
        if report_type != "personality":
            _add_transits(evidence, "V", chart["transit_snapshots"], "Vedic")

    def add_western(chart):
        evidence["W-ASC"] = (
            f"Western ascendant: {chart['ascendant']['sign']} "
            f"{chart['ascendant']['degree']} degrees"
        )
        evidence["W-MC"] = (
            f"Western Midheaven: {chart['midheaven']['sign']} "
            f"{chart['midheaven']['degree']} degrees"
        )
        evidence["W-HOUSES"] = f"Western house system: {chart['house_system']}"
        for name, planet in chart["planets"].items():
            evidence[f"W-NATAL-{_slug(name)}"] = (
                f"Western {name}: {planet['sign']} {planet['degree']} degrees, "
                f"house {planet['house']}, retrograde {planet['retrograde']}"
            )
        for index, aspect in enumerate(chart["aspects"], start=1):
            evidence[f"W-ASPECT-{index}"] = (
                f"{aspect['planets'][0]} {aspect['aspect']} "
                f"{aspect['planets'][1]}, orb {aspect['orb']} degrees"
            )
        if report_type != "personality":
            _add_transits(evidence, "W", chart["transit_snapshots"], "Western")

    def add_numerology(numbers):
        for name, value in numbers["core_numbers"].items():
            evidence[f"N-CORE-{_slug(name)}"] = (
                f"Pythagorean {name.replace('_', ' ')} number: {value}"
            )
        if report_type != "personality":
            for snapshot in numbers["cycle_snapshots"]:
                for name, value in snapshot.items():
                    if name != "date":
                        evidence[f"N-CYCLE-{snapshot['date']}-{_slug(name)}"] = (
                            f"Pythagorean {name.replace('_', ' ')} number on "
                            f"{snapshot['date']}: {value}"
                        )

    if system == "vedic":
        add_vedic(data)
    elif system == "western":
        add_western(data)
    elif system == "numerology":
        add_numerology(data)
    else:
        add_vedic(data["vedic"])
        add_western(data["western"])
        add_numerology(data["numerology"])
    return evidence


def _add_transits(evidence, prefix, snapshots, label):
    for snapshot in snapshots:
        for name, planet in snapshot["planets"].items():
            evidence[f"{prefix}-TRANSIT-{snapshot['date']}-{_slug(name)}"] = (
                f"{label} transit on {snapshot['date']}: {name} in "
                f"{planet['sign']} at {planet['degree']} degrees"
            )


def find_report_evidence_ids(report, evidence):
    bracketed = set(re.findall(r"\[([A-Z][A-Z0-9-]+)\]", report))
    found = set()
    for evidence_id in evidence:
        pattern = rf"(?<![A-Z0-9-]){re.escape(evidence_id)}(?![A-Z0-9-])"
        if re.search(pattern, report):
            found.add(evidence_id)
    return found, bracketed - set(evidence)


def validate_report_evidence(report, evidence):
    citations, invalid = find_report_evidence_ids(report, evidence)
    if invalid:
        raise AIClientError(
            "The model cited unsupported evidence: " + ", ".join(sorted(invalid))
        )
    if not citations:
        raise AIClientError(
            "The model did not cite any calculated evidence."
        )
    return citations
