import { FC, useState, useMemo } from "react";
import { ExternalLink, Search, BookOpen, BrainCircuit, Database, BarChart3, AppWindow, Cloud, Shield } from "lucide-react";
import {
  caseStudies,
  caseStudyCategories,
  type CaseStudyCategory,
  type CaseStudy,
} from "@/data/case-studies";

/* ─── Category Icon Map ─── */
const categoryIcons: Record<CaseStudyCategory, FC<{ className?: string }>> = {
  All: BookOpen,
  "Agentic AI & Machine Learning": BrainCircuit,
  "Data & Analytics": Database,
  "Reporting & Visualization": BarChart3,
  "Application Modernization": AppWindow,
  "Cloud Optimization": Cloud,
  Security: Shield,
};

/* ─── Main Component ─── */
export const CaseStudiesContent: FC = () => {
  const [activeCategory, setActiveCategory] = useState<CaseStudyCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let results = caseStudies;
    if (activeCategory !== "All") {
      results = results.filter((cs) => cs.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter((cs) => cs.title.toLowerCase().includes(q));
    }
    return results;
  }, [activeCategory, searchQuery]);

  /* count per category */
  const counts = useMemo(() => {
    const map: Record<string, number> = { All: caseStudies.length };
    caseStudyCategories.forEach((cat) => {
      if (cat !== "All") {
        map[cat] = caseStudies.filter((cs) => cs.category === cat).length;
      }
    });
    return map;
  }, []);

  return (
    <div className="space-y-6 animate-leap-fade-in-up">
      {/* ─── Header ─── */}
      {/* <div>
        <h2 className="text-xl font-bold text-foreground">
          Case Studies
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Real-world examples and success stories showcasing our solutions in action
        </p>
      </div> */}

      {/* ─── Search Bar ─── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search case studies…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
        />
      </div>

      {/* ─── Category Filters ─── */}
      <div className="flex flex-wrap gap-2">
        {caseStudyCategories.map((cat) => {
          const Icon = categoryIcons[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat}
              <span
                className={`ml-1 text-[10px] rounded-full px-1.5 py-0.5 ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[cat]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Results Count ─── */}
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
        {filtered.length === 1 ? "case study" : "case studies"}
        {activeCategory !== "All" && (
          <span>
            {" "}in <span className="font-semibold text-primary">{activeCategory}</span>
          </span>
        )}
      </p>

      {/* ─── Cards Grid ─── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No case studies found for your search.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setActiveCategory("All");
            }}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="cards-grid-symmetric">
          {filtered.map((cs, index) => (
            <CaseStudyCard key={cs.id} caseStudy={cs} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Individual Card ─── */
const CaseStudyCard: FC<{ caseStudy: CaseStudy; index: number }> = ({
  caseStudy,
  index,
}) => {
  const Icon = categoryIcons[caseStudy.category];

  return (
    <a
      href={caseStudy.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group text-left w-full h-full"
      style={{
        animationDelay: `${index * 40}ms`,
        animation: "fadeInUp 0.5s ease-out both",
      }}
    >
      <div className="relative domain-card h-full overflow-hidden">
        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

        <div className="flex flex-col h-full relative z-10">
          {/* Top: category badge */}
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <Icon className="w-3 h-3" />
              {caseStudy.category}
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors leading-snug flex-1">
            {caseStudy.title}
          </h3>

          {/* Footer: read more */}
          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/50">
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors">
              Read Full Article
            </span>
          </div>
        </div>

        {/* Bottom border animation */}
        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-500" />
      </div>
    </a>
  );
};
