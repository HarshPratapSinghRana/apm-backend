import React from "react";
import { Target, TrendingUp, CheckCircle2, BarChart3 } from "lucide-react";

interface EvalMetric {
  name: string;
  target: string;
  current: string | null;
  importance: "critical" | "high" | "medium";
}

interface EvalTabProps {
  data: {
    approach: string;
    metrics: EvalMetric[];
    success_criteria: string[];
    recommendations: string[];
  };
}

const IMPORTANCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  high: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  medium: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

const EvalTab: React.FC<EvalTabProps> = ({ data }) => {
  return (
    <div className="space-y-5">
      {/* Approach summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          Evaluation Approach
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{data.approach}</p>
      </div>

      {/* Metrics */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-primary" />
          Key Metrics
        </h4>
        <div className="space-y-2">
          {data.metrics.map((metric, i) => {
            const c = IMPORTANCE_COLORS[metric.importance] || IMPORTANCE_COLORS.medium;
            return (
              <div key={i} className={`rounded-lg border ${c.border} ${c.bg} p-2.5`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${c.text}`}>{metric.name}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${c.bg} ${c.text} border ${c.border}`}>
                    {metric.importance}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">
                    Target: <span className="font-semibold text-foreground">{metric.target}</span>
                  </span>
                  {metric.current && (
                    <span className="text-[10px] text-muted-foreground">
                      Current: <span className="font-semibold">{metric.current}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Success Criteria */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          Success Criteria
        </h4>
        <ul className="space-y-1.5">
          {data.success_criteria.map((criterion, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              {criterion}
            </li>
          ))}
        </ul>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Recommendations
          </h4>
          <ul className="space-y-1.5">
            {data.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                  {i + 1}
                </span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EvalTab;
