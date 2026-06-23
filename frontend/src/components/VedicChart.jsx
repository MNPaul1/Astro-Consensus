import { useMemo, useState } from "react"

const HOUSE_POSITIONS = {
  1: { x: 50, y: 17 },
  2: { x: 29, y: 12 },
  3: { x: 17, y: 29 },
  4: { x: 12, y: 50 },
  5: { x: 17, y: 71 },
  6: { x: 29, y: 88 },
  7: { x: 50, y: 83 },
  8: { x: 71, y: 88 },
  9: { x: 83, y: 71 },
  10: { x: 88, y: 50 },
  11: { x: 83, y: 29 },
  12: { x: 71, y: 12 },
}

const PLANET_SHORT = {
  Sun: "Su",
  Moon: "Mo",
  Mercury: "Me",
  Venus: "Ve",
  Mars: "Ma",
  Jupiter: "Ju",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
}

const SIGN_SHORT = {
  Aries: "Ar",
  Taurus: "Ta",
  Gemini: "Ge",
  Cancer: "Cn",
  Leo: "Le",
  Virgo: "Vi",
  Libra: "Li",
  Scorpio: "Sc",
  Sagittarius: "Sg",
  Capricorn: "Cp",
  Aquarius: "Aq",
  Pisces: "Pi",
}

const SIGN_ORDER = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
]

const HOUSE_MEANINGS = {
  1: "self, personality, body, approach to life",
  2: "money, speech, family values, stability",
  3: "communication, courage, effort, siblings",
  4: "home, roots, comfort, emotional foundation",
  5: "creativity, romance, children, expression",
  6: "work, health, discipline, daily pressure",
  7: "partnership, commitment, attraction, negotiation",
  8: "transformation, vulnerability, shared resources, intensity",
  9: "belief, travel, learning, meaning",
  10: "career, visibility, reputation, responsibility",
  11: "friends, networks, gains, future goals",
  12: "rest, retreat, endings, inner life",
}

const SIGN_TONES = {
  Aries: "direct, bold, and action-oriented",
  Taurus: "steady, practical, and comfort-seeking",
  Gemini: "curious, verbal, and mentally active",
  Cancer: "protective, feeling-based, and inwardly sensitive",
  Leo: "expressive, proud, and heart-led",
  Virgo: "analytical, precise, and improvement-focused",
  Libra: "relational, balancing, and harmony-seeking",
  Scorpio: "intense, private, and transformational",
  Sagittarius: "expansive, searching, and ideal-driven",
  Capricorn: "disciplined, strategic, and responsibility-aware",
  Aquarius: "independent, future-minded, and unconventional",
  Pisces: "imaginative, receptive, and porous",
}

const PLANET_EFFECTS = {
  Sun: "highlights identity, confidence, purpose, and the need to stand clearly in your own direction",
  Moon: "shapes emotional instinct, comfort needs, memory, and the way experiences settle inside you",
  Mercury: "shows how you think, speak, learn, sort details, and make decisions",
  Venus: "colors affection, attraction, taste, closeness, and what helps life feel more harmonious",
  Mars: "drives action, desire, conflict style, urgency, and the way you push through resistance",
  Jupiter: "expands growth, meaning, opportunity, trust, and the places where life wants wider perspective",
  Saturn: "adds duty, realism, patience, pressure, and long-term lessons that mature slowly",
  Rahu: "intensifies craving, ambition, experimentation, and the life area that feels unusually charged or unfinished",
  Ketu: "brings detachment, karmic memory, instinctive skill, and a place where life may feel strangely familiar or hard to hold",
}

function sortPlanets(planets) {
  const order = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"]
  return [...planets].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
}

function calculateHouseFromAsc(longitude, ascendantLongitude) {
  const planetSignIndex = Math.floor(longitude / 30)
  const ascSignIndex = Math.floor(ascendantLongitude / 30)
  return ((planetSignIndex - ascSignIndex + 12) % 12) + 1
}

function buildHouseData(data) {
  if (!data?.ascendant?.sign || !data?.planets) {
    return []
  }

  const ascendantIndex = SIGN_ORDER.indexOf(data.ascendant.sign)
  if (ascendantIndex === -1) {
    return []
  }

  const planetsByHouse = Object.entries(data.planets).reduce((acc, [name, planet]) => {
    if (!planet?.house) {
      return acc
    }
    acc[planet.house] = acc[planet.house] || []
    acc[planet.house].push({
      name,
      sign: planet.sign,
      degree: planet.degree,
      dignity: planet.dignity,
      nakshatra: planet.nakshatra,
    })
    return acc
  }, {})

  return Array.from({ length: 12 }, (_, index) => {
    const house = index + 1
    const sign = SIGN_ORDER[(ascendantIndex + index) % 12]

    return {
      house,
      sign,
      signShort: SIGN_SHORT[sign] || sign.slice(0, 2),
      planets: sortPlanets(planetsByHouse[house] || []),
      position: HOUSE_POSITIONS[house],
      isAscendant: house === 1,
    }
  })
}

function buildTransitPhaseOptions(data, reportType) {
  const snapshots = data?.transit_snapshots || []
  if (!snapshots.length || reportType === "personality") {
    return []
  }

  const options = [
    { id: "opening", label: "Opening", snapshot: snapshots[0] },
  ]

  if (snapshots.length > 2) {
    options.push({
      id: "middle",
      label: "Middle",
      snapshot: snapshots[Math.floor(snapshots.length / 2)],
    })
  }

  if (snapshots.length > 1) {
    options.push({
      id: "closing",
      label: "Closing",
      snapshot: snapshots[snapshots.length - 1],
    })
  }

  return options.filter(
    (option, index, list) =>
      list.findIndex((entry) => entry.snapshot?.date === option.snapshot?.date) === index,
  )
}

function buildTransitHouseData(data, snapshot) {
  if (!data?.ascendant?.sign || typeof data?.ascendant?.longitude !== "number" || !snapshot?.planets) {
    return []
  }

  const ascendantIndex = SIGN_ORDER.indexOf(data.ascendant.sign)
  if (ascendantIndex === -1) {
    return []
  }

  const planetsByHouse = Object.entries(snapshot.planets).reduce((acc, [name, planet]) => {
    if (typeof planet?.longitude !== "number") {
      return acc
    }

    const house = calculateHouseFromAsc(planet.longitude, data.ascendant.longitude)
    acc[house] = acc[house] || []
    acc[house].push({
      name,
      sign: planet.sign,
      degree: planet.degree,
      transit: true,
    })
    return acc
  }, {})

  return Array.from({ length: 12 }, (_, index) => {
    const house = index + 1
    const sign = SIGN_ORDER[(ascendantIndex + index) % 12]

    return {
      house,
      sign,
      signShort: SIGN_SHORT[sign] || sign.slice(0, 2),
      planets: sortPlanets(planetsByHouse[house] || []),
      position: HOUSE_POSITIONS[house],
      isAscendant: house === 1,
    }
  })
}

function defaultActiveLayer(data, reportType) {
  const snapshots = data?.transit_snapshots || []
  if (reportType !== "personality" && snapshots.length) {
    return "opening"
  }
  return "natal"
}

function buildHouseNarrative(house) {
  const tone = SIGN_TONES[house.sign] || "distinctive"
  return `House ${house.house} speaks to ${HOUSE_MEANINGS[house.house]}. With ${house.sign} here, this area tends to express itself in a ${tone} way.`
}

function buildPlanetNarrative(planet, houseSign) {
  const effect = PLANET_EFFECTS[planet.name] || "adds emphasis to this part of life"
  if (planet.transit) {
    return `${planet.name} is currently moving through ${planet.sign} and activating this house. In forecast work, that means this area of life is temporarily carrying more movement, attention, or pressure. Through ${houseSign}, it tends to show up with a ${SIGN_TONES[planet.sign] || "particular"} tone.`
  }
  const dignityText =
    planet.dignity && planet.dignity !== "Not calculated"
      ? ` Its condition is ${planet.dignity.toLowerCase()}, which changes how smoothly that energy tends to operate.`
      : ""
  const nakshatraText = planet.nakshatra?.nakshatra
    ? ` In nakshatra terms, ${planet.name} expresses through ${planet.nakshatra.nakshatra} pada ${planet.nakshatra.pada}.`
    : ""

  return `${planet.name} in ${planet.sign} in this house ${effect}. In ${houseSign}, it comes through with a ${SIGN_TONES[planet.sign] || "particular"} tone.${dignityText}${nakshatraText}`
}

export default function VedicChart({ data, reportType = "personality" }) {
  const natalHouses = useMemo(() => buildHouseData(data), [data])
  const transitPhases = useMemo(() => buildTransitPhaseOptions(data, reportType), [data, reportType])
  const [activeLayer, setActiveLayer] = useState(() => defaultActiveLayer(data, reportType))
  const [activeHouse, setActiveHouse] = useState(1)

  const activePhase = transitPhases.find((phase) => phase.id === activeLayer) || null
  const houses = activePhase ? buildTransitHouseData(data, activePhase.snapshot) : natalHouses

  if (!houses.length) {
    return null
  }

  const selectedHouse = houses.find((house) => house.house === activeHouse) || houses[0]
  const houseYogas = activePhase ? [] : (data.yogas || []).filter((yoga) => yoga.house === selectedHouse.house)
  const isTransitView = Boolean(activePhase)

  return (
    <section className="vedic-chart surface-card mx-auto mb-6 max-w-4xl rounded-[1.75rem] border p-5 sm:p-6">
      <div className="vedic-chart__header">
        <div>
          <p className="insight-eyebrow">Vedic birth chart</p>
          <h3 className="vedic-chart__title">
            {isTransitView ? "Natal chart with forecast transits" : "Real sidereal natal chart"}
          </h3>
        </div>
        <p className="vedic-chart__copy">
          {isTransitView
            ? "The natal chart stays fixed. What changes here are the transiting planets moving through your natal houses for this forecast phase."
            : "This chart is built from the exact birth data using Lahiri ayanamsa and whole-sign houses."}
        </p>
      </div>

      {transitPhases.length ? (
        <div className="vedic-chart__layer-tabs">
          <button
            type="button"
            onClick={() => setActiveLayer("natal")}
            className={activeLayer === "natal" ? "selected-option rounded-full border px-4 py-2 text-sm" : "option-button rounded-full border px-4 py-2 text-sm"}
          >
            Natal foundation
          </button>
          {transitPhases.map((phase) => (
            <button
              key={phase.id}
              type="button"
              onClick={() => setActiveLayer(phase.id)}
              className={activeLayer === phase.id ? "selected-option rounded-full border px-4 py-2 text-sm" : "option-button rounded-full border px-4 py-2 text-sm"}
            >
              {phase.label} transit
            </button>
          ))}
        </div>
      ) : null}

      <div className="vedic-chart__frame">
        <div className="vedic-chart__aurora" aria-hidden="true" />
        <div
          className="vedic-chart__spotlight"
          aria-hidden="true"
          style={{
            left: `${selectedHouse.position.x}%`,
            top: `${selectedHouse.position.y}%`,
          }}
        />
        <svg
          className="vedic-chart__lines"
          viewBox="0 0 100 100"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <rect x="4" y="4" width="92" height="92" rx="2" />
          <line x1="4" y1="4" x2="96" y2="96" />
          <line x1="96" y1="4" x2="4" y2="96" />
          <line x1="50" y1="4" x2="96" y2="50" />
          <line x1="96" y1="50" x2="50" y2="96" />
          <line x1="50" y1="96" x2="4" y2="50" />
          <line x1="4" y1="50" x2="50" y2="4" />
          <line x1="18" y1="18" x2="82" y2="18" />
          <line x1="82" y1="18" x2="82" y2="82" />
          <line x1="82" y1="82" x2="18" y2="82" />
          <line x1="18" y1="82" x2="18" y2="18" />
        </svg>

        <div className="vedic-chart__center">
          <span className="vedic-chart__ayanamsa">{data.ayanamsa}</span>
          <strong>{data.ascendant.sign} Lagna</strong>
          <span>{data.moon_nakshatra?.nakshatra || "Nakshatra"} Moon</span>
        </div>

        {houses.map((houseData) => (
          <button
            key={houseData.house}
            type="button"
            className={`vedic-house ${houseData.isAscendant ? "vedic-house--asc" : ""} ${activeHouse === houseData.house ? "vedic-house--active" : ""}`}
            style={{
              left: `${houseData.position.x}%`,
              top: `${houseData.position.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onMouseEnter={() => setActiveHouse(houseData.house)}
            onFocus={() => setActiveHouse(houseData.house)}
            onClick={() => setActiveHouse(houseData.house)}
            aria-pressed={activeHouse === houseData.house}
            aria-label={`House ${houseData.house}, sign ${houseData.sign}`}
          >
            <div className="vedic-house__meta">
              <span className="vedic-house__number">H{houseData.house}</span>
              <span className="vedic-house__sign">{houseData.signShort}</span>
            </div>

            <div className="vedic-house__planets">
              {houseData.planets.length ? (
                houseData.planets.map((planet) => (
                  <div key={`${houseData.house}-${planet.name}`} className="vedic-house__planet">
                    <span className="vedic-house__planet-name">
                      {planet.transit ? `T${PLANET_SHORT[planet.name] || planet.name.slice(0, 2)}` : (PLANET_SHORT[planet.name] || planet.name.slice(0, 2))}
                    </span>
                    <span className="vedic-house__planet-degree">{planet.degree}°</span>
                  </div>
                ))
              ) : (
                <span className="vedic-house__empty">-</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="vedic-chart__reading surface-card mt-4 rounded-2xl border p-4">
        <div className="vedic-chart__reading-header">
          <div>
            <p className="insight-eyebrow">{isTransitView ? "Forecast focus" : "Focused house"}</p>
            <h4 className="vedic-chart__reading-title">
              House {selectedHouse.house} in {selectedHouse.sign}
              {selectedHouse.isAscendant ? " | Ascendant house" : ""}
            </h4>
          </div>
          <span className="theme-pill rounded-full border px-4 py-2 text-sm">
            {selectedHouse.planets.length
              ? `${selectedHouse.planets.length} placement${selectedHouse.planets.length > 1 ? "s" : ""}`
              : "No natal planets"}
          </span>
        </div>

        <p className="vedic-chart__reading-copy">
          {isTransitView && activePhase
            ? `${buildHouseNarrative(selectedHouse)} This view is anchored to the ${activePhase.label.toLowerCase()} phase on ${activePhase.snapshot.date}, so you are seeing where the transiting planets are pressing on the natal chart at that part of the forecast.`
            : buildHouseNarrative(selectedHouse)}
        </p>

        <div className="vedic-chart__reading-planets">
          {selectedHouse.planets.length ? (
            selectedHouse.planets.map((planet) => (
              <div key={`${selectedHouse.house}-${planet.name}`} className="vedic-chart__reading-planet">
                <div className="vedic-chart__reading-topline">
                  <strong>{planet.name}</strong>
                  <span>
                    {planet.sign} {planet.degree}°
                  </span>
                </div>
                <p className="vedic-chart__reading-detail">
                  {buildPlanetNarrative(planet, selectedHouse.sign)}
                </p>
                <div className="vedic-chart__reading-meta">
                  {!planet.transit ? (
                    <span className="theme-pill rounded-full border px-3 py-1 text-xs">
                      {planet.dignity}
                    </span>
                  ) : null}
                  {!planet.transit && planet.nakshatra?.nakshatra ? (
                    <span className="theme-pill rounded-full border px-3 py-1 text-xs">
                      {planet.nakshatra.nakshatra} pada {planet.nakshatra.pada}
                    </span>
                  ) : null}
                  {planet.transit ? (
                    <span className="theme-pill rounded-full border px-3 py-1 text-xs">
                      Transit influence
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="vedic-chart__reading-empty">
              {isTransitView
                ? "No major transit planet is landing in this natal house at this forecast checkpoint, so this area is less activated right now than the houses carrying transit placements."
                : "This house is quieter in the natal chart, so it is read more through the sign on the house, its ruler, and the current timing periods than through a direct natal planet placement."}
            </div>
          )}
        </div>

        {houseYogas.length ? (
          <div className="vedic-chart__yogas">
            <p className="insight-eyebrow">Special pattern in this house</p>
            {houseYogas.map((yoga) => (
              <div key={`${selectedHouse.house}-${yoga.name}`} className="vedic-chart__yoga-card">
                <strong>{yoga.name}</strong>
                <p>
                  This yoga links {yoga.planets.join(" and ")} here, adding extra emphasis to how this house behaves in your life.
                </p>
                <span className="theme-pill rounded-full border px-3 py-1 text-xs">
                  {yoga.strength}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="vedic-chart__legend">
        <span className="theme-pill rounded-full border px-4 py-2 text-sm">
          Ascendant: {data.ascendant.sign} {data.ascendant.degree} deg
        </span>
        <span className="theme-pill rounded-full border px-4 py-2 text-sm">
          Moon: {data.moon_sign} | {data.moon_nakshatra?.nakshatra} pada {data.moon_nakshatra?.pada}
        </span>
        <span className="theme-pill rounded-full border px-4 py-2 text-sm">
          Dasha: {data.current_dasha?.mahadasha?.lord} / {data.current_dasha?.antardasha?.lord}
        </span>
        {activePhase ? (
          <span className="theme-pill rounded-full border px-4 py-2 text-sm">
            Transit checkpoint: {activePhase.snapshot.date}
          </span>
        ) : null}
      </div>
    </section>
  )
}
