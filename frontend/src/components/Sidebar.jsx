import { useEffect, useMemo, useState } from "react";

import { searchLocations } from "../../services/api";
import BirthForm from "./Sidebar/BirthForm";
import ForecastWindowSelector from "./Sidebar/ForecastWindowSelector";
import GenerateButton from "./Sidebar/GenerateButton";
import LifeAreaSelector from "./Sidebar/LifeAreaSelector";
import ReportTypeSelector from "./Sidebar/ReportTypeSelector";
import SystemSelector from "./Sidebar/SystemSelector";

export default function Sidebar({
  workspace = "reading",
  system,
  setSystem,
  reportType,
  setReportType,
  form,
  setForm,
  loading,
  formError,
  setFormError,
  onGenerate,
  onGenerateForecast,
}) {
  const [locationResults, setLocationResults] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setFormError("");
  };

  useEffect(() => {
    const query = form.birthplace.trim();
    if (query.length < 2 || form.latitude !== "") {
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLocationLoading(true);
      try {
        setLocationResults(await searchLocations(query, controller.signal));
      } catch (error) {
        if (error.name !== "CanceledError") {
          setLocationResults([]);
          setFormError("City search is unavailable. Please try again.");
        }
      } finally {
        setLocationLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.birthplace, form.latitude, setFormError]);

  const handleBirthplaceChange = (event) => {
    setForm((current) => ({
      ...current,
      birthplace: event.target.value,
      latitude: "",
      longitude: "",
      timezone: "",
    }));
    setLocationResults([]);
    setLocationLoading(false);
    setFormError("");
  };

  const selectLocation = (location) => {
    setForm((current) => ({
      ...current,
      birthplace: location.label,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    }));
    setLocationResults([]);
    setLocationLoading(false);
    setFormError("");
  };

  const requiresAstrology = system !== "numerology";
  const isComplete = useMemo(() => {
    const required = ["name", "day", "month", "year"];
    if (requiresAstrology) {
      required.push("hour", "minute", "latitude", "longitude", "timezone");
    }
    return required.every((field) => String(form[field]).trim() !== "");
  }, [form, requiresAstrology]);

  const forecastMode = workspace === "forecast";
  const reportTypes = forecastMode
    ? ["daily", "weekly", "monthly", "yearly"]
    : ["personality", "daily", "weekly", "monthly", "yearly"];

  return (
    <aside className="app-sidebar border-b p-3 backdrop-blur-xl lg:flex lg:h-full lg:w-auto lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-4">
      <div className="mx-auto max-w-5xl lg:max-w-none">
        <div className="mb-5">
          <h2 className="text-xl font-bold">
            {forecastMode ? "Forecast Studio" : "Create Reading"}
          </h2>
          <p className="muted-text mt-1 text-sm">
            {forecastMode
              ? "Choose a system, forecast window, and life area, then explore weekly, monthly, or yearly timing from its own workspace."
              : "Enter the birth data once, then use the consultation bar above to ask a focused question or open the chart view."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1">
          <SystemSelector system={system} setSystem={setSystem} />
          <ReportTypeSelector
            reportType={reportType}
            setReportType={setReportType}
            types={reportTypes}
          />
          {forecastMode ? (
            <>
              <ForecastWindowSelector
                reportType={reportType}
                forecastDate={form.forecastDate}
                setForecastDate={(value) =>
                  setForm((current) => ({ ...current, forecastDate: value }))
                }
              />
              <LifeAreaSelector
                lifeArea={form.lifeArea}
                setLifeArea={(value) =>
                  setForm((current) => ({ ...current, lifeArea: value }))
                }
              />
            </>
          ) : null}
        </div>

        <BirthForm
          form={form}
          handleChange={handleChange}
          handleBirthplaceChange={handleBirthplaceChange}
          locationResults={locationResults}
          locationLoading={locationLoading}
          selectLocation={selectLocation}
          requiresAstrology={requiresAstrology}
        />
        {formError && <p className="error-text mb-3 text-sm">{formError}</p>}
        <GenerateButton
          loading={loading}
          disabled={!isComplete}
          onGenerate={forecastMode ? onGenerateForecast : onGenerate}
          label={forecastMode ? "Generate Forecast" : "Generate Report"}
          loadingLabel={forecastMode ? "Calculating the forecast..." : "Calculating and writing..."}
        />
      </div>
    </aside>
  );
}
