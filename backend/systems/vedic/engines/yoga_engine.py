def detect_yogas(chart):

    yogas = []

    planets = chart["planets"]

    sun = planets["Sun"]
    mercury = planets["Mercury"]
    moon = planets["Moon"]
    jupiter = planets["Jupiter"]

    # Budha Aditya Yoga
    if sun["house"] == mercury["house"]:
        separation = abs(sun["longitude"] - mercury["longitude"])
        separation = min(separation, 360 - separation)
        yogas.append({
    "name": "Budha Aditya Yoga",
    "planets": [
        "Sun",
        "Mercury"
    ],
    "house": sun["house"],
    "sign": sun["sign"],
    "orb": round(separation, 2),
    "strength": "Strong" if separation <= 8 else "Moderate"
})

    # Gajakesari Yoga (simplified)
    house_diff = (jupiter["house"] - moon["house"]) % 12

    if house_diff in [0, 3, 6, 9]:
        yogas.append({
    "name": "Gajakesari Yoga",
    "planets": [
        "Moon",
        "Jupiter"
    ],
    "relative_house": house_diff + 1,
    "strength": "Traditional configuration"
})

    return yogas
