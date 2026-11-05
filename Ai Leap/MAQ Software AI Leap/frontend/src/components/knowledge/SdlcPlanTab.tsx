import React from "react";
import { CheckCircle2, AlertTriangle, Clock, ArrowRight } from "lucide-react";

interface SdlcPhase {
  id: string;
  title: string;
  color: string;
  status: "mapped" | "partial" | "tbd";
  kpis: string[];
  mapped_solutions: string[];
  total_solutions: number;
}

interface SdlcPlanTabProps {
  data: {
    phases: SdlcPhase[];
    coverage: number;
    gaps: string[];
    adoption_order: { solution: string; phase: string; priority: string }[];
  };
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", bar: "bg-amber-500" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", bar: "bg-blue-500" },
  violet: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", bar: "bg-violet-500" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", bar: "bg-emerald-500" },
  teal: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", bar: "bg-teal-500" },
};

const SdlcPlanTab: React.FC<SdlcPlanTabProps> = ({ data }) => {
  return (
    <div className="space-y-5">
      {/* Coverage bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-foreground">SDLC Coverage</span>
          <span className="text-sm font-bold text-primary">{data.coverage}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${data.coverage}%` }}
          />
        </div>
        {data.gaps.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            Gaps: {data.gaps.map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(", ")}
          </div>
        )}
      </div>

      {/* Phase cards */}
      <div className="space-y-2.5">
        {data.phases.map((phase) => {
          const c = COLOR_MAP[phase.color] || COLOR_MAP.blue;
          const isMapped = phase.status === "mapped";
          const isTbd = phase.status === "tbd";

          return (
            <div
              key={phase.id}
              className={`rounded-lg border ${isTbd ? "border-dashed border-muted-foreground/30 bg-muted/20" : `${c.border} ${c.bg}`} p-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isTbd ? "bg-muted-foreground/30" : c.bar}`} />
                  <span className={`text-xs font-bold ${isTbd ? "text-muted-foreground" : c.text}`}>
                    {phase.title}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {isMapped && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  {isTbd && <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/50" />}
                  <span className={`text-[10px] font-semibold ${isTbd ? "text-muted-foreground/50" : c.text}`}>
                    {isMapped ? "Mapped" : isTbd ? "TBD" : "Partial"}
                  </span>
                </div>
              </div>

              {/* Solutions bar */}
              {phase.total_solutions > 0 && (
                <div className="mt-2">
                  <div className="h-1 w-full rounded-full bg-border/40 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.bar}/70`}
                      style={{ width: `${(phase.mapped_solutions.length / Math.max(phase.total_solutions, 1)) * 100}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {phase.total_solutions} solution{phase.total_solutions > 1 ? "s" : ""} mapped
                  </div>
                </div>
              )}

              {/* KPIs */}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {phase.kpis.map((kpi, i) => (
                  <span key={i} className="rounded-md bg-white/60 border border-border/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {kpi}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Adoption Order */}
      {data.adoption_order.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            Suggested Adoption Order
          </h4>
          <div className="space-y-2">
            {data.adoption_order.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-foreground">{item.solution}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">→ {item.phase}</span>
                </div>
                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                  item.priority === "High"
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : "bg-amber-50 text-amber-600 border border-amber-200"
                }`}>
                  {item.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SdlcPlanTab;
