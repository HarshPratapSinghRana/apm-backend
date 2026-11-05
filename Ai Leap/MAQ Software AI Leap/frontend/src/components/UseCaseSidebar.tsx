import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X, Star, Users, List } from "lucide-react";
import { compareUseCasesByPriority } from "@/lib/useCaseOrdering";
import { useRatings } from "@/hooks/useRatings";
import { useAdoption } from "@/hooks/useAdoption";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFeedbackSummary } from "@/hooks/useFeedbackSummary";

interface UseCase {
  id: string;
  title: string;
  description: string;
  has_code?: boolean;
  architecture?: string;
  maturity?: string;
}

interface UseCaseSidebarProps {
  useCases: UseCase[];
  selectedUseCaseId: string | null;
  onSelectUseCase: (useCaseId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  sidebarLabel?: string;
  searchPlaceholder?: string;
}

const UseCaseSidebar = ({
  useCases,
  selectedUseCaseId,
  onSelectUseCase,
  isCollapsed,
  onToggleCollapse,
  sidebarLabel = "Use Cases",
  searchPlaceholder = "Search cases...",
}: UseCaseSidebarProps) => {
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"recommended" | "liked">("recommended");
  const filteredUseCases = useCases.filter(
    (uc) =>
      uc.title.toLowerCase().includes(search.toLowerCase()) ||
      uc.description.toLowerCase().includes(search.toLowerCase())
  );

  // Persisted Like/Dislike counts (from SharePoint via the backend), keyed by
  // agent name/title. Only fetched while the "Most Liked" sort is active.
  const { summary: likesSummary } = useFeedbackSummary(sortMode === "liked");

  // Net-like score for a use case (likes minus dislikes), matched by title.
  const netLikes = (uc: UseCase) => {
    const counts = likesSummary[uc.title];
    return counts ? counts.likes - counts.dislikes : 0;
  };

  // Sort comparator: "liked" ranks by net likes (from the backend), falling
  // back to the default priority order; otherwise use priority order.
  const sortUseCases = (a: UseCase, b: UseCase) => {
    if (sortMode === "liked") {
      const diff = netLikes(b) - netLikes(a);
      if (diff !== 0) return diff;
    }
    return compareUseCasesByPriority(a, b);
  };
  useEffect(() => {
    if (!isCollapsed && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed]);

  const clearSearch = () => setSearch("");

  const MATURITY_LEVELS = ["Concept", "Pilot", "Production"];

  // On mobile the sidebar is an overlay drawer; collapse styling only applies on desktop.
  const showCollapsed = !isMobile && isCollapsed;

  return (
    <>
      {/* Mobile: floating button to open the use-case list */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-4 left-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg"
          aria-label={`Open ${sidebarLabel}`}
        >
          <List className="w-4 h-4" />
          {sidebarLabel}
        </button>
      )}

      {/* Mobile: backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`bg-sidebar border-r border-sidebar-border flex flex-col ${
          isMobile
            ? `fixed top-12 sm:top-14 bottom-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-300 ${
                mobileOpen ? "translate-x-0" : "-translate-x-full"
              }`
            : `transition-all duration-300 ${showCollapsed ? "w-12" : "w-48 lg:w-52 xl:w-60 2xl:w-72"}`
        }`}
      >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2">
          {!showCollapsed && (
            <h2 className="font-semibold text-foreground whitespace-nowrap">{sidebarLabel}</h2>
          )}
          {isMobile ? (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 hover:bg-sidebar-hover rounded-md transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 hover:bg-sidebar-hover rounded-md transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {!showCollapsed && (
          <div className="relative mt-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-8 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-xl transition-colors"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sort toggle */}
      {!showCollapsed && (
        <div className="px-2 py-2 border-b border-sidebar-border overflow-hidden">
          <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
            <button
              onClick={() => setSortMode("recommended")}
              className={`flex-1 min-w-0 px-1.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                sortMode === "recommended"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Recommended
            </button>
            <button
              onClick={() => setSortMode("liked")}
              className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                sortMode === "liked"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star className={`w-3 h-3 shrink-0 ${sortMode === "liked" ? "fill-amber-400 text-amber-400" : ""}`} />
              Liked
            </button>
          </div>
        </div>
      )}

      {/* Use Cases List */}
     <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!showCollapsed && (
          <div className="p-2 space-y-1">
            {[...filteredUseCases]
              .sort(sortUseCases)
              .map((useCase) => (
                <SidebarItem
                  key={useCase.id}
                  useCase={useCase}
                  isSelected={selectedUseCaseId === useCase.id}
                  onSelect={(id) => { onSelectUseCase(id); if (isMobile) setMobileOpen(false); }}
                  maturityLevels={MATURITY_LEVELS}
                />
            ))}
          </div>
        )}

        {showCollapsed && (
          <div className="p-2 space-y-2">
            {[...filteredUseCases]
              .sort(sortUseCases)
              .map((useCase, index) => (
                <button
                  key={useCase.id}
                  onClick={() => onSelectUseCase(useCase.id)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
                    selectedUseCaseId === useCase.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-sidebar-hover text-muted-foreground hover:bg-sidebar-active"
                  }`}
                  title={`${useCase.title}\n\n${useCase.description}`}
                >
                  {index + 1}
                </button>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

/* ── Sidebar item: enhanced for voice-faq-agent, standard for others ── */
const SidebarItem = ({
  useCase,
  isSelected,
  onSelect,
  maturityLevels,
}: {
  useCase: UseCase;
  isSelected: boolean;
  onSelect: (id: string) => void;
  maturityLevels: string[];
}) => {
  const isEnhanced = true;
  const { avgRating, totalRatings } = useRatings(useCase.id);
  const { adoptionCount } = useAdoption(useCase.id);
  const matIdx = maturityLevels.findIndex((m) => m === useCase.maturity);
  const itemRef = useRef<HTMLButtonElement>(null);

  // Scroll the selected item to the top of the sidebar list (only scrolls the
  // list's own scroll container, not the whole page).
  useEffect(() => {
    if (!isSelected || !itemRef.current) return;
    const el = itemRef.current;
    let scrollParent: HTMLElement | null = el.parentElement;
    while (scrollParent) {
      const style = getComputedStyle(scrollParent);
      if (/(auto|scroll)/.test(style.overflowY)) break;
      scrollParent = scrollParent.parentElement;
    }
    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const top =
        scrollParent.scrollTop + (elRect.top - parentRect.top) - 8; /* small top gap */
      scrollParent.scrollTo({ top, behavior: "smooth" });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isSelected]);

  return (
    <button
      ref={itemRef}
      onClick={() => onSelect(useCase.id)}
      className={`use-case-item w-full text-left ${isSelected ? "active" : ""}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-medium text-sm text-foreground flex-1 truncate">
          {useCase.title}
        </h3>
      </div>
      {/* Enhanced row — only for voice-faq-agent */}
      {isEnhanced && (
        <div className="space-y-1.5 mt-1">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {avgRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {avgRating.toFixed(1)} ({totalRatings})
              </span>
            )}
            {adoptionCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {adoptionCount} team{adoptionCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      )}
    </button>
  );
};

export default UseCaseSidebar;