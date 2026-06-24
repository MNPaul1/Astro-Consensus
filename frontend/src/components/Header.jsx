import { useEffect, useRef, useState } from "react";

function formatSystemLabel(system) {
  if (system === "consensus") {
    return "System View";
  }
  return `${system.charAt(0).toUpperCase() + system.slice(1)} Chart`;
}

function ThemeIcon({ theme }) {
  if (theme === "dark") {
    return <span aria-hidden="true" className="header-theme-toggle__icon">☀</span>;
  }
  return <span aria-hidden="true" className="header-theme-toggle__icon">◐</span>;
}

export default function Header({
  theme,
  toggleTheme,
  question,
  setQuestion,
  questionOpen,
  setQuestionOpen,
  canAskQuestion,
  canGoHome,
  activeSystem,
  loading,
  onAskQuestion,
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

        sticky
        top-0
        z-30
      "
    >
      <div className="header-shell flex w-full items-center gap-4">
        <div className="flex min-w-[220px] items-center justify-between gap-4">
          <div>
            <h1
              className="brand-title text-xl font-bold"
            >
              ✦ Astro Consensus
            </h1>

            <p
              className="
                text-xs
                muted-text
                mt-1
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
          className={`header-command surface-card relative flex min-w-0 flex-1 items-center justify-between gap-3 rounded-[1.15rem] border px-3 py-2 ${menuOpen ? "header-command--open" : ""}`}
        >
          <div className={`header-actions min-w-0 ${menuOpen ? "header-actions--open" : ""}`}>
            <button
              type="button"
              onClick={onGoHome}
              disabled={!canGoHome || loading}
              className="header-action"
              title={!canGoHome ? "Open a chart view to return to the last reading" : "Return to the previous reading"}
            >
              Home
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
            <span className="header-status hidden xl:inline">
              {canAskQuestion
                ? "Birth data ready"
                : "Add birth details to unlock question and chart actions"}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={theme === "light"}
              className="header-action header-theme-toggle lg:hidden"
            >
              <ThemeIcon theme={theme} />
              <span>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</span>
            </button>
          </div>

          <div className={`header-tools flex items-center gap-2 ${menuOpen ? "header-tools--open" : ""}`}>
            <span className="header-status xl:hidden">
              {canAskQuestion ? "Ready" : "DOB needed"}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={theme === "light"}
              className="header-action header-theme-toggle hidden lg:inline-flex"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              <ThemeIcon theme={theme} />
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
