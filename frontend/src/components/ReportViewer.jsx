import ReactMarkdown from "react-markdown";

import CosmicStage from "./CosmicStage";
import PlanetaryMap from "./PlanetaryMap";
import ReportHeader from "./ReportHeader";
import SystemInsights from "./SystemInsights";
import ThemePills from "./ThemePills";
import VedicChart from "./VedicChart";

const markdownComponents = {
  h2: ({ children }) => <h2 className="reading-heading">{children}</h2>,
  h3: ({ children }) => <h3 className="reading-subheading">{children}</h3>,
  p: ({ children }) => <p className="reading-paragraph">{children}</p>,
  ul: ({ children }) => <ul className="reading-list">{children}</ul>,
  ol: ({ children }) => <ol className="reading-list reading-list-numbered">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="reading-callout">{children}</blockquote>
  ),
  strong: ({ children }) => <strong className="reading-strong">{children}</strong>,
  code: ({ children }) => <code className="citation-badge">{children}</code>,
};

function formatReportMarkdown(report) {
  return report.replace(/\[([A-Z][A-Z0-9-]+)\]/g, "`[$1]`");
}

function confidenceLabel(confidence) {
  if (!confidence) {
    return "Mixed";
  }
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function confidenceMeaning(confidence) {
  if (confidence === "high") {
    return "Many chart signals point the same way";
  }
  if (confidence === "moderate") {
    return "Some strong signals are present, with a little nuance";
  }
  return "This is a lighter pattern, so read it more openly";
}

function areaLabel(title) {
  const labels = {
    "Identity and temperament": "Your core nature",
    "Relationships and emotional bonds": "Love and relationships",
    "Work and direction": "Career and direction",
    "Growth and karmic pressure": "Growth and life lessons",
    "Growth and deeper lessons": "Growth and deeper lessons",
    "Growth and timing": "Growth and timing",
    "Timing and momentum": "Timing and momentum",
  };
  return labels[title] || title;
}

function evidenceLabel(evidenceId, evidenceMap) {
  return evidenceMap?.[evidenceId] || evidenceId;
}

function lifeAreaLabel(lifeArea) {
  const labels = {
    general: "General focus",
    love: "Love and relationships",
    career: "Career and direction",
    money: "Money and stability",
    family: "Family and home life",
    growth: "Growth and inner work",
  };
  return labels[lifeArea] || "General focus";
}

function reportTypeLabel(reportType) {
  const labels = {
    personality: "overall reading",
    daily: "daily timing",
    weekly: "weekly timing",
    monthly: "monthly timing",
    yearly: "yearly timing",
  };
  return labels[reportType] || reportType;
}

function focusAreaSummary(focusArea) {
  if (!focusArea?.title) {
    return null;
  }
  return `${areaLabel(focusArea.title)} looks like the strongest center of gravity in this reading.`;
}

const QUESTION_SYSTEMS = ["vedic", "western", "numerology", "consensus"];
const QUESTION_TYPES = ["overall", "daily", "weekly", "yearly"];

function CosmicLoader({ loadingStatus }) {
  const recentEvents = (loadingStatus?.events || []).slice(-4).reverse();

  return (
    <section className="flex min-h-[420px] items-center justify-center p-6 lg:h-full">
      <div className="cosmic-loader w-full max-w-2xl p-6 sm:p-8">
        <div className="cosmic-loader__scene" aria-hidden="true">
          <div className="cosmic-loader__sun" />
          <div className="cosmic-loader__orbit cosmic-loader__orbit--one">
            <span className="cosmic-loader__planet cosmic-loader__planet--gold" />
          </div>
          <div className="cosmic-loader__orbit cosmic-loader__orbit--two">
            <span className="cosmic-loader__planet cosmic-loader__planet--violet" />
          </div>
          <div className="cosmic-loader__orbit cosmic-loader__orbit--three">
            <span className="cosmic-loader__planet cosmic-loader__planet--blue" />
          </div>
        </div>

        <div className="cosmic-loader__copy">
          <p className="insight-eyebrow">Generating your reading</p>
          <h2 className="cosmic-loader__title">The chart is being read now</h2>
          <p className="cosmic-loader__text">
            {loadingStatus?.stage || "Pulling together placements, timing, and interpretation."}
          </p>
          <div className="cosmic-loader__status">
            <span className="theme-pill rounded-full border px-4 py-2 text-sm">
              {loadingStatus?.active_model
                ? `Current model: ${loadingStatus.active_model}`
                : "Waiting for model selection"}
            </span>
          </div>
        </div>

        <div className="cosmic-loader__events">
          {recentEvents.length ? recentEvents.map((event, index) => (
            <div key={`${event.timestamp}-${index}`} className="cosmic-loader__event">
              <span className={`cosmic-loader__event-dot cosmic-loader__event-dot--${event.type || "stage"}`} />
              <p>{event.message}</p>
            </div>
          )) : (
            <div className="cosmic-loader__event">
              <span className="cosmic-loader__event-dot cosmic-loader__event-dot--stage" />
              <p>Preparing the request and aligning the chart data.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function ReportViewer({
  reportData,
  loading,
  loadingStatus,
  onQuestionVariant,
  workspace = "reading",
}) {
  if (reportData?.error) {
    return (
      <section className="flex min-h-[420px] items-center justify-center p-6 lg:h-full">
        <div className="error-card max-w-lg rounded-2xl border p-6 text-center">
          <h2 className="error-title mb-2 text-xl font-semibold">Report unavailable</h2>
          <p className="error-copy text-sm">{reportData.error}</p>
        </div>
      </section>
    );
  }

  if (loading && !reportData) {
    return <CosmicLoader loadingStatus={loadingStatus} />;
  }

  if (!reportData?.report) {
    if (reportData?.chart_only && reportData?.data) {
      return (
        <section className="min-h-[420px] overflow-visible p-4 sm:p-5 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:p-8">
          <div className="report-stage">
            <div className="stage-reveal stage-reveal--1">
              <CosmicStage
                name={reportData.name}
                system={reportData.system}
                reportType="chart view"
                forecastPeriod="Deterministic calculation mode"
                themeCount={0}
                evidenceCount={0}
              />
            </div>

            <div className="stage-reveal stage-reveal--2">
              <ReportHeader
                name={reportData.name}
                system={reportData.system}
                reportType="chart"
                forecastPeriod="Based on the provided birth data"
              />
            </div>

            <div className="stage-reveal stage-reveal--3 info-note mx-auto mb-4 max-w-4xl rounded-xl border px-4 py-3 text-sm">
              This view shows real deterministic chart or numerology output without the long written interpretation.
            </div>

            {reportData.system === "vedic" ? (
              <div className="stage-reveal stage-reveal--4">
                <VedicChart
                  key={`${reportData.system}-${reportData.report_type}-${reportData.data?.birth_time?.utc || "chart"}`}
                  data={reportData.data}
                  reportType={reportData.report_type}
                />
              </div>
            ) : null}

            <div className="stage-reveal stage-reveal--4">
              <SystemInsights system={reportData.system} data={reportData.data} />
            </div>

            <details className="stage-reveal stage-reveal--5 surface-card mx-auto mt-3 max-w-4xl rounded-xl border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                View raw calculation data
              </summary>
              <pre className="muted-text mt-4 overflow-x-auto whitespace-pre-wrap text-xs">
                {JSON.stringify(reportData.data, null, 2)}
              </pre>
            </details>
          </div>
        </section>
      );
    }

    return (
      <section className="flex min-h-[420px] items-center justify-center p-6 lg:h-full">
        <div className="empty-state-card surface-card max-w-xl rounded-[1.6rem] border px-8 py-10 text-center">
          <div className="empty-state-card__mark">✦</div>
          <h2 className="mb-3 text-[2rem] font-semibold tracking-[-0.02em]">
            {workspace === "forecast" ? "Open Forecast Studio" : "Generate Your Reading"}
          </h2>
          <p className="muted-text mx-auto max-w-lg text-[0.98rem] leading-7">
            {workspace === "forecast"
              ? "Use the forecast controls on the left to explore a specific daily, weekly, monthly, or yearly window."
              : "Choose a system, enter accurate birth details, and ask a focused question."}
          </p>
          <div className="empty-state-card__tips">
            <span>Pick a system</span>
            <span>Add birth details</span>
            <span>Generate a grounded reading</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[420px] overflow-visible p-4 sm:p-5 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:p-8">
      <div className="report-stage">
        <div className="stage-reveal stage-reveal--1">
          <CosmicStage
            name={reportData.name}
            system={reportData.system}
            reportType={reportData.report_type}
            forecastPeriod={reportData.forecast_period}
            themeCount={reportData.themes?.length || 0}
            evidenceCount={Object.keys(reportData.evidence || {}).length}
          />
        </div>

        <div className="stage-reveal stage-reveal--2">
          <ReportHeader
            name={reportData.name}
            system={reportData.system}
            reportType={reportData.report_type}
            forecastPeriod={reportData.forecast_period}
          />
        </div>

        <div className="stage-reveal stage-reveal--3">
          <ThemePills themes={reportData.themes} />
        </div>

        <section className="stage-reveal stage-reveal--4 mx-auto mb-4 flex max-w-4xl flex-wrap gap-3">
          <div className="theme-pill rounded-full border px-4 py-2 text-sm">
            Focus: {lifeAreaLabel(reportData.life_area)}
          </div>
          <div className="theme-pill rounded-full border px-4 py-2 text-sm">
            Mode: {reportTypeLabel(reportData.report_type)}
          </div>
        </section>

        <div className="stage-reveal stage-reveal--4 info-note mx-auto mb-4 max-w-4xl rounded-xl border px-4 py-3 text-sm">
          The positions and numbers below are calculated. The written interpretation is AI-assisted and reflects traditional, non-scientific practices.
        </div>

        {reportData.question_mode && reportData.question ? (
          <section className="stage-reveal stage-reveal--5 surface-card mx-auto mb-6 max-w-4xl rounded-[1.6rem] border p-5">
            <p className="insight-eyebrow">Question mode</p>
            <h3 className="system-insights__title">Asked question</h3>
            <p className="system-insights__copy mt-3">{reportData.question}</p>

            <div className="question-switcher mt-4">
              <div className="question-switcher__group">
                <p className="question-switcher__label">System</p>
                <div className="question-switcher__buttons">
                  {QUESTION_SYSTEMS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        onQuestionVariant({
                          nextSystem: value,
                          nextDisplayType: reportData.question_display_type || "overall",
                        })
                      }
                      className={
                        reportData.system === value
                          ? "selected-option rounded-full border px-4 py-2 text-sm"
                          : "option-button rounded-full border px-4 py-2 text-sm"
                      }
                    >
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="question-switcher__group">
                <p className="question-switcher__label">Frame</p>
                <div className="question-switcher__buttons">
                  {QUESTION_TYPES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        onQuestionVariant({
                          nextSystem: reportData.system,
                          nextDisplayType: value,
                        })
                      }
                      className={
                        (reportData.question_display_type || "overall") === value
                          ? "selected-option rounded-full border px-4 py-2 text-sm"
                          : "option-button rounded-full border px-4 py-2 text-sm"
                      }
                    >
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <div className="stage-reveal stage-reveal--5">
          <PlanetaryMap
            key={reportData.report}
            report={reportData.report}
            themes={reportData.themes}
            system={reportData.system}
            data={reportData.data}
          />
        </div>

        {(reportData.confidence || reportData.insight_map?.length || reportData.timing_windows?.length) ? (
          <section className="stage-reveal stage-reveal--6 mx-auto mb-6 grid max-w-4xl gap-4">
            <div className="surface-card rounded-2xl border p-5">
              <div className="insight-header">
                <div>
                  <p className="insight-eyebrow">Reading confidence</p>
                  <h3 className="insight-title">What looks strongest in this reading</h3>
                </div>
                <span className={`confidence-pill confidence-pill--${reportData.confidence || "speculative"}`}>
                  {confidenceLabel(reportData.confidence)}
                </span>
              </div>
              <p className="muted-text mt-3 text-sm">
                This is a trust layer based on how many chart or numerology signals point in the same direction before the AI writes the report.
              </p>
              {reportData.focus_area ? (
                <p className="muted-text mt-3 text-sm">
                  {focusAreaSummary(reportData.focus_area)}
                </p>
              ) : null}
            </div>

            {reportData.reality_checks?.supported?.length
              || reportData.reality_checks?.mixed?.length
              || reportData.reality_checks?.cautions?.length ? (
                <div className="surface-card rounded-2xl border p-5">
                  <p className="insight-eyebrow">Reality filter</p>
                  <h3 className="insight-title">How to read this report honestly</h3>
                  <div className="reality-grid mt-4">
                    {reportData.reality_checks?.supported?.length ? (
                      <div className="reality-card reality-card--supported">
                        <p className="reality-card__title">Strongly supported</p>
                        {reportData.reality_checks.supported.map((item) => (
                          <p key={item} className="reality-card__copy">{item}</p>
                        ))}
                      </div>
                    ) : null}
                    {reportData.reality_checks?.mixed?.length ? (
                      <div className="reality-card reality-card--mixed">
                        <p className="reality-card__title">More mixed</p>
                        {reportData.reality_checks.mixed.map((item) => (
                          <p key={item} className="reality-card__copy">{item}</p>
                        ))}
                      </div>
                    ) : null}
                    {reportData.reality_checks?.cautions?.length ? (
                      <div className="reality-card reality-card--caution">
                        <p className="reality-card__title">Keep in mind</p>
                        {reportData.reality_checks.cautions.map((item) => (
                          <p key={item} className="reality-card__copy">{item}</p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

            {reportData.timing_windows?.length ? (
              <div className="surface-card rounded-2xl border p-5">
                <p className="insight-eyebrow">Timing map</p>
                <div className="timeline-grid mt-4">
                  {reportData.timing_windows.map((window) => (
                    <div key={window.label} className="timeline-card">
                      <p className="timeline-label">{window.label}</p>
                      <h4 className="timeline-focus">{window.focus}</h4>
                      <p className="timeline-window">{window.window}</p>
                      <p className="timeline-confidence">{confidenceLabel(window.confidence)} confidence</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {reportData.transit_calendar?.length ? (
              <div className="surface-card rounded-2xl border p-5">
                <p className="insight-eyebrow">Transit calendar</p>
                <div className="insight-header">
                  <div>
                    <h3 className="insight-title">How the period may unfold step by step</h3>
                    <p className="muted-text mt-2 text-sm">
                      This is a clean timing view centered on your selected focus, so you can see how the tone may open, build, and settle across the period.
                    </p>
                  </div>
                </div>
                <div className="timeline-grid mt-4">
                  {reportData.transit_calendar.map((entry) => (
                    <div key={`${entry.label}-${entry.date}`} className="timeline-card transit-card">
                      <p className="timeline-label">{entry.label}</p>
                      <h4 className="timeline-focus">{entry.title}</h4>
                      <p className="timeline-window">{entry.date}</p>
                      <p className="timeline-copy">{entry.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {reportData.insight_map?.length ? (
              <div className="insight-grid">
                <div className="surface-card rounded-2xl border p-5 md:col-span-2">
                  <p className="insight-eyebrow">Reading map</p>
                  <h3 className="insight-title">What these 4 cards are showing</h3>
                  <p className="muted-text mt-3 text-sm">
                    These cards break the reading into the four life areas that look most active or important in your chart right now. The confidence line shows how strongly the underlying signals support each area.
                  </p>
                </div>
                {reportData.insight_map.map((area) => (
                  <div key={area.title} className="surface-card insight-card rounded-2xl border p-5">
                    <div className="insight-summary">
                      <div>
                        <p className="insight-card__eyebrow">{areaLabel(area.title)}</p>
                        <h4 className="insight-card__confidence">{confidenceLabel(area.confidence)} confidence</h4>
                      </div>
                      <span className="insight-summary__hint">Why this is showing up</span>
                    </div>
                    <p className="insight-card__copy">{area.summary}</p>
                    <p className="muted-text mt-2 text-xs">{confidenceMeaning(area.confidence)}</p>
                    <p className="muted-text mt-3 text-xs">
                      Key signals behind this theme:
                    </p>
                    <div className="insight-signal-list">
                      {area.signals?.map((signal) => (
                        <div key={`${area.title}-${signal.evidence_id}`} className="insight-signal">
                          <div className="insight-signal__content">
                            <p>{signal.note}</p>
                            <p className="insight-signal__evidence">
                              {evidenceLabel(signal.evidence_id, reportData.evidence)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {reportData.data ? (
          <div className="stage-reveal stage-reveal--6">
            <SystemInsights system={reportData.system} data={reportData.data} />
          </div>
        ) : null}

        <article className="stage-reveal stage-reveal--7 report-prose surface-card prose mx-auto max-w-4xl rounded-[1.75rem] border p-5 sm:p-8 lg:p-10">
          <div className="report-prose__beam" aria-hidden="true" />
          <ReactMarkdown components={markdownComponents}>
            {formatReportMarkdown(reportData.report)}
          </ReactMarkdown>
        </article>
        {reportData.ai_model ? (
          <div className="stage-reveal stage-reveal--7 mx-auto mt-2 flex max-w-4xl justify-end">
            <p className="report-meta text-xs">
              Report written by: <span>{reportData.ai_model}</span>
            </p>
          </div>
        ) : null}

        <details className="stage-reveal stage-reveal--8 surface-card mx-auto mt-5 max-w-4xl rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            View cited evidence catalog
          </summary>
          <dl className="muted-text mt-4 space-y-2 text-xs">
            {Object.entries(reportData.evidence || {}).map(([id, value]) => (
              <div key={id} className="evidence-row grid gap-1 border-b pb-2 sm:grid-cols-[180px_1fr]">
                <dt className="accent-text font-mono">{id}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </details>

        <details className="stage-reveal stage-reveal--9 surface-card mx-auto mt-3 max-w-4xl rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            View raw calculation data
          </summary>
          <pre className="muted-text mt-4 overflow-x-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(reportData.data, null, 2)}
          </pre>
        </details>
      </div>
    </section>
  );
}
