import { useEffect, useMemo, useState } from "react";

import { generateReport, searchLocations } from "../../services/api";
import BirthForm from "./Sidebar/BirthForm";
import GenerateButton from "./Sidebar/GenerateButton";
import ReportTypeSelector from "./Sidebar/ReportTypeSelector";
import SystemSelector from "./Sidebar/SystemSelector";

export default function Sidebar({ setReportData }) {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [system, setSystem] = useState("vedic");
  const [reportType, setReportType] = useState("weekly");
  const [locationResults, setLocationResults] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    day: "",
    month: "",
    year: "",
    hour: "",
    minute: "",
    birthplace: "",
    latitude: "",
    longitude: "",
    timezone: "",
    question: "",
  });

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
  }, [form.birthplace, form.latitude]);

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

  const handleGenerate = async () => {
    if (!isComplete) {
      setFormError("Complete all required birth fields before generating a report.");
      return;
    }

    setLoading(true);
    setFormError("");
    setReportData(null);
    try {
      const payload = {
        name: form.name,
        system,
        year: Number(form.year),
        month: Number(form.month),
        day: Number(form.day),
        report_type: reportType,
        question: form.question,
      };
      if (requiresAstrology) {
        Object.assign(payload, {
          hour: Number(form.hour),
          minute: Number(form.minute),
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          timezone: form.timezone,
        });
      }
      const result = await generateReport(payload);
      setReportData(result);
    } catch (error) {
      const detail = error.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item.msg).join("; ")
        : detail || "Could not reach the backend. Confirm that both servers are running.";
      setReportData({ error: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="app-sidebar border-b p-3 backdrop-blur-xl lg:h-full lg:w-auto lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-4">
      <div className="mx-auto max-w-5xl lg:max-w-none">
        <div className="mb-5">
          <h2 className="text-xl font-bold">Create Reading</h2>
          <p className="muted-text mt-1 text-sm">
            Calculations use the birth time, coordinates, and historical timezone.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1">
          <SystemSelector system={system} setSystem={setSystem} />
          <ReportTypeSelector reportType={reportType} setReportType={setReportType} />
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
        <GenerateButton loading={loading} disabled={!isComplete} onGenerate={handleGenerate} />
      </div>
    </aside>
  );
}
