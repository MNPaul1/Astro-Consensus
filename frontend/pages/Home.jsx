import { useEffect, useLayoutEffect, useRef, useState } from "react";

import Header from "../src/components/Header";
import BackgroundGlow from "../src/components/BackgroundGlow";
import Sidebar from "../src/components/Sidebar";
import ReportViewer from "../src/components/ReportViewer";
import { calculateSystem, generateReport, getAiProgress } from "../services/api";

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

export default function Home() {
  const [reportData, setReportData] = useState(null);
  const [lastReadingData, setLastReadingData] = useState(null);
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
  });
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
    await runReport({ nextQuestion: "", questionMode: false });
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
    if (lastReadingData) {
      setReportData(lastReadingData);
      return;
    }
    setReportData(null);
  };

  return (
    <div className="app-shell relative min-h-screen lg:h-screen">
      <BackgroundGlow />

      <div className="relative z-10 min-h-screen lg:h-full flex flex-col">
        <Header
          theme={theme}
          question={question}
          setQuestion={setQuestion}
          questionOpen={questionOpen}
          setQuestionOpen={setQuestionOpen}
          canAskQuestion={isComplete}
          activeSystem={system}
          canGoHome={Boolean(reportData?.chart_only)}
          loading={loading}
          onAskQuestion={handleAskQuestion}
          onGoHome={handleGoHome}
          onViewChart={handleViewChart}
          toggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        />

        <main
          className="flex-1
    min-h-0

    grid
    grid-cols-1
    lg:grid-cols-[330px_1fr]

    lg:overflow-hidden
          "
        >
          <Sidebar
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
          />
          <ReportViewer
            reportData={reportData}
            loading={loading}
            loadingStatus={loadingStatus}
            onQuestionVariant={handleQuestionVariant}
          />
        </main>
      </div>
    </div>
  );
}
