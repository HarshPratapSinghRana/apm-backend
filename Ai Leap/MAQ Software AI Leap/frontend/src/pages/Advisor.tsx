import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Home, Search, ArrowRight } from "lucide-react";
import ProblemSummary from "@/components/advisor/ProblemSummary";
import ArchitectureTabs from "@/components/advisor/ArchitectureTabs";
import SolutionCard from "@/components/advisor/SolutionCard";
import { scoreSolutions, type AdvisorResult } from "@/lib/scoreSolutions";

const Advisor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [archFilter, setArchFilter] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Run scoring whenever the submitted query changes
  const result: AdvisorResult | null = useMemo(() => {
    if (!submittedQuery.trim()) return null;
    return scoreSolutions(submittedQuery);
  }, [submittedQuery]);

  // Auto-submit on page load if query param present
  useEffect(() => {
    if (initialQuery.trim()) setSubmittedQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSubmittedQuery(query.trim());
      setArchFilter(null);
      // Update URL without full navigation
      navigate(`/advisor?q=${encodeURIComponent(query.trim())}`, { replace: true });
    }
  };

  // Architecture counts for tabs
  const archCounts = useMemo(() => {
    if (!result) return {};
    const counts: Record<string, number> = {};
    for (const s of result.solutions) {
      counts[s.architecture] = (counts[s.architecture] || 0) + 1;
    }
    return counts;
  }, [result]);

  const filteredSolutions = useMemo(() => {
    if (!result) return [];
    return archFilter
      ? result.solutions.filter((s) => s.architecture === archFilter)
      : result.solutions;
  }, [result, archFilter]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-12 px-4 gap-4 max-w-6xl mx-auto">
          <Link to="/" className="p-1.5 hover:bg-hover rounded-lg transition-colors flex-shrink-0" title="Home">
            <Home className="w-4 h-4" />
          </Link>
          <h1 className="text-sm font-semibold text-foreground">
            AI <span className="text-primary">Solution Advisor</span>
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search form */}
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Describe your business problem… e.g. 'We need to automate customer support for our retail store with minimal coding effort'"
            rows={3}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-24 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          <button
            type="submit"
            className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            Find Solutions
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="mt-8 space-y-6">
            {/* Problem Summary */}
            <ProblemSummary
              query={result.query}
              summary={result.summary}
              detectedDomain={result.detectedDomain}
              complexityHint={result.complexityHint}
            />

            {/* Architecture Tabs */}
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

            {/* Solution Cards */}
            {filteredSolutions.length > 0 ? (
              <div className="space-y-5">
                {filteredSolutions.map((sol, i) => (
                  <SolutionCard key={sol.id} solution={sol} rank={i + 1} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-10 text-center">
                <p className="text-muted-foreground">
                  No matching solutions found. Try rephrasing your problem statement or using broader terms.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && (
          <div className="mt-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">Describe your challenge</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Enter a business problem statement above and we'll match you with the best AI solutions, categorized by architecture complexity.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                "Automate customer support for retail",
                "Legal document analysis with minimal coding",
                "Manufacturing quality inspection using AI",
                "Healthcare patient triage automation",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setQuery(example);
                    setSubmittedQuery(example);
                    navigate(`/advisor?q=${encodeURIComponent(example)}`, { replace: true });
                  }}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
                >
                  <ArrowRight className="h-3 w-3" />
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Advisor;
