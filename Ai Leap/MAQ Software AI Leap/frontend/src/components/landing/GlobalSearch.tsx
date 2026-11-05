import React, { useState, useEffect, useRef } from "react";
import { Search, X, ArrowRight, Bot, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  description: string;
  domain?: string;
  domain_id?: string;
  architecture?: string;
  has_demo: boolean;
  has_code: boolean;
  maturity?: string;
  tags?: string[];
}

interface GlobalSearchProps {
  initialQuery?: string;
  onClose?: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ initialQuery = "", onClose }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch(query);
    if (e.key === "Escape") onClose?.();
  };

  const navigateToResult = (r: SearchResult) => {
    if (r.type === "domain") {
      navigate(`/domain/${r.domain_id}`);
    } else if (r.domain_id) {
      navigate(`/domain/${r.domain_id}?uc=${r.id}`);
    }
    onClose?.();
  };

  const domains = results.filter((r) => r.type === "domain");
  const solutions = results.filter((r) => r.type === "solution");

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Search input */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search agents, domains, solutions..."
          className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {(loading || results.length > 0) && (
        <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-border bg-white shadow-md">
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Searching...</div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No results found</div>
          )}

          {!loading && domains.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Domains</div>
              {domains.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigateToResult(r)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-hover"
                >
                  <Layers className="h-4 w-4 text-primary" />
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.description}</p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {!loading && solutions.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                Solutions ({solutions.length})
              </div>
              {solutions.slice(0, 10).map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigateToResult(r)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-hover"
                >
                  <Bot className="h-4 w-4 text-primary" />
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.domain}
                      {r.architecture && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{r.architecture}</span>}
                      {r.has_demo && <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Demo</span>}
                    </p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
              {solutions.length > 10 && (
                <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                  +{solutions.length - 10} more results
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
