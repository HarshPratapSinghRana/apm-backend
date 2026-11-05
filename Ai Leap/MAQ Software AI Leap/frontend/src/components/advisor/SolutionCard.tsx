import React from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { Zap, Folder, Play, ArrowRight } from "lucide-react";
import type { ScoredSolution } from "@/lib/scoreSolutions";

interface SolutionCardProps {
  solution: ScoredSolution;
  rank: number;
  onSelectUseCase?: (domainId: string, useCaseId: string) => void;
}

const archColors: Record<string, string> = {
  "No Code": "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  "Low Code": "bg-amber-500/15 text-amber-700 border-amber-200",
  "Pro Code": "bg-violet-500/15 text-violet-700 border-violet-200",
};

const SolutionCard: React.FC<SolutionCardProps> = ({ solution, rank, onSelectUseCase }) => {
  const navigate = useNavigate();
  const DomainIcon = Icons[solution.domainIcon as keyof typeof Icons] as React.ElementType | undefined;

  const goToDetail = () => {
    if (onSelectUseCase) {
      onSelectUseCase(solution.domainId, solution.id);
    } else {
      navigate(`/domain/${solution.domainId}?uc=${solution.id}`);
    }
  };

  return (
    <div
      onClick={goToDetail}
      className="group relative cursor-pointer rounded-xl border border-border bg-card p-4 transition-all hover:shadow-lg hover:border-primary/30"
    >
      {/* Rank + Score badge */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white shadow">
          {rank}
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {solution.score}% match
        </span>
      </div>

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {solution.title}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {DomainIcon && <DomainIcon className="h-3 w-3" />}
            <span>{solution.domainName}</span>
            {solution.maturity && (
              <>
                <span className="text-border">|</span>
                <span>{solution.maturity}</span>
              </>
            )}
          </div>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${archColors[solution.architecture] || archColors["Pro Code"]}`}>
          {solution.architecture}
        </span>
      </div>

      {/* Description */}
      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{solution.description}</p>

      {/* Key Features (first 3) */}
      {solution.key_features.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {solution.key_features.slice(0, 3).map((f, i) => (
            <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {f.length > 40 ? f.slice(0, 40) + "…" : f}
            </span>
          ))}
          {solution.key_features.length > 3 && (
            <span className="text-[11px] text-muted-foreground">+{solution.key_features.length - 3} more</span>
          )}
        </div>
      )}

      {/* Impact */}
      {solution.impact && (
        <p className="mt-2 text-xs text-muted-foreground italic line-clamp-1">
          Impact: {solution.impact}
        </p>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex items-center gap-2">
        {solution.hasDemo && (
          <button
            onClick={(e) => { e.stopPropagation(); goToDetail(); }}
            className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            <Zap className="h-3 w-3" /> Try Demo
          </button>
        )}
        {solution.hasCode && (
          <button
            onClick={(e) => { e.stopPropagation(); goToDetail(); }}
            className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            <Folder className="h-3 w-3" /> Code
          </button>
        )}
        {solution.hasVideo && (
          <button
            onClick={(e) => { e.stopPropagation(); goToDetail(); }}
            className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            <Play className="h-3 w-3" /> Video
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); goToDetail(); }}
          className="ml-auto flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View Details <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default SolutionCard;
