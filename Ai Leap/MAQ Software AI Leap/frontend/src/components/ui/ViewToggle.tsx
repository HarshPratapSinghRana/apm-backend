import React from "react";

interface ViewToggleProps {
  current: "classic" | "modern";
  onChange: (view: "classic" | "modern") => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ current, onChange }) => {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-white p-0.5 shadow-sm">
      <button
        onClick={() => onChange("classic")}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
          current === "classic"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Classic
      </button>
      <button
        onClick={() => onChange("modern")}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
          current === "modern"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Modern
      </button>
    </div>
  );
};

export default ViewToggle;
