import { useEffect, useRef, useState } from "react";

function formatSystemLabel(system) {
  if (system === "consensus") {
    return "System View";
  }
  return `${system.charAt(0).toUpperCase() + system.slice(1)} Chart`;
}

export default function Header({
  question,
  setQuestion,
  questionOpen,
  setQuestionOpen,
  canAskQuestion,
  canGoHome,
  activeWorkspace,
  activeSystem,
  loading,
  onAskQuestion,
  onOpenForecast,
  onOpenRoadmap,
  onGoHome,
  onViewChart,
}) {
  const commandRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!questionOpen) {
      return undefined;
    }

    function closeIfOutside(target) {
      if (commandRef.current && !commandRef.current.contains(target)) {
        setQuestionOpen(false);
      }
    }

    function handlePointerDown(event) {
      closeIfOutside(event.target);
    }

    function handleFocusIn(event) {
      closeIfOutside(event.target);
    }

    function handleScroll() {
      setQuestionOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setQuestionOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [questionOpen, setQuestionOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    function handleResize() {
      if (window.innerWidth >= 1024) {
        setMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [menuOpen]);

  return (
    <header
      className="
        border-b
        border-white/5

        app-header

        backdrop-blur-xl
      "
    >
      <div className="header-shell flex w-full items-center gap-3">
        <div className="flex min-w-[220px] items-center justify-between gap-4">
          <div>
            <h1
              className="brand-title text-[1.9rem] font-semibold leading-none tracking-[-0.02em]"
            >
              ✦ Astro Consensus
            </h1>

            <p
              className="
                text-[0.8rem]
                muted-text
                mt-1.5
              "
            >
              Ancient Wisdom | Modern Intelligence
            </p>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-label="Toggle navigation"
              className={`header-action header-menu-toggle ${menuOpen ? "header-action--active" : ""}`}
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        <div
          ref={commandRef}
          className={`header-command surface-card relative flex min-w-0 flex-1 items-center justify-between gap-3 rounded-[1.15rem] border px-3 py-2.5 ${menuOpen ? "header-command--open" : ""}`}
        >
          <div className={`header-actions min-w-0 ${menuOpen ? "header-actions--open" : ""}`}>
            <button
              type="button"
              onClick={onGoHome}
              disabled={!canGoHome || loading}
              className={`header-action ${activeWorkspace === "reading" ? "header-action--active" : ""}`}
              title={!canGoHome ? "Return to the main reading workspace" : "Return to the previous reading"}
            >
              Home
            </button>
            <button
              type="button"
              onClick={onOpenForecast}
              disabled={!canAskQuestion || loading}
              className={`header-action ${activeWorkspace === "forecast" ? "header-action--active" : ""}`}
              title={!canAskQuestion ? "Complete the birth data first" : "Open the forecast workspace"}
            >
              Forecasts
            </button>
            <button
              type="button"
              onClick={() => setQuestionOpen((current) => !current)}
              disabled={!canAskQuestion || loading}
              className={`header-action ${questionOpen ? "header-action--active" : ""}`}
              title={!canAskQuestion ? "Complete the birth data first" : "Ask a focused question"}
            >
              Ask Question
            </button>
            <button
              type="button"
              onClick={onViewChart}
              disabled={!canAskQuestion || loading}
              className="header-action"
              title={!canAskQuestion ? "Complete the birth data first" : "Open the deterministic chart view"}
            >
              {formatSystemLabel(activeSystem)}
            </button>
            <span className="header-status hidden 2xl:inline">
              {canAskQuestion
                ? "Birth data ready"
                : "Add birth details to unlock question and chart actions"}
            </span>
          </div>

          <div className={`header-tools flex items-center gap-2 ${menuOpen ? "header-tools--open" : ""}`}>
            <span className="header-status xl:hidden">
              {canAskQuestion ? "Ready" : "DOB needed"}
            </span>
            <span className="header-meta-chip hidden lg:inline-flex">
              v1.9
            </span>
            <button
              type="button"
              onClick={onOpenRoadmap}
              className="header-meta-chip header-meta-chip--accent hidden lg:inline-flex"
            >
              v2.0 coming soon
            </button>
          </div>

          {questionOpen ? (
            <div className="header-question header-question--popover surface-card flex w-full flex-col gap-2 rounded-2xl border px-4 py-3">
              <div>
                <p className="header-question__eyebrow">Ask the reading</p>
              </div>

              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (canAskQuestion && !loading) {
                      onAskQuestion();
                    }
                  }
                }}
                placeholder="What do you want this reading to answer for you?"
                rows="2"
                maxLength="1000"
                className="input-field-compact resize-none"
                disabled={!canAskQuestion}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="muted-text text-xs">
                  Press Enter to ask. Shift+Enter for a new line.
                </p>
                <button
                  type="button"
                  onClick={onAskQuestion}
                  disabled={!canAskQuestion || loading || !question.trim()}
                  className="header-action"
                >
                  Ask Now
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
