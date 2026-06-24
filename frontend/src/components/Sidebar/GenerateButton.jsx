export default function GenerateButton({
  loading,
  onGenerate,
  disabled,
  label = "Generate Report",
  loadingLabel = "Calculating and writing...",
}) {
  return (
    <button
      onClick={onGenerate}
      disabled={disabled || loading}
      className="
        w-full
        p-4
        py-3  
        rounded-xl
        font-semibold

        generate-button
        shadow-lg

        hover:scale-[1.02]
        disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100

        transition-all
      "
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
