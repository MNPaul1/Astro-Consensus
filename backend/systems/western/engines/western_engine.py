from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import swisseph as swe


SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

PLANETS = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mercury": swe.MERCURY,
    "Venus": swe.VENUS,
    "Mars": swe.MARS,
    "Jupiter": swe.JUPITER,
    "Saturn": swe.SATURN,
    "Uranus": swe.URANUS,
    "Neptune": swe.NEPTUNE,
    "Pluto": swe.PLUTO,
    "North Node": swe.TRUE_NODE,
}

ASPECTS = {
    "conjunction": (0, 8),
    "sextile": (60, 5),
    "square": (90, 7),
    "trine": (120, 7),
    "opposition": (180, 8),
}


def zodiac_position(longitude):
    return {
        "longitude": round(longitude, 2),
        "sign": SIGNS[int(longitude // 30)],
        "degree": round(longitude % 30, 2),
    }


def house_for_longitude(longitude, cusps):
    for index, start in enumerate(cusps):
        end = cusps[(index + 1) % 12]
        if (longitude - start) % 360 < (end - start) % 360:
            return index + 1
    return 12


def calculate_aspects(planets):
    aspects = []
    names = list(planets)
    for left_index, left_name in enumerate(names):
        for right_name in names[left_index + 1:]:
            separation = abs(
                planets[left_name]["longitude"] - planets[right_name]["longitude"]
            )
            separation = min(separation, 360 - separation)
            for aspect_name, (angle, orb) in ASPECTS.items():
                distance = abs(separation - angle)
                if distance <= orb:
                    aspects.append({
                        "planets": [left_name, right_name],
                        "aspect": aspect_name,
                        "orb": round(distance, 2),
                    })
                    break
    return sorted(aspects, key=lambda item: item["orb"])


def calculate_western_chart(
    year,
    month,
    day,
    hour,
    minute,
    latitude,
    longitude,
    timezone_name,
    transit_dates=None,
):
    local_birth = datetime(
        year, month, day, hour, minute, tzinfo=ZoneInfo(timezone_name)
    )
    utc_birth = local_birth.astimezone(timezone.utc)
    decimal_hour = utc_birth.hour + utc_birth.minute / 60
    jd = swe.julday(
        utc_birth.year, utc_birth.month, utc_birth.day, decimal_hour
    )

    try:
        cusps, ascmc = swe.houses_ex(jd, latitude, longitude, b"P")
        house_system = "Placidus"
    except swe.Error:
        cusps, ascmc = swe.houses_ex(jd, latitude, longitude, b"W")
        house_system = "Whole Sign (Placidus unavailable at this latitude)"
    planets = {}
    for name, planet_id in PLANETS.items():
        position = swe.calc_ut(jd, planet_id)[0]
        planets[name] = {
            **zodiac_position(position[0]),
            "house": house_for_longitude(position[0], cusps),
            "retrograde": position[3] < 0,
        }

    transit_dates = transit_dates or [datetime.now(timezone.utc)]
    transit_snapshots = []
    for transit_date in transit_dates:
        current_jd = swe.julday(
            transit_date.year,
            transit_date.month,
            transit_date.day,
            transit_date.hour + transit_date.minute / 60,
        )
        transit_snapshots.append({
            "date": transit_date.date().isoformat(),
            "planets": {
                name: zodiac_position(swe.calc_ut(current_jd, planet_id)[0][0])
                for name, planet_id in PLANETS.items()
            },
        })

    return {
        "zodiac": "Tropical",
        "house_system": house_system,
        "birth_time": {
            "local": local_birth.isoformat(),
            "utc": utc_birth.isoformat(),
            "timezone": timezone_name,
        },
        "ascendant": zodiac_position(ascmc[0]),
        "midheaven": zodiac_position(ascmc[1]),
        "house_cusps": [
            {"house": index + 1, **zodiac_position(cusp)}
            for index, cusp in enumerate(cusps)
        ],
        "planets": planets,
        "aspects": calculate_aspects(planets),
        "transit_snapshots": transit_snapshots,
        "current_transits": transit_snapshots[0]["planets"],
    }
