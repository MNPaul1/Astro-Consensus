from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import swisseph as swe
from systems.vedic.engines.yoga_engine import detect_yogas
from systems.vedic.engines.transit_engine import get_vedic_transits


SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini",
    "Mrigashira", "Ardra", "Punarvasu", "Pushya",
    "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha",
    "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
    "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]
NAKSHATRA_LORDS = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
]

EXALTATION_SIGNS = {
    "Sun": "Aries",
    "Moon": "Taurus",
    "Mars": "Capricorn",
    "Mercury": "Virgo",
    "Jupiter": "Cancer",
    "Venus": "Pisces",
    "Saturn": "Libra"
}

DEBILITATION_SIGNS = {
    "Sun": "Libra",
    "Moon": "Scorpio",
    "Mars": "Cancer",
    "Mercury": "Pisces",
    "Jupiter": "Capricorn",
    "Venus": "Virgo",
    "Saturn": "Aries"
}
DASHA_YEARS = {
    "Ketu": 7,
    "Venus": 20,
    "Sun": 6,
    "Moon": 10,
    "Mars": 7,
    "Rahu": 18,
    "Jupiter": 16,
    "Saturn": 19,
    "Mercury": 17
}

DASHA_SEQUENCE = [
    "Ketu", "Venus", "Sun", "Moon", "Mars",
    "Rahu", "Jupiter", "Saturn", "Mercury"
]
OWN_SIGNS = {
    "Sun": ["Leo"],
    "Moon": ["Cancer"],
    "Mars": ["Aries", "Scorpio"],
    "Mercury": ["Gemini", "Virgo"],
    "Jupiter": ["Sagittarius", "Pisces"],
    "Venus": ["Taurus", "Libra"],
    "Saturn": ["Capricorn", "Aquarius"]
}
def calculate_nakshatra(longitude):
    nakshatra_size = 360 / 27
    pada_size = nakshatra_size / 4

    nakshatra_index = int(longitude // nakshatra_size)
    pada = int((longitude % nakshatra_size) // pada_size) + 1

    return {
        "nakshatra": NAKSHATRAS[nakshatra_index],
        "pada": pada,
        "lord": NAKSHATRA_LORDS[nakshatra_index]
    }

def calculate_dignity(planet_name, sign):
    if planet_name not in EXALTATION_SIGNS:
        return "Not calculated"

    if EXALTATION_SIGNS[planet_name] == sign:
        return "Exalted"

    if DEBILITATION_SIGNS[planet_name] == sign:
        return "Debilitated"

    if sign in OWN_SIGNS.get(planet_name, []):
        return "Own Sign"

    return "Neutral"

def longitude_to_sign(longitude):
    return SIGNS[int(longitude // 30)]


def degree_in_sign(longitude):
    return round(longitude % 30, 2)


def calculate_house_from_lagna(planet_longitude, ascendant_longitude):
    planet_sign_index = int(planet_longitude // 30)
    asc_sign_index = int(ascendant_longitude // 30)

    house = ((planet_sign_index - asc_sign_index) % 12) + 1

    return house



def calculate_vimshottari_dasha(moon_longitude, birth_datetime, target_datetime=None):
    if target_datetime is None:
        target_datetime = datetime.now(timezone.utc)

    nakshatra_size = 360 / 27
    nakshatra_index = int(moon_longitude // nakshatra_size)

    starting_lord = NAKSHATRA_LORDS[nakshatra_index]

    position_in_nakshatra = moon_longitude % nakshatra_size
    elapsed_fraction = position_in_nakshatra / nakshatra_size

    starting_dasha_years = DASHA_YEARS[starting_lord]
    elapsed_years = starting_dasha_years * elapsed_fraction

    dasha_start = birth_datetime - timedelta(days=elapsed_years * 365.25)
    dasha_end = dasha_start + timedelta(days=starting_dasha_years * 365.25)

    lord_index = DASHA_SEQUENCE.index(starting_lord)

    # Move through Mahadashas until target date
    current_start = dasha_start
    current_end = dasha_end
    current_lord_index = lord_index

    while target_datetime > current_end:
        current_lord_index = (current_lord_index + 1) % len(DASHA_SEQUENCE)
        current_lord = DASHA_SEQUENCE[current_lord_index]
        current_start = current_end
        current_end = current_start + timedelta(days=DASHA_YEARS[current_lord] * 365.25)

    mahadasha_lord = DASHA_SEQUENCE[current_lord_index]

    antardasha = calculate_antardasha(
        mahadasha_lord,
        current_start,
        current_end,
        target_datetime
    )

    return {
        "mahadasha": {
            "lord": mahadasha_lord,
            "start": current_start.date().isoformat(),
            "end": current_end.date().isoformat()
        },
        "antardasha": antardasha
    }


def calculate_antardasha(mahadasha_lord, mahadasha_start, mahadasha_end, target_datetime):
    total_days = (mahadasha_end - mahadasha_start).days

    start_index = DASHA_SEQUENCE.index(mahadasha_lord)
    current_start = mahadasha_start

    for i in range(len(DASHA_SEQUENCE)):
        lord = DASHA_SEQUENCE[(start_index + i) % len(DASHA_SEQUENCE)]

        antardasha_days = total_days * (DASHA_YEARS[lord] / 120)
        current_end = current_start + timedelta(days=antardasha_days)

        if current_start <= target_datetime <= current_end:
            return {
                "lord": lord,
                "start": current_start.date().isoformat(),
                "end": current_end.date().isoformat()
            }

        current_start = current_end

    return None
def calculate_vedic_chart(
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
    birth_datetime = local_birth.astimezone(timezone.utc)
    decimal_hour = (
        birth_datetime.hour
        + birth_datetime.minute / 60
        + birth_datetime.second / 3600
    )
    jd = swe.julday(
        birth_datetime.year,
        birth_datetime.month,
        birth_datetime.day,
        decimal_hour,
    )

    swe.set_sid_mode(swe.SIDM_LAHIRI)
    _, ascmc = swe.houses_ex(
        jd, latitude, longitude, b"W", swe.FLG_SIDEREAL
    )
    ascendant_longitude = ascmc[0]

    planet_ids = {
        "Sun": swe.SUN,
        "Moon": swe.MOON,
        "Mercury": swe.MERCURY,
        "Venus": swe.VENUS,
        "Mars": swe.MARS,
        "Jupiter": swe.JUPITER,
        "Saturn": swe.SATURN,
        "Rahu": swe.TRUE_NODE,
    }
    results = {}

    for name, planet_id in planet_ids.items():
        planet_longitude = swe.calc_ut(jd, planet_id, swe.FLG_SIDEREAL)[0][0]
        results[name] = {
            "longitude": round(planet_longitude, 2),
            "sign": longitude_to_sign(planet_longitude),
            "degree": degree_in_sign(planet_longitude),
            "house": calculate_house_from_lagna(
                planet_longitude, ascendant_longitude
            ),
            "nakshatra": calculate_nakshatra(planet_longitude),
            "dignity": calculate_dignity(
                name, longitude_to_sign(planet_longitude)
            ),
        }

    ketu_longitude = (results["Rahu"]["longitude"] + 180) % 360
    results["Ketu"] = {
        "longitude": round(ketu_longitude, 2),
        "sign": longitude_to_sign(ketu_longitude),
        "degree": degree_in_sign(ketu_longitude),
        "house": calculate_house_from_lagna(
            ketu_longitude, ascendant_longitude
        ),
        "nakshatra": calculate_nakshatra(ketu_longitude),
        "dignity": "Not calculated",
    }

    dasha = calculate_vimshottari_dasha(
        moon_longitude=results["Moon"]["longitude"],
        birth_datetime=birth_datetime,
    )
    chart_data = {
        "ayanamsa": "Lahiri",
        "birth_time": {
            "local": local_birth.isoformat(),
            "utc": birth_datetime.isoformat(),
            "timezone": timezone_name,
        },
        "ascendant": {
            "longitude": round(ascendant_longitude, 2),
            "sign": longitude_to_sign(ascendant_longitude),
            "degree": degree_in_sign(ascendant_longitude),
        },
        "moon_sign": results["Moon"]["sign"],
        "moon_nakshatra": results["Moon"]["nakshatra"],
        "current_dasha": dasha,
        "planets": results,
    }
    chart_data["yogas"] = detect_yogas(chart_data)
    transit_dates = transit_dates or [datetime.now(timezone.utc)]
    chart_data["transit_snapshots"] = [
        {
            "date": transit_date.date().isoformat(),
            "planets": get_vedic_transits(transit_date),
        }
        for transit_date in transit_dates
    ]
    chart_data["current_transits"] = chart_data["transit_snapshots"][0]["planets"]
    return chart_data
