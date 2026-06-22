import ReactMarkdown from "react-markdown";

import CosmicStage from "./CosmicStage";
import PlanetaryMap from "./PlanetaryMap";
import ReportHeader from "./ReportHeader";
import ThemePills from "./ThemePills";

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

export default function ReportViewer({ reportData }) {
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

  if (!reportData?.report) {
    return (
      <section className="flex min-h-[420px] items-center justify-center p-6 lg:h-full">
        <div className="max-w-md text-center">
          <div className="mb-4 text-4xl">✦</div>
          <h2 className="mb-2 text-2xl font-semibold">Generate Your Reading</h2>
          <p className="muted-text">
            Choose a system, enter accurate birth details, and ask a focused question.
          </p>
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

        <div className="stage-reveal stage-reveal--4 info-note mx-auto mb-4 max-w-4xl rounded-xl border px-4 py-3 text-sm">
          The positions and numbers below are calculated. The written interpretation is AI-assisted and reflects traditional, non-scientific practices.
        </div>

        <div className="stage-reveal stage-reveal--5">
          <PlanetaryMap
            key={reportData.report}
            report={reportData.report}
            themes={reportData.themes}
            system={reportData.system}
            data={reportData.data}
          />
        </div>

        <article className="stage-reveal stage-reveal--6 report-prose surface-card prose mx-auto max-w-4xl rounded-[1.75rem] border p-5 sm:p-8 lg:p-10">
          <div className="report-prose__beam" aria-hidden="true" />
          <ReactMarkdown components={markdownComponents}>
            {formatReportMarkdown(reportData.report)}
          </ReactMarkdown>
        </article>

        <details className="stage-reveal stage-reveal--7 surface-card mx-auto mt-5 max-w-4xl rounded-xl border p-4">
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

        <details className="stage-reveal stage-reveal--8 surface-card mx-auto mt-3 max-w-4xl rounded-xl border p-4">
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
