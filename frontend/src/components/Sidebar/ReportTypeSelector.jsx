export default function ReportTypeSelector({
  reportType,
  setReportType,
  types = ["personality", "daily", "weekly", "monthly", "yearly"],
}) {

  return (
    <div className="mb-3">
      <h3 className="muted-text mb-2 text-sm">Report Type</h3>

      <div className="grid grid-cols-2 gap-2">
        {types.map((type) => (
          <button
            type="button"
            key={type}
            onClick={() => setReportType(type)}
            className={`
              p-2 rounded-lg border
              transition-all
              ${
                reportType === type
                  ? "selected-option"
                  : "option-button"
              }
            `}
          >
            {type[0].toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
