import { useEffect, useMemo, useState } from "react";

const PLANET_STYLES = {
  Sun: "planet-node--sun",
  Moon: "planet-node--moon",
  Mercury: "planet-node--mercury",
  Venus: "planet-node--venus",
  Mars: "planet-node--mars",
  Jupiter: "planet-node--jupiter",
  Saturn: "planet-node--saturn",
};

const PLANET_ORDER = ["Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

function extractEvidenceIds(text) {
  const matches = text.match(/\[([A-Z][A-Z0-9-]+)\]/g) || [];
  return [...new Set(matches.map((match) => match.slice(1, -1)))].slice(0, 4);
}

function toPlainText(markdown) {
  return markdown
    .replace(/`/g, "")
    .replace(/\[([A-Z][A-Z0-9-]+)\]/g, "")
    .replace(/[*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseReportSections(report) {
  return report
    .split(/^##\s+/m)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lines = part.split("\n");
      const title = lines[0].trim();
      const body = lines.slice(1).join("\n").trim();
      const plainText = toPlainText(body);

      return {
        title,
        body,
        preview:
          plainText.slice(0, 240).trim() + (plainText.length > 240 ? "..." : ""),
        evidenceIds: extractEvidenceIds(body),
      };
    })
    .filter((section) => section.body);
}

function getPlanetLongitudeMap(system, data) {
  if (!data) {
    return {};
  }

  const source =
    system === "consensus"
      ? data.western?.planets || data.vedic?.planets
      : data.planets;

  if (!source) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(source)
      .filter(([, value]) => typeof value?.longitude === "number")
      .map(([name, value]) => [name, value.longitude]),
  );
}

function numerologyPlanetPositions(data) {
  const core = data?.core_numbers;
  if (!core) {
    return {};
  }

  const values = [
    core.life_path,
    core.expression,
    core.soul_urge,
    core.personality,
    core.birthday,
    data?.cycles?.personal_year || core.life_path,
  ];

  return Object.fromEntries(
    PLANET_ORDER.map((planet, index) => [
      planet,
      ((values[index] || index + 1) * 27 + index * 31) % 360,
    ]),
  );
}

function buildPositionMap(system, data) {
  if (system === "numerology") {
    return numerologyPlanetPositions(data);
  }

  return getPlanetLongitudeMap(system, data);
}

function buildNodes(report, themes, system, data) {
  const sections = parseReportSections(report).slice(0, PLANET_ORDER.length);
  const positions = buildPositionMap(system, data);

  return sections.map((section, index) => {
    const planet = PLANET_ORDER[index];
    const longitude =
      typeof positions[planet] === "number"
        ? positions[planet]
        : (index * 360) / PLANET_ORDER.length;
    const angle = longitude - 90;
    const radius = index % 2 === 0 ? 152 : 104;
    const speed = 8 + index * 2.2;

    return {
      ...section,
      theme: themes?.[index] || section.title,
      planet,
      className: PLANET_STYLES[planet],
      angle,
      radius,
      speed,
    };
  });
}

export default function PlanetaryMap({ report, themes, system, data }) {
  const nodes = useMemo(
    () => buildNodes(report, themes, system, data),
    [report, themes, system, data],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let frameId = 0;
    let startTime = 0;

    function animate(timestamp) {
      if (!startTime) {
        startTime = timestamp;
      }
      setTime((timestamp - startTime) / 1000);
      frameId = window.requestAnimationFrame(animate);
    }

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  if (!nodes.length) {
    return null;
  }

  const activeNode = nodes[activeIndex] || nodes[0];

  return (
    <section className="planetary-map surface-card mx-auto mb-6 max-w-4xl rounded-[1.75rem] border p-5 sm:p-6">
      <div className="planetary-map__header">
        <div>
          <p className="planetary-map__eyebrow">Interactive life map</p>
          <h3 className="planetary-map__title">Live orbit navigator</h3>
        </div>
        <p className="planetary-map__hint">
          The planets now orbit as a living scene. Click any one to open the part
          of the reading it currently holds.
        </p>
      </div>

      <div className="planetary-map__layout">
        <div className="orbit-system" aria-label="Planetary reading navigator">
          <div className="orbit-system__ring orbit-system__ring--outer" />
          <div className="orbit-system__ring orbit-system__ring--inner" />
          <div className="orbit-system__starfield" aria-hidden="true" />
          <div className="orbit-system__core">
            <span className="orbit-system__core-symbol">Sun</span>
          </div>

          {nodes.map((node, index) => {
            const liveAngle = ((node.angle + time * node.speed) * Math.PI) / 180;
            const x = Math.cos(liveAngle) * node.radius;
            const y = Math.sin(liveAngle) * node.radius;

            return (
              <div
                key={`${node.planet}-${node.title}`}
                className="planet-orbit"
                style={{
                  left: "50%",
                  top: "50%",
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                }}
              >
              <button
                type="button"
                className={[
                  "planet-node",
                  node.className,
                  activeIndex === index ? "planet-node--active" : "",
                ].join(" ")}
                onClick={() => setActiveIndex(index)}
                aria-pressed={activeIndex === index}
                aria-label={`${node.planet}: ${node.title}`}
              >
                <span className="planet-node__planet">{node.planet}</span>
                <span className="planet-node__theme">{node.theme}</span>
              </button>
              </div>
            );
          })}
        </div>

        <div className="planetary-panel">
          <div className="planetary-panel__chip-row">
            <span className="planetary-panel__chip">{activeNode.planet}</span>
            <span className="planetary-panel__chip planetary-panel__chip--soft">
              {activeNode.theme}
            </span>
          </div>

          <h4 className="planetary-panel__title">{activeNode.title}</h4>
          <p className="planetary-panel__copy">{activeNode.preview}</p>

          {activeNode.evidenceIds.length > 0 ? (
            <div className="planetary-panel__evidence">
              {activeNode.evidenceIds.map((id) => (
                <span key={id} className="citation-badge">
                  [{id}]
                </span>
              ))}
            </div>
          ) : null}

          <p className="planetary-panel__footer">
            This view is animated for exploration, but the content still comes
            from the same generated reading and cited evidence below.
          </p>
        </div>
      </div>
    </section>
  );
}
