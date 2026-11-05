import React, { useState, useEffect } from "react";
import { Clock, ArrowRight, Trash2, Search } from "lucide-react";

const RECENT_KEY = "leap-advisor-recent";

interface RecentSearchesContentProps {
  onSearch?: (query: string) => void;
}

export const RecentSearchesContent: React.FC<RecentSearchesContentProps> = ({ onSearch }) => {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"));
  }, []);

  const handleClear = () => {
    localStorage.removeItem(RECENT_KEY);
    setRecent([]);
  };

  const handleRemove = (query: string) => {
    const updated = recent.filter((q) => q !== query);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    setRecent(updated);
  };

  return (
    <div className="space-y-6 animate-leap-fade-in-up">
      {/* Header actions */}
      {recent.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {recent.length} recent search{recent.length !== 1 ? "es" : ""}
          </span>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Clear all
          </button>
        </div>
      )}

      {recent.length === 0 ? (
        <div className="mt-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
            <Clock className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <h2 className="mt-3 text-sm font-medium text-muted-foreground">No recent searches</h2>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Your search history will appear here after you use the AI Solution Advisor.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((query) => (
            <div
              key={query}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
              <span className="flex-1 text-sm text-foreground truncate">{query}</span>
              <button
                onClick={() => handleRemove(query)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                title="Remove"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
              <button
                onClick={() => onSearch?.(query)}
                className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-all"
              >
                Search again
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentSearchesContent;
