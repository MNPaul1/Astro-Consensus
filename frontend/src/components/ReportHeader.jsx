export default function ReportHeader({ name, system, reportType, forecastPeriod }) {
  return (
    <div className="surface-card report-header mx-auto mb-6 max-w-4xl rounded-2xl border p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="report-accent mb-2 text-xs uppercase tracking-[0.24em]">
            {system} system
          </p>
          <h2 className="text-2xl font-bold capitalize sm:text-[1.8rem]">
            {name}&apos;s {reportType} report
          </h2>
          <p className="muted-text mt-1">{forecastPeriod}</p>
        </div>
        <div className="report-accent report-header__mark text-3xl">✦</div>
      </div>
    </div>
  );
}
