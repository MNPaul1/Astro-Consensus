import { useMemo, useState } from "react";

function titleCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildNarrative(system, data) {
  if (system === "vedic") {
    return {
      title: "How to read this Vedic chart",
      description:
        "This panel shows the real building blocks behind your Vedic reading. The rising sign sets the overall life lens, the Moon sign and nakshatra show emotional pattern and inner wiring, the planets show which life areas carry the most weight, and the current dasha shows the chapter of life you are moving through now. You do not need to memorize the technical terms here. The goal is to see what the reading is based on and which signals are strongest.",
      chips: [
        `${data.ascendant.sign} rising lens`,
        `${data.moon_sign} emotional pattern`,
        `${data.current_dasha.mahadasha.lord} current life chapter`,
      ],
    };
  }

  if (system === "western") {
    return {
      title: "How Western astrology works here",
      description:
        "This reading uses tropical zodiac positions, Placidus houses where available, major aspects, and a chart cast from the exact local birth time translated into UTC. It reads chart geometry, house emphasis, and current transit snapshots together.",
      chips: [
        data.zodiac,
        data.house_system,
        `${data.ascendant.sign} rising`,
      ],
    };
  }

  if (system === "numerology") {
    return {
      title: "How numerology works here",
      description:
        "This reading uses Pythagorean numerology calculated directly from the name and birth date. Core numbers describe the longer identity pattern, while cycle values like personal year and month shape the current timing layer.",
      chips: [
        data.method,
        `Life Path ${data.core_numbers.life_path}`,
        `Expression ${data.core_numbers.expression}`,
      ],
    };
  }

  return {
    title: "How consensus works here",
    description:
      "Consensus compares the strongest deterministic signals from Vedic astrology, Western astrology, and numerology. The reading is strongest where systems converge and more cautious where they disagree or emphasize different life areas.",
    chips: [
      `${data.vedic.ascendant.sign} Vedic rising`,
      `${data.western.ascendant.sign} Western rising`,
      `Life Path ${data.numerology.core_numbers.life_path}`,
    ],
  };
}

function buildChartRows(system, data) {
  if (system === "vedic") {
    return Object.entries(data.planets).map(([name, planet]) => ({
      label: name,
      value: `${planet.sign} ${planet.degree}°, House ${planet.house}`,
      note: planet.dignity,
    }));
  }

  if (system === "western") {
    return Object.entries(data.planets).map(([name, planet]) => ({
      label: name,
      value: `${planet.sign} ${planet.degree}°, House ${planet.house}`,
      note: planet.retrograde ? "Retrograde" : "Direct",
    }));
  }

  if (system === "numerology") {
    return Object.entries(data.core_numbers).map(([name, value]) => ({
      label: titleCase(name),
      value: String(value),
      note: "Core number",
    }));
  }

  return [
    {
      label: "Vedic rising",
      value: `${data.vedic.ascendant.sign} ${data.vedic.ascendant.degree}°`,
      note: data.vedic.ayanamsa,
    },
    {
      label: "Western rising",
      value: `${data.western.ascendant.sign} ${data.western.ascendant.degree}°`,
      note: data.western.house_system,
    },
    {
      label: "Life Path",
      value: String(data.numerology.core_numbers.life_path),
      note: data.numerology.method,
    },
  ];
}

function buildExtraRows(system, data) {
  if (system === "vedic") {
    return data.yogas.slice(0, 4).map((yoga) => ({
      title: yoga.name,
      body: `${yoga.planets.join(", ")} | strength ${yoga.strength}`,
    }));
  }

  if (system === "western") {
    return data.aspects.slice(0, 5).map((aspect) => ({
      title: `${aspect.planets[0]} ${titleCase(aspect.aspect)} ${aspect.planets[1]}`,
      body: `Orb ${aspect.orb}°`,
    }));
  }

  if (system === "numerology") {
    return Object.entries(data.cycles).map(([name, value]) => ({
      title: titleCase(name),
      body: `Current cycle value ${value}`,
    }));
  }

  return [
    {
      title: "Cross-system agreement",
      body: "Use the confidence map above to see where multiple systems reinforce each other.",
    },
  ];
}

export default function SystemInsights({ system, data }) {
  const [tab, setTab] = useState("chart");

  const narrative = useMemo(() => buildNarrative(system, data), [system, data]);
  const chartRows = useMemo(() => buildChartRows(system, data), [system, data]);
  const extraRows = useMemo(() => buildExtraRows(system, data), [system, data]);

  return (
    <section className="surface-card mx-auto mb-6 max-w-4xl rounded-[1.75rem] border p-5 sm:p-6">
      <div className="system-insights__header">
        <div>
          <p className="insight-eyebrow">Behind the reading</p>
          <h3 className="system-insights__title">{narrative.title}</h3>
        </div>
        <div className="system-insights__tabs">
          {["chart", "method"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={tab === value ? "selected-option rounded-full border px-4 py-2 text-sm" : "option-button rounded-full border px-4 py-2 text-sm"}
            >
              {value === "chart" ? "Chart signals" : "What this means"}
            </button>
          ))}
        </div>
      </div>

      {tab === "method" ? (
        <div className="system-insights__method">
          <p className="system-insights__copy">{narrative.description}</p>
          <div className="system-insights__chips">
            {narrative.chips.map((chip) => (
              <span key={chip} className="theme-pill rounded-full border px-4 py-2 text-sm">
                {chip}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="system-insights__layout">
          <div className="system-insights__table">
            {chartRows.map((row) => (
              <div key={row.label} className="system-insights__row">
                <div>
                  <p className="system-insights__label">{row.label}</p>
                  <p className="system-insights__note">{row.note}</p>
                </div>
                <strong className="system-insights__value">{row.value}</strong>
              </div>
            ))}
          </div>
          <div className="system-insights__aside">
            {extraRows.map((row) => (
              <div key={row.title} className="system-insights__card">
                <p className="system-insights__card-title">{row.title}</p>
                <p className="system-insights__card-copy">{row.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
