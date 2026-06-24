function currentYearMonths() {
  const year = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(year, index, 1);
    return {
      value: `${year}-${String(index + 1).padStart(2, "0")}-01`,
      label: date.toLocaleString(undefined, { month: "long", year: "numeric" }),
    };
  });
}

const MONTH_OPTIONS = currentYearMonths();

export default function ForecastWindowSelector({
  reportType,
  forecastDate,
  setForecastDate,
}) {
  if (reportType === "personality" || reportType === "yearly") {
    return null;
  }

  const minDate = `${new Date().getFullYear()}-01-01`;
  const maxDate = `${new Date().getFullYear()}-12-31`;

  if (reportType === "monthly") {
    return (
      <div className="mb-3">
        <h3 className="muted-text mb-2 text-sm">Forecast Month</h3>
        <select
          value={forecastDate}
          onChange={(event) => setForecastDate(event.target.value)}
          className="input-field-compact"
        >
          {MONTH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const label = reportType === "daily" ? "Forecast Date" : "Week Starting";
  const hint = reportType === "daily"
    ? "Pick the exact day you want the reading to target."
    : "Pick the day this 7-day forecast should begin from.";

  return (
    <div className="mb-3">
      <h3 className="muted-text mb-2 text-sm">{label}</h3>
      <input
        type="date"
        min={minDate}
        max={maxDate}
        value={forecastDate}
        onChange={(event) => setForecastDate(event.target.value)}
        className="input-field-compact"
      />
      <p className="muted-text mt-2 text-xs">{hint}</p>
    </div>
  );
}
