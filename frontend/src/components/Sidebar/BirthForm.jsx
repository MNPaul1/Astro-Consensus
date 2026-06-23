export default function BirthForm({
  form,
  handleChange,
  handleBirthplaceChange,
  locationResults,
  locationLoading,
  selectLocation,
  requiresAstrology,
}) {
  return (
    <div className="mb-4">
      <h3 className="muted-text mb-2 text-[11px] uppercase tracking-wider">
        Birth Information
      </h3>

      <div className="space-y-2">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Full name"
          autoComplete="name"
          className="input-field-compact"
          required
        />

        <div className="grid grid-cols-3 gap-2">
          <input name="year" type="number" min="1900" max="2100" value={form.year} onChange={handleChange} placeholder="Year" className="input-field-compact" />
          <input name="month" type="number" min="1" max="12" value={form.month} onChange={handleChange} placeholder="Month" className="input-field-compact" />
          <input name="day" type="number" min="1" max="31" value={form.day} onChange={handleChange} placeholder="Day" className="input-field-compact" />
        </div>

        {requiresAstrology && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <input name="hour" type="number" min="0" max="23" value={form.hour} onChange={handleChange} placeholder="Hour (0-23)" className="input-field-compact" />
              <input name="minute" type="number" min="0" max="59" value={form.minute} onChange={handleChange} placeholder="Minute" className="input-field-compact" />
            </div>

            <div className="relative">
              <input
                name="birthplace"
                value={form.birthplace}
                onChange={handleBirthplaceChange}
                placeholder="Birth city, e.g. Vancouver"
                autoComplete="off"
                className="input-field-compact"
              />
              {locationLoading && (
                <span className="muted-text absolute right-3 top-2.5 text-xs">
                  Searching...
                </span>
              )}
              {locationResults.length > 0 && (
                <div className="location-menu absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border shadow-xl">
                  {locationResults.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => selectLocation(location)}
                      className="location-option block w-full border-b px-3 py-2 text-left text-sm last:border-0"
                    >
                      {location.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {form.latitude !== "" && (
              <p className="success-note rounded-lg border px-3 py-2 text-xs">
                Location selected. Coordinates and historical timezone will be
                calculated automatically.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
