export default function Header({ theme, toggleTheme }) {
  return (
    <header
      className="
        border-b
        border-white/5

        px-6
        py-4

        app-header

        backdrop-blur-xl

        flex
        items-center
        justify-between
      "
    >
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

      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={theme === "light"}
        className="theme-toggle rounded-full border px-4 py-2 text-sm font-medium transition-colors"
      >
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </button>
    </header>
  );
}
