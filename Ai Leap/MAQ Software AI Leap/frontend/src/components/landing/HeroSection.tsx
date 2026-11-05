import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Layers, BookOpen, BarChart3, Search, ArrowRight, X, Lightbulb } from "lucide-react";
import agentsData from "@/data/agents.json";

interface HeroSectionProps {
  onSearch?: (query: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onSearch }) => {
  const navigate = useNavigate();
  const [problem, setProblem] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Build flat list of searchable items for autocomplete
  // const searchableItems = useMemo(() => {
  //   const items: { title: string; domain: string; domainId: string }[] = [];
  //   for (const domain of agentsData.domains) {
  //     for (const uc of domain.use_cases) {
  //       items.push({ title: uc.title, domain: domain.domain, domainId: domain.id });
  //     }
  //   }
  //   return items;
  // }, []);

  // const suggestions = useMemo(() => {
  //   const q = problem.trim().toLowerCase();
  //   if (q.length < 2) return [];
  //   const words = q.split(/\s+/);
  //   return searchableItems
  //     .filter((item) => {
  //       const t = item.title.toLowerCase();
  //       return words.some((w) => t.includes(w));
  //     })
  //     .slice(0, 6);
  // }, [problem, searchableItems]);

  const [suggestions, setSuggestions] = useState<{ title: string; domain: string; domainId: string; id: string }[]>([]);

  useEffect(() => {
    const q = problem.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const data = await res.json();
        const results = (data.results || [])
          .filter((r: any) => r.type === "solution")
          .slice(0, 6)
          .map((r: any) => ({ title: r.title, domain: r.domain, domainId: r.domain_id, id: r.id }));
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [problem]);

  // Close suggestions on outside click
  useEffect(() => {
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

  // const handleAdvisor = () => {
  //   if (problem.trim()) {
  //     setShowSuggestions(false);
  //     if (onSearch) {
  //       onSearch(problem.trim());
  //     } else {
  //       navigate(`/advisor?q=${encodeURIComponent(problem.trim())}`);
  //     }
  //   }
  // };

  const handleAdvisor = async () => {
    if (!problem.trim()) return;
    setShowSuggestions(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: problem.trim() }),
      });
      const data = await res.json();
      const results = (data.results || [])
        .filter((r: any) => r.type === "solution")
        .slice(0, 6)
        .map((r: any) => ({ title: r.title, domain: r.domain, domainId: r.domain_id, id: r.id }));
      setSuggestions(results);
    } catch {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (title: string) => {
    setShowSuggestions(false);
    setProblem(title);
    if (onSearch) {
      onSearch(title);
    } else {
      navigate(`/advisor?q=${encodeURIComponent(title)}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-white px-6 pb-10 pt-16">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Title */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          AI <span className="text-primary">LEAP</span> Platform
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Discover, explore, and deploy intelligent AI agents across enterprise domains. Build internal competency and accelerate GenAI adoption.
        </p>

        {/* Problem statement search */}
        <div className="relative z-30 mt-6 mx-auto max-w-2xl">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-white/80 backdrop-blur-sm shadow-sm px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
              <Search className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={problem}
                onChange={(e) => { setProblem(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && problem.trim()) {
                    e.preventDefault();
                    handleAdvisor();
                  }
                  if (e.key === "Escape") setShowSuggestions(false);
                }}
                placeholder="Describe your business problem… e.g. 'Automate customer support for retail'"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 placeholder:font-medium outline-none min-w-0"
              />
              {problem && (
                <button
                  onClick={() => { setProblem(""); setShowSuggestions(false); }}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
              )}
              <button
                onClick={handleAdvisor}
                disabled={!problem.trim()}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-primary px-5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-primary/90 disabled:cursor-not-allowed transition-colors"
              >
                Find Solutions
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Live autocomplete suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-lg z-50 overflow-hidden"
              >
                <div className="px-3 py-1.5 border-b border-border/40">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Suggestions
                  </span>
                </div>
                {suggestions.map((item) => (
                  <button
                    key={`${item.domainId}-${item.title}`}
                    onClick={() => handleSuggestionClick(item.title)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="text-foreground truncate">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 rounded-full bg-muted/60 px-2 py-0.5">{item.domain}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-8">
          <StatPill icon={Bot} value={42} label="AI Agents" suffix="+" />
          <StatPill icon={Layers} value={8} label="Domains" />
          <StatPill icon={BarChart3} value={4} label="Interactive Demos" />
          <StatPill icon={BookOpen} value={78} label="Case Studies" suffix="+" />
        </div>
      </div>
    </section>
  );
};

function StatPill({ icon: Icon, value, label, suffix = "" }: { icon: React.ElementType; value: number; label: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    let start = 0;
    const step = Math.ceil(value / 20);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, 40);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="text-left">
        <span className="block text-lg font-bold text-foreground">{display}{suffix}</span>
        <span className="text-xs">{label}</span>
      </div>
    </div>
  );
}

export default HeroSection;
