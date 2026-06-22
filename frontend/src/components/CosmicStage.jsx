function formatLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function CosmicStage({
  name,
  system,
  reportType,
  forecastPeriod,
  themeCount,
  evidenceCount,
}) {
  return (
    <section className="cosmic-stage surface-card mx-auto mb-6 max-w-4xl overflow-hidden rounded-[1.75rem] border">
      <div className="cosmic-stage__backdrop" aria-hidden="true">
        <div className="cosmic-stage__ring cosmic-stage__ring--outer" />
        <div className="cosmic-stage__ring cosmic-stage__ring--mid" />
        <div className="cosmic-stage__ring cosmic-stage__ring--inner" />
        <div className="cosmic-stage__planet cosmic-stage__planet--sun" />
        <div className="cosmic-stage__planet cosmic-stage__planet--moon" />
        <div className="cosmic-stage__planet cosmic-stage__planet--venus" />
        <div className="cosmic-stage__planet cosmic-stage__planet--mars" />
        <div className="cosmic-stage__grid" />
      </div>

      <div className="cosmic-stage__content">
        <p className="cosmic-stage__eyebrow">
          {formatLabel(system)} reading
        </p>

        <div className="cosmic-stage__headline-row">
          <div>
            <h2 className="cosmic-stage__title">
              {name}&apos;s {formatLabel(reportType)}
            </h2>
            <p className="cosmic-stage__subtitle">
              A richer reading shaped from calculated chart evidence and presented
              as a guided interpretation.
            </p>
          </div>

          <div className="cosmic-stage__sigil" aria-hidden="true">
            <span>✦</span>
          </div>
        </div>

        <div className="cosmic-stage__meta">
          <div className="cosmic-stat">
            <span className="cosmic-stat__label">Forecast window</span>
            <strong className="cosmic-stat__value">{forecastPeriod}</strong>
          </div>
          <div className="cosmic-stat">
            <span className="cosmic-stat__label">Themes surfaced</span>
            <strong className="cosmic-stat__value">{themeCount}</strong>
          </div>
          <div className="cosmic-stat">
            <span className="cosmic-stat__label">Evidence anchors</span>
            <strong className="cosmic-stat__value">{evidenceCount}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
