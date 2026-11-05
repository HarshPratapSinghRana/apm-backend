import React from "react";
import { Lightbulb, Network, CalendarRange, FlaskConical } from "lucide-react";
import ArchitectureDiagram from "./ArchitectureDiagram";
import SdlcPlanTab from "./SdlcPlanTab";
import EvalTab from "./EvalTab";

export type OutputTab = "recommendations" | "architecture" | "sdlc" | "eval";

interface BuilderOutputProps {
  activeTab: OutputTab;
  onTabChange: (tab: OutputTab) => void;
  outputs: {
    recommendations?: {
      tier: string;
      score: number;
      solutions: {
        name: string;
        category: string;
        match_score: number;
        reason: string;
      }[];
      tech_stack: string[];
    };
    architecture?: any;
    sdlc?: any;
    eval?: any;
  };
}

const TABS: { id: OutputTab; label: string; icon: React.ReactNode }[] = [
  { id: "recommendations", label: "Recommendations", icon: <Lightbulb className="h-3.5 w-3.5" /> },
  { id: "architecture", label: "Architecture", icon: <Network className="h-3.5 w-3.5" /> },
  { id: "sdlc", label: "SDLC Plan", icon: <CalendarRange className="h-3.5 w-3.5" /> },
  { id: "eval", label: "Evaluation", icon: <FlaskConical className="h-3.5 w-3.5" /> },
];

const BuilderOutput: React.FC<BuilderOutputProps> = ({ activeTab, onTabChange, outputs }) => {
  const hasAny = Object.keys(outputs).length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-muted/30">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const hasData = !!outputs[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              disabled={!hasData}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                isActive
                  ? "border-primary text-primary"
                  : hasData
                    ? "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    : "border-transparent text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              {tab.icon}
              {tab.label}
              {hasData && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasAny ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Lightbulb className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Describe your problem and the Solution Builder will generate recommendations here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === "recommendations" && outputs.recommendations && (
              <RecommendationsContent data={outputs.recommendations} />
            )}
            {activeTab === "architecture" && outputs.architecture && (
              <ArchitectureDiagram data={outputs.architecture} />
            )}
            {activeTab === "sdlc" && outputs.sdlc && (
              <SdlcPlanTab data={outputs.sdlc} />
            )}
            {activeTab === "eval" && outputs.eval && (
              <EvalTab data={outputs.eval} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ─── Recommendations tab content ─── */
interface RecData {
  tier: string;
  score: number;
  solutions: { name: string; category: string; match_score: number; reason: string }[];
  tech_stack: string[];
}

const TIER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Pro Code": { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700" },
  "Low Code": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  "No Code": { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
};

const RecommendationsContent: React.FC<{ data: RecData }> = ({ data }) => {
  const tc = TIER_COLORS[data.tier] || TIER_COLORS["Pro Code"];

  return (
    <div className="space-y-4">
      {/* Tier recommendation */}
      <div className={`rounded-xl border ${tc.border} ${tc.bg} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recommended Tier
            </span>
            <h3 className={`text-base font-bold ${tc.text}`}>{data.tier}</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground">Match Score</span>
            <div className={`text-lg font-bold ${tc.text}`}>{data.score}%</div>
          </div>
        </div>
      </div>

      {/* Solutions */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-foreground">Matching Solutions</h4>
        {data.solutions.map((sol, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground">{sol.name}</span>
                <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {sol.category}
                </span>
              </div>
              <span className="text-xs font-bold text-primary">{sol.match_score}%</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{sol.reason}</p>
          </div>
        ))}
      </div>

      {/* Tech stack */}
      {data.tech_stack.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Suggested Tech Stack</h4>
          <div className="flex flex-wrap gap-1.5">
            {data.tech_stack.map((tech, i) => (
              <span
                key={i}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BuilderOutput;
