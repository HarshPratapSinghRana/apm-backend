import React, { useState, useMemo, useRef, useCallback } from "react";
import { Search, ArrowRight, Clock, Trash2, X, Sparkles, Lightbulb } from "lucide-react";
import ArchitectureTabs from "@/components/advisor/ArchitectureTabs";
import SolutionCard from "@/components/advisor/SolutionCard";
import { scoreSolutions, type AdvisorResult } from "@/lib/scoreSolutions";
import agentsData from "@/data/agents.json";

const RECENT_KEY = "leap-advisor-recent";
const MAX_RECENT = 10;

function loadRecent(): string[] {
  return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
}

function saveRecent(query: string) {
  const list = loadRecent();
  const filtered = list.filter((q) => q.toLowerCase() !== query.toLowerCase());
  filtered.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
}

interface AdvisorContentProps {
  initialQuery?: string;
  onNavigate?: (branchId: string, childId: string | null, context?: string) => void;
  onSelectUseCase?: (domainId: string, useCaseId: string) => void;
}

export const AdvisorContent: React.FC<AdvisorContentProps> = ({ initialQuery = "", onNavigate, onSelectUseCase }) => {
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [archFilter, setArchFilter] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Build flat list of searchable items for autocomplete
  const searchableItems = useMemo(() => {
    const items: { title: string; domain: string; domainId: string }[] = [];
    for (const domain of agentsData.domains) {
      for (const uc of domain.use_cases) {
        items.push({ title: uc.title, domain: domain.domain, domainId: domain.id });
      }
    }
    return items;
  }, []);

  // Live autocomplete suggestions based on current query
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const words = q.split(/\s+/);
    return searchableItems
      .filter((item) => {
        const t = item.title.toLowerCase();
        return words.some((w) => t.includes(w));
      })
      .slice(0, 6);
  }, [query, searchableItems]);

  // Close suggestions on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-submit if initialQuery changes
  React.useEffect(() => {
    if (initialQuery.trim()) {
      setQuery(initialQuery);
      setSubmittedQuery(initialQuery);
      saveRecent(initialQuery.trim());
      setRecent(loadRecent());
    }
  }, [initialQuery]);

  // Refresh recent list whenever we return to empty state
  React.useEffect(() => {
    if (!submittedQuery.trim()) setRecent(loadRecent());
  }, [submittedQuery]);

  const result: AdvisorResult | null = useMemo(() => {
    if (!submittedQuery.trim()) return null;
    return scoreSolutions(submittedQuery);
  }, [submittedQuery]);

  const handleSubmit = (text?: string) => {
    const q = (text ?? query).trim();
    if (q) {
      setQuery(q);
      setSubmittedQuery(q);
      setArchFilter(null);
      saveRecent(q);
      setRecent(loadRecent());
    }
  };

  const handleClearRecent = () => {
    localStorage.removeItem(RECENT_KEY);
    setRecent([]);
  };

  const handleRemoveRecent = (item: string) => {
    const updated = recent.filter((q) => q !== item);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    setRecent(updated);
  };

  const handleBack = () => {
    setSubmittedQuery("");
    setQuery("");
    setArchFilter(null);
    inputRef.current?.focus();
  };

  // Pre-filter: only keep solutions with score >= 60%
  const qualifiedSolutions = useMemo(() => {
    if (!result) return [];
    return result.solutions.filter((s) => s.score >= 60);
  }, [result]);

  const archCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of qualifiedSolutions) {
      counts[s.architecture] = (counts[s.architecture] || 0) + 1;
    }
    return counts;
  }, [qualifiedSolutions]);

  const filteredSolutions = useMemo(() => {
    return archFilter
      ? qualifiedSolutions.filter((s) => s.architecture === archFilter)
      : qualifiedSolutions;
  }, [qualifiedSolutions, archFilter]);

  return (
    <div className="space-y-6 animate-leap-fade-in-up">
      {/* Search bar row — with inline Clear all / Clear results */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-md flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setShowSuggestions(false);
                handleSubmit();
              }
              if (e.key === "Escape") setShowSuggestions(false);
            }}
            placeholder="Describe your business problem…"
            className="w-full pl-10 pr-[5.5rem] py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
          {/* Clear input X */}
          {query && (
            <button
              onClick={() => { setQuery(""); setShowSuggestions(false); inputRef.current?.focus(); }}
              className="absolute right-[5.25rem] top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all z-10"
            >
              <X className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          )}
          <button
            onClick={() => { setShowSuggestions(false); handleSubmit(); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all hover:opacity-90 z-10"
            style={{ backgroundColor: "#801818" }}
          >
            <Search className="h-3.5 w-3.5" />
            Find
          </button>

          {/* Live autocomplete suggestions dropdown */}
          {showSuggestions && !result && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden"
            >
              <div className="px-3 py-1.5 border-b border-border">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Suggestions
                </span>
              </div>
              {suggestions.map((item) => (
                <button
                  key={`${item.domainId}-${item.title}`}
                  onClick={() => {
                    setShowSuggestions(false);
                    handleSubmit(item.title);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="text-foreground truncate">{item.title}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 rounded-full bg-muted/60 px-2 py-0.5">{item.domain}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear all — shown when no results + has recent */}
        {!result && recent.length > 0 && (
          <button
            onClick={handleClearRecent}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}

        {/* Clear results — shown when results are visible */}
        {result && (
          <>
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            <X className="h-4 w-4" />
            Clear results
          </button>
          <div className="h-4 w-px bg-border" />
          <button
            onClick={() => {
              localStorage.setItem("leap-builder-query", submittedQuery);
              onNavigate?.("knowledge-hub", "kb-decision-guide");
            }}
            className={`flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap transition-all ${
              qualifiedSolutions.length === 0
                ? "text-primary animate-pulse hover:text-primary/80"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Design Custom Solution
          </button>
          </>
        )}
      </div>

      {/* ─── Results ─── */}
      {result && (
        <div className="space-y-5 max-w-4xl">

          {/* Option B: Top callout — when no qualified solutions (all < 60%) */}
          {onNavigate && qualifiedSolutions.length === 0 && (
            <div className="rounded-xl border-2 border-amber-400/40 bg-amber-50/60 p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Your problem might need a custom solution</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    The Solution Builder can design an architecture, estimate costs, and create an implementation plan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem("leap-builder-query", submittedQuery);
                  onNavigate("knowledge-hub", "kb-decision-guide");
                }}
                className="flex items-center gap-1.5 shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Design My Solution
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {result.solutions.length > 0 && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <ArchitectureTabs
                counts={archCounts}
                active={archFilter}
                onChange={setArchFilter}
              />
              <span className="text-xs text-muted-foreground">
                {filteredSolutions.length} solution{filteredSolutions.length !== 1 ? "s" : ""} found
              </span>
            </div>
          )}

          {filteredSolutions.length > 0 ? (
            <div className="space-y-4">
              {filteredSolutions.map((sol, i) => (
                <SolutionCard key={sol.id} solution={sol} rank={i + 1} onSelectUseCase={onSelectUseCase} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">
                No matching solutions found. Try rephrasing your problem statement or using broader terms.
              </p>
            </div>
          )}

          {/* Option A: Bottom banner — always visible when results exist */}
          {onNavigate && filteredSolutions.length > 0 && (
            <div className="rounded-xl border border-border bg-card/80 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">Can't find the right fit?</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Let our AI architect design a custom solution for you — complete with architecture, costs, and implementation plan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem("leap-builder-query", submittedQuery);
                  onNavigate("knowledge-hub", "kb-decision-guide");
                }}
                className="flex items-center gap-1.5 shrink-0 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                Open Solution Builder
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Empty state: Recent Searches + Example Queries ─── */}
      {!result && (
        <>
          {/* Recent Searches */}
          {recent.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Recent Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {recent.map((item) => (
                  <button
                    key={item}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card pl-3 pr-2 py-1 text-xs text-foreground transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer"
                    onClick={() => handleSubmit(item)}
                  >
                    <Clock className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                    <span className="whitespace-nowrap">{item}</span>
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveRecent(item); }}
                      className="ml-0.5 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                      title="Remove"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divider when both sections show */}
          {recent.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground">or try an example</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Example queries */}
          <div className={recent.length === 0 ? "mt-6 text-center" : "text-center"}>
            {recent.length === 0 && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Search className="h-7 w-7 text-primary" />
                </div>
                <h2 className="mt-3 text-base font-semibold text-foreground">Describe your challenge</h2>
                <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
                  Enter a business problem above and we'll match you with the best AI solutions, categorized by architecture complexity.
                </p>
              </>
            )}
            <div className={`flex flex-wrap justify-center gap-2 ${recent.length === 0 ? "mt-5" : ""}`}>
              {[
                "Automate customer support for retail",
                "Legal document analysis with minimal coding",
                "Manufacturing quality inspection using AI",
                "Healthcare patient triage automation",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => handleSubmit(example)}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
                >
                  <ArrowRight className="h-3 w-3" />
                  {example}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvisorContent;
