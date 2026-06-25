import { useEffect, useLayoutEffect, useRef, useState } from "react";

import Header from "../src/components/Header";
import BackgroundGlow from "../src/components/BackgroundGlow";
import Sidebar from "../src/components/Sidebar";
import ReportViewer from "../src/components/ReportViewer";
import { calculateSystem, generateReport, getAiProgress } from "../services/api";

const AI_SETTINGS_STORAGE_KEY = "astro-ai-settings";

function formatDateInput(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function defaultForecastDate(reportType) {
  const now = new Date();
  if (reportType === "monthly") {
    return formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
  }
  return formatDateInput(now);
}

function requiredFieldsComplete(form, system) {
  const required = ["name", "day", "month", "year"];
  if (system !== "numerology") {
    required.push("hour", "minute", "latitude", "longitude", "timezone");
  }
  return required.every((field) => String(form[field] || "").trim() !== "");
}

function buildPayload(form, system, reportType, question) {
  const payload = {
    name: form.name,
    system,
    year: Number(form.year),
    month: Number(form.month),
    day: Number(form.day),
    life_area: form.lifeArea,
    forecast_date:
      reportType === "personality" || reportType === "yearly"
        ? undefined
        : form.forecastDate,
    report_type: reportType,
    question: question.trim(),
  };

  if (system !== "numerology") {
    Object.assign(payload, {
      hour: Number(form.hour),
      minute: Number(form.minute),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      timezone: form.timezone,
    });
  }

  return payload;
}

function loadAiSettings() {
  try {
    const raw = window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        enabled: false,
        baseUrl: "",
        apiKey: "",
        model: "",
      };
    }
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      baseUrl: parsed.baseUrl || "",
      apiKey: parsed.apiKey || "",
      model: parsed.model || "",
    };
  } catch (_error) {
    return {
      enabled: false,
      baseUrl: "",
      apiKey: "",
      model: "",
    };
  }
}

export default function Home() {
  const [reportData, setReportData] = useState(null);
  const [lastReadingData, setLastReadingData] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState("reading");
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [questionOpen, setQuestionOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(null);
  const [formError, setFormError] = useState("");
  const [system, setSystem] = useState("vedic");
  const [reportType, setReportType] = useState("weekly");
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
    lifeArea: "general",
    forecastDate: defaultForecastDate("weekly"),
  });
  const [aiSettings, setAiSettings] = useState(() => loadAiSettings());
  const [theme, setTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem("astro-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  });
  const progressPollRef = useRef(null);
  const progressAbortRef = useRef(null);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("astro-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(aiSettings));
  }, [aiSettings]);

  useEffect(() => {
    if (!roadmapOpen && !settingsOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setRoadmapOpen(false);
        setSettingsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [roadmapOpen, settingsOpen]);

  useEffect(() => {
    setForm((current) => {
      if (reportType === "personality" || reportType === "yearly") {
        return current;
      }
      if (reportType === "monthly") {
        const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(current.forecastDate || "");
        const monthlyDate = match
          ? `${match[1]}-${match[2]}-01`
          : defaultForecastDate("monthly");
        if (monthlyDate === current.forecastDate) {
          return current;
        }
        return { ...current, forecastDate: monthlyDate };
      }
      if (current.forecastDate) {
        return current;
      }
      return { ...current, forecastDate: defaultForecastDate(reportType) };
    });
  }, [reportType]);

  const isComplete = requiredFieldsComplete(form, system);

  const stopProgressPolling = () => {
    if (progressPollRef.current) {
      window.clearInterval(progressPollRef.current);
      progressPollRef.current = null;
    }
    if (progressAbortRef.current) {
      progressAbortRef.current.abort();
      progressAbortRef.current = null;
    }
  };

  const startProgressPolling = (requestId) => {
    stopProgressPolling();

    async function poll() {
      progressAbortRef.current?.abort();
      const controller = new AbortController();
      progressAbortRef.current = controller;
      try {
        const progress = await getAiProgress(requestId, controller.signal);
        setLoadingStatus(progress);
      } catch (error) {
        if (
          error.name !== "CanceledError"
          && error.name !== "AbortError"
          && error.response?.status !== 404
        ) {
          console.error("Could not fetch AI progress", error);
        }
      }
    }

    poll();
    progressPollRef.current = window.setInterval(poll, 1300);
  };

  useEffect(() => {
    return () => {
      if (progressPollRef.current) {
        window.clearInterval(progressPollRef.current);
      }
      if (progressAbortRef.current) {
        progressAbortRef.current.abort();
      }
    };
  }, []);

  const runReport = async ({
    nextSystem = system,
    nextReportType = reportType,
    nextQuestion = "",
    questionMode = false,
  } = {}) => {
    if (!isComplete) {
      setFormError("Complete all required birth fields before generating a report.");
      return;
    }

    setLoading(true);
    setFormError("");
    setReportData(null);
    if (
      aiSettings.enabled
      && (!aiSettings.baseUrl.trim() || !aiSettings.apiKey.trim() || !aiSettings.model.trim())
    ) {
      setLoading(false);
      setFormError("Complete your custom AI settings or switch back to the default cloud.");
      return;
    }
    setLoadingStatus({
      status: "running",
      stage: "Preparing your astrology reading",
      active_model: null,
      events: [],
    });
    const requestId = `astro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    startProgressPolling(requestId);
    try {
      const result = await generateReport(
        buildPayload(form, nextSystem, nextReportType, nextQuestion),
        requestId,
        aiSettings,
      );
      stopProgressPolling();
      setLoadingStatus((current) => current ? { ...current, status: "complete", stage: "Report ready" } : null);
      const nextReportData = {
        ...result,
        question_mode: questionMode,
        question_display_type:
          nextReportType === "personality"
            ? "overall"
            : nextReportType,
      };
      setReportData(nextReportData);
      setLastReadingData(nextReportData);
    } catch (error) {
      const detail = error.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item.msg).join("; ")
        : detail || "Could not reach the backend. Confirm that both servers are running.";
      stopProgressPolling();
      setReportData({ error: message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setActiveWorkspace("reading");
    await runReport({ nextQuestion: "", questionMode: false });
  };

  const handleGenerateForecast = async () => {
    if (reportType === "personality") {
      setReportType("weekly");
    }
    setActiveWorkspace("forecast");
    await runReport({
      nextReportType: reportType === "personality" ? "weekly" : reportType,
      nextQuestion: "",
      questionMode: false,
    });
  };

  const handleAskQuestion = async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      setFormError("Write a focused question first.");
      return;
    }
    await runReport({ nextQuestion: trimmed, questionMode: true });
  };

  const handleQuestionVariant = async ({ nextSystem, nextDisplayType }) => {
    const typeMap = {
      overall: "personality",
      daily: "daily",
      weekly: "weekly",
      yearly: "yearly",
    };
    await runReport({
      nextSystem,
      nextReportType: typeMap[nextDisplayType] || "personality",
      nextQuestion: question.trim(),
      questionMode: true,
    });
  };

  const handleViewChart = async () => {
    if (!isComplete) {
      setFormError("Complete the birth details first to open the chart view.");
      return;
    }

    setLoading(true);
    setFormError("");
    setActiveWorkspace("chart");
    if (reportData?.report) {
      setLastReadingData(reportData);
    }
    setReportData(null);
    setLoadingStatus({
      status: "running",
      stage: "Calculating the chart view",
      active_model: null,
      events: [],
    });
    try {
      const result = await calculateSystem(
        buildPayload(form, system, reportType, question),
      );
      setReportData({
        name: form.name,
        system,
        report_type: reportType,
        data: result.data,
        chart_only: true,
      });
    } catch (error) {
      const detail = error.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item.msg).join("; ")
        : detail || "Could not calculate chart data right now.";
      setReportData({ error: message });
    } finally {
      setLoadingStatus(null);
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    setQuestionOpen(false);
    setFormError("");
    setActiveWorkspace("reading");
    if (lastReadingData) {
      setReportData(lastReadingData);
      return;
    }
    setReportData(null);
  };

  const handleOpenForecast = () => {
    setQuestionOpen(false);
    setFormError("");
    setActiveWorkspace("forecast");
    setReportType((current) => (current === "personality" ? "weekly" : current));
    setReportData(null);
  };

  return (
    <div className="app-shell relative min-h-screen lg:h-screen">
      <BackgroundGlow />

      <div className="relative z-10 min-h-screen lg:h-full flex flex-col">
        <Header
          question={question}
          setQuestion={setQuestion}
          questionOpen={questionOpen}
          setQuestionOpen={setQuestionOpen}
          canAskQuestion={isComplete}
          activeWorkspace={activeWorkspace}
          activeSystem={system}
          canGoHome={activeWorkspace !== "reading" || Boolean(reportData?.chart_only)}
          loading={loading}
          customAiEnabled={aiSettings.enabled}
          onAskQuestion={handleAskQuestion}
          onOpenForecast={handleOpenForecast}
          onOpenRoadmap={() => setRoadmapOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onGoHome={handleGoHome}
          onViewChart={handleViewChart}
        />

        <main
          className="flex-1
    min-h-0

    grid
    grid-cols-1
    items-stretch
    gap-3
    px-2
    py-4
    sm:px-3
    lg:grid-cols-[360px_minmax(0,1fr)]
    lg:gap-0
    lg:px-0
    lg:py-0
    lg:overflow-hidden
          "
        >
          <Sidebar
            workspace={activeWorkspace}
            setReportData={setReportData}
            system={system}
            setSystem={setSystem}
            reportType={reportType}
            setReportType={setReportType}
            form={form}
            setForm={setForm}
            loading={loading}
            formError={formError}
            setFormError={setFormError}
            onGenerate={handleGenerate}
            onGenerateForecast={handleGenerateForecast}
          />
          <ReportViewer
            reportData={reportData}
            loading={loading}
            loadingStatus={loadingStatus}
            onQuestionVariant={handleQuestionVariant}
            workspace={activeWorkspace}
          />
        </main>

        <div className="product-legal px-3 pb-4 pt-2 text-center sm:px-4 lg:pointer-events-none lg:fixed lg:bottom-5 lg:right-5 lg:z-30 lg:px-0 lg:pb-0 lg:pt-0 lg:text-right">
          Paul Intelligence, a Paul Industries company.
        </div>

      </div>

      {roadmapOpen ? (
        <div
          className="roadmap-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="roadmap-title"
          onClick={() => setRoadmapOpen(false)}
        >
          <div
            className="roadmap-modal surface-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="roadmap-modal__header">
              <div>
                <p className="roadmap-modal__eyebrow">Roadmap preview</p>
                <h2 id="roadmap-title" className="roadmap-modal__title">
                  Astro Consensus v2.0
                </h2>
                <p className="roadmap-modal__copy">
                  Version 2.0 is planned as the next major product release for Astro Consensus. The focus is on improving continuity for returning users, increasing forecast quality, and introducing a more capable intelligence layer without losing the transparency of the current system.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoadmapOpen(false)}
                className="roadmap-modal__close"
                aria-label="Close roadmap"
              >
                Close
              </button>
            </div>

            <div className="roadmap-modal__grid">
              <section className="roadmap-card">
                <h3 className="roadmap-card__title">Saved profiles</h3>
                <p className="roadmap-card__copy">
                  Secure account access and saved birth profiles, allowing users to return to the platform without re-entering core birth data for each session.
                </p>
              </section>
              <section className="roadmap-card">
                <h3 className="roadmap-card__title">Report quality and efficiency</h3>
                <p className="roadmap-card__copy">
                  A more disciplined report pipeline with reduced repetition, stronger structure, and clearer timing logic across daily, weekly, monthly, and yearly readings.
                </p>
              </section>
              <section className="roadmap-card">
                <h3 className="roadmap-card__title">Advanced AI models</h3>
                <p className="roadmap-card__copy">
                  Expanded model support and improved routing for deeper interpretation, stronger long-form writing quality, and more reliable forecast generation at scale.
                </p>
              </section>
              <section className="roadmap-card">
                <h3 className="roadmap-card__title">Reading history and continuity</h3>
                <p className="roadmap-card__copy">
                  Persistent access to prior charts, reports, and forecast windows so users can revisit earlier work without unnecessary repeat generation.
                </p>
              </section>
              <section className="roadmap-card">
                <h3 className="roadmap-card__title">Forecast intelligence</h3>
                <p className="roadmap-card__copy">
                  Higher-resolution monthly and yearly transit analysis with better turning-point detection, clearer sequencing, and stronger distinction between signal strength and uncertainty.
                </p>
              </section>
              <section className="roadmap-card">
                <h3 className="roadmap-card__title">Platform maturity</h3>
                <p className="roadmap-card__copy">
                  Continued refinement of onboarding, trust signaling, product clarity, and the overall client-facing experience expected from a production-grade platform.
                </p>
              </section>
            </div>

            <p className="roadmap-modal__signature">
              Designed and developed by <strong>Mahan</strong>.
            </p>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div
          className="roadmap-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="settings-modal surface-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="roadmap-modal__header">
              <div>
                <p className="roadmap-modal__eyebrow">v1.9.1 settings</p>
                <h2 id="settings-title" className="roadmap-modal__title">
                  Connect your own model
                </h2>
                <p className="roadmap-modal__copy">
                  Use your own OpenAI-compatible model endpoint for your readings. These settings are saved only in this browser and are sent only with your own report requests.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="roadmap-modal__close"
                aria-label="Close settings"
              >
                Close
              </button>
            </div>

            <div className="settings-modal__stack">
              <label className="settings-field">
                <span className="settings-field__label">Use my own model</span>
                <div className="settings-toggle-row">
                  <button
                    type="button"
                    onClick={() =>
                      setAiSettings((current) => ({ ...current, enabled: !current.enabled }))
                    }
                    className={`header-action ${aiSettings.enabled ? "header-action--active" : ""}`}
                  >
                    {aiSettings.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <span className="muted-text text-sm">
                    {aiSettings.enabled
                      ? "Your requests will use your endpoint."
                      : "Reports will use the app default cloud."}
                  </span>
                </div>
              </label>

              <label className="settings-field">
                <span className="settings-field__label">Endpoint URL</span>
                <input
                  type="url"
                  value={aiSettings.baseUrl}
                  onChange={(event) =>
                    setAiSettings((current) => ({ ...current, baseUrl: event.target.value }))
                  }
                  placeholder="https://api.openai.com/v1 or your provider base URL"
                  className="input-field"
                  autoComplete="off"
                />
              </label>

              <label className="settings-field">
                <span className="settings-field__label">API key</span>
                <input
                  type="password"
                  value={aiSettings.apiKey}
                  onChange={(event) =>
                    setAiSettings((current) => ({ ...current, apiKey: event.target.value }))
                  }
                  placeholder="Paste your provider API key"
                  className="input-field"
                  autoComplete="off"
                />
              </label>

              <label className="settings-field">
                <span className="settings-field__label">Model name</span>
                <input
                  type="text"
                  value={aiSettings.model}
                  onChange={(event) =>
                    setAiSettings((current) => ({ ...current, model: event.target.value }))
                  }
                  placeholder="gpt-4.1-mini or your provider model id"
                  className="input-field"
                  autoComplete="off"
                />
              </label>

              <div className="settings-note">
                Astro Consensus expects an OpenAI-compatible chat completions API. If you paste a base URL like `https://api.openai.com/v1`, the backend will route requests to its `/chat/completions` endpoint automatically.
              </div>

              <div className="settings-actions">
                <button
                  type="button"
                  onClick={() =>
                    setAiSettings({
                      enabled: false,
                      baseUrl: "",
                      apiKey: "",
                      model: "",
                    })
                  }
                  className="header-action"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="header-action header-action--active"
                >
                  Save settings
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
