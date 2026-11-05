import React from "react";

interface ArchitectureTabsProps {
  counts: Record<string, number>;
  active: string | null;
  onChange: (arch: string | null) => void;
}

const TAB_ORDER = ["All", "No Code", "Low Code", "Pro Code"];

const archStyles: Record<string, { active: string; inactive: string }> = {
  All: {
    active: "bg-primary text-primary-foreground",
    inactive: "text-muted-foreground hover:bg-muted",
  },
  "No Code": {
    active: "bg-emerald-600 text-white",
    inactive: "text-emerald-700 hover:bg-emerald-50",
  },
  "Low Code": {
    active: "bg-amber-600 text-white",
    inactive: "text-amber-700 hover:bg-amber-50",
  },
  "Pro Code": {
    active: "bg-violet-600 text-white",
    inactive: "text-violet-700 hover:bg-violet-50",
  },
};

const ArchitectureTabs: React.FC<ArchitectureTabsProps> = ({ counts, active, onChange }) => {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {TAB_ORDER.map((tab) => {
        const count = tab === "All" ? total : (counts[tab] || 0);
        if (tab !== "All" && count === 0) return null;
        const isActive = tab === "All" ? active === null : active === tab;
        const style = archStyles[tab] || archStyles.All;

        return (
          <button
            key={tab}
            onClick={() => onChange(tab === "All" ? null : tab)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isActive ? style.active : style.inactive
            }`}
          >
            {tab}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
              isActive ? "bg-white/25" : "bg-muted"
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ArchitectureTabs;
