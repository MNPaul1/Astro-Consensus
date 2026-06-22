export default function SystemSelector({ system, setSystem }) {
  const systems = [
    { id: "vedic", label: "Vedic" },
    { id: "western", label: "Western" },
    { id: "numerology", label: "Numerology" },
    { id: "consensus", label: "Consensus" },
  ];

  return (
    <div className="mb-3">
      <h3 className="muted-text mb-2 text-sm">Astrology System</h3>

      <div className="grid grid-cols-2 gap-2">
        {systems.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setSystem(item.id)}
            className={`
              p-2 rounded-lg border
              transition-all
              ${
                system === item.id
                  ? "selected-option"
                  : "option-button"
              }
            `}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
