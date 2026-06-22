export default function ThemePills({ themes }) {
  if (!themes?.length) {
    return null;
  }

  return (
    <div
      className="
        flex
        flex-wrap

        gap-2

        mb-6
        mx-auto
        max-w-4xl
      "
    >
      {themes.map((theme) => (
        <span
          key={theme}
          className="
            px-4
            py-2

            rounded-full

            theme-pill

            border
            text-sm
          "
        >
          {theme}
        </span>
      ))}
    </div>
  );
}
