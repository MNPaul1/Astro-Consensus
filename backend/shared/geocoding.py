import requests


GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"


class LocationLookupError(RuntimeError):
    pass


def search_locations(query, limit=6):
    try:
        response = requests.get(
            GEOCODING_URL,
            params={"name": query, "count": limit, "language": "en", "format": "json"},
            timeout=10,
        )
        response.raise_for_status()
        results = response.json().get("results", [])
    except (requests.RequestException, ValueError, AttributeError) as exc:
        raise LocationLookupError(
            "City search is temporarily unavailable. Please try again."
        ) from exc

    locations = []
    for result in results:
        required = ("id", "name", "latitude", "longitude", "timezone")
        if not all(result.get(field) is not None for field in required):
            continue
        region = result.get("admin1")
        country = result.get("country")
        label_parts = [result["name"]]
        if region and region != result["name"]:
            label_parts.append(region)
        if country:
            label_parts.append(country)
        locations.append(
            {
                "id": result["id"],
                "name": result["name"],
                "label": ", ".join(label_parts),
                "latitude": result["latitude"],
                "longitude": result["longitude"],
                "timezone": result["timezone"],
            }
        )
    return locations
