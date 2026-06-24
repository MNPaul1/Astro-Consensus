const LIFE_AREAS = [
  { id: "general", label: "General" },
  { id: "love", label: "Love" },
  { id: "career", label: "Career" },
  { id: "money", label: "Money" },
  { id: "family", label: "Family" },
  { id: "growth", label: "Growth" },
];

export default function LifeAreaSelector({ lifeArea, setLifeArea }) {
  return (
    <div className="mb-3">
      <h3 className="muted-text mb-2 text-sm">Life Area Focus</h3>

      <div className="grid grid-cols-2 gap-2">
        {LIFE_AREAS.map((area) => (
          <button
            type="button"
            key={area.id}
            onClick={() => setLifeArea(area.id)}
            className={lifeArea === area.id ? "selected-option p-2 rounded-lg border transition-all" : "option-button p-2 rounded-lg border transition-all"}
          >
            {area.label}
          </button>
        ))}
      </div>
    </div>
  );
}
