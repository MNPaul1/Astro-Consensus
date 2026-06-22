import swisseph as swe
from datetime import datetime, timezone

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

def longitude_to_sign(longitude: float) -> str:
    return SIGNS[int(longitude // 30)]

def degree_in_sign(longitude: float) -> float:
    return round(longitude % 30, 2)

def get_vedic_transits(at_datetime=None):
    now = at_datetime or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    now = now.astimezone(timezone.utc)

    decimal_hour = now.hour + now.minute / 60 + now.second / 3600

    jd = swe.julday(
        now.year,
        now.month,
        now.day,
        decimal_hour
    )

    swe.set_sid_mode(swe.SIDM_LAHIRI)

    planets = {
        "Sun": swe.SUN,
        "Moon": swe.MOON,
        "Mercury": swe.MERCURY,
        "Venus": swe.VENUS,
        "Mars": swe.MARS,
        "Jupiter": swe.JUPITER,
        "Saturn": swe.SATURN,
        "Rahu": swe.TRUE_NODE
    }

    results = {}

    for name, planet in planets.items():
        pos = swe.calc_ut(jd, planet, swe.FLG_SIDEREAL)
        longitude = pos[0][0]

        results[name] = {
            "longitude": round(longitude, 2),
            "sign": longitude_to_sign(longitude),
            "degree": degree_in_sign(longitude)
        }

    rahu_longitude = results["Rahu"]["longitude"]
    ketu_longitude = (rahu_longitude + 180) % 360

    results["Ketu"] = {
        "longitude": round(ketu_longitude, 2),
        "sign": longitude_to_sign(ketu_longitude),
        "degree": degree_in_sign(ketu_longitude)
    }

    return results


def get_current_vedic_transits():
    return get_vedic_transits()
