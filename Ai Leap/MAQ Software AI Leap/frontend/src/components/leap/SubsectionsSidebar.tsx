import { FC, useEffect, useState, useMemo, useRef } from "react";
import { ChevronDown, ChevronRight, ArrowLeft, ChevronLeft, Search, X, Menu } from "lucide-react";
import { BranchConfig } from "@/data/branches";
import { useIsMobile } from "@/hooks/use-mobile";

interface SubsectionsSidebarProps {
  branches: BranchConfig[];
  activeBranch: string | null;
  activeChild: string | null;
  onBranchClick: (branchId: string) => void;
  onChildClick: (childId: string) => void;
  onBack: () => void;
  forceCollapsed?: boolean;
}

export const SubsectionsSidebar: FC<SubsectionsSidebarProps> = ({
  branches,
  activeBranch,
  activeChild,
  onBranchClick,
  onChildClick,
  onBack,
  forceCollapsed,
}) => {
  const [expandedBranch, setExpandedBranch] = useState<string | null>(activeBranch);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // On mobile the drawer always shows full labels (collapse only applies to desktop)
  const showCollapsed = !isMobile && collapsed;

  useEffect(() => {
    setExpandedBranch(activeBranch);
  }, [activeBranch]);

  useEffect(() => {
    if (forceCollapsed !== undefined) setCollapsed(forceCollapsed);
  }, [forceCollapsed]);

  // Filter branches and children based on search query
  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches;

    const query = searchQuery.toLowerCase().trim();
    return branches
      .map((branch) => {
        const matchingChildren = branch.children.filter(
          (child) =>
            child.label.toLowerCase().includes(query) ||
            child.description.toLowerCase().includes(query)
        );
        const branchMatches = branch.label.toLowerCase().includes(query);
        // Show branch if it matches or has matching children
        if (branchMatches || matchingChildren.length > 0) {
          return {
            ...branch,
            children: branchMatches ? branch.children : matchingChildren,
          };
        }
        return null;
      })
      .filter(Boolean) as BranchConfig[];
  }, [branches, searchQuery]);

  const handleBranchClick = (branchId: string) => {
    if (expandedBranch === branchId) {
      setExpandedBranch(null);
    } else {
      setExpandedBranch(branchId);
    }
    onBranchClick(branchId);
    // On mobile, close the drawer so the selected screen is visible immediately.
    if (isMobile) setMobileOpen(false);
  };

  const handleSearchResultClick = (branchId: string, childId: string) => {
    onBranchClick(branchId);
    onChildClick(childId);
    setSearchQuery("");
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  // Keyboard shortcut: Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (!collapsed) {
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [collapsed]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <>
      {/* Mobile: floating open button (only when drawer closed) */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-14 sm:top-16 left-2 z-30 p-2 rounded-md bg-card border border-border shadow-sm"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile: backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`flex flex-col overflow-hidden border-r border-border bg-card/50 ${
          isMobile
            ? `fixed top-12 sm:top-14 bottom-0 left-0 z-40 w-64 transform transition-transform duration-300 ${
                mobileOpen ? "translate-x-0" : "-translate-x-full"
              }`
            : `h-full transition-all duration-300 ${showCollapsed ? "w-14 md:w-16" : "w-40 md:w-44 xl:w-48 2xl:w-56"}`
        }`}
      >
      {/* Header */}
      <div className={`px-1.5 md:px-2 py-2 md:py-3 border-b border-border flex-shrink-0 flex items-center ${showCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
        <button
          onClick={onBack}
          className={`flex items-center gap-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all ${showCollapsed ? 'p-2 justify-center' : 'px-3 py-1.5'}`}
          title="Back to LEAP"
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" />
          {!showCollapsed && <span className="text-sm font-medium">Back</span>}
        </button>

        {isMobile ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Branches List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="py-2 px-2 space-y-1">
          {/* No results state */}
          {isSearching && filteredBranches.length === 0 && (
            <div className="px-3 py-6 text-center">
              <Search className="w-5 h-5 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground/60">No items found</p>
              <p className="text-[10px] text-muted-foreground/40 mt-1">Try a different keyword</p>
            </div>
          )}

          {filteredBranches/* .filter(b => b.id !== "leaderboard") // leaderboard filter - commented out */.map((branch) => {
            const Icon = branch.icon;
            const isExpanded = isSearching || expandedBranch === branch.id;
            const isActive = activeBranch === branch.id;

            return (
              <div key={branch.id}>
                <button
                  onClick={() => !isSearching && handleBranchClick(branch.id)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-150 group ${isActive && !isSearching ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-card/30'}`}
                >
                  <div className={`w-8 h-8 flex items-center justify-center rounded-md bg-muted/50 ${showCollapsed ? 'mx-auto' : ''}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {!showCollapsed && (
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{branch.label}</div>
                    </div>
                  )}

                  {!showCollapsed && !isSearching && (
                    <div className="ml-2">
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  )}
                </button>

                {isExpanded && !showCollapsed && branch.id !== "solutions" && branch.id !== "services" && (
                  <div className="mt-1 ml-10 space-y-1">
                    {branch.children.map((child) => {
                      const isChildActive = activeChild === child.id && activeBranch === branch.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => {
                            if (isSearching) {
                              handleSearchResultClick(branch.id, child.id);
                            } else {
                              onChildClick(child.id);
                            }
                            if (isMobile) setMobileOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md transition-colors ${isChildActive ? 'bg-primary/10 text-primary' : 'hover:bg-card/10'}`}
                        >
                          <div className="text-sm font-medium">
                            {isSearching ? highlightMatch(child.label, searchQuery) : child.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard pinned to bottom - commented out */}
      {/* {(() => {
        const lb = branches.find(b => b.id === "leaderboard");
        if (!lb) return null;
        const Icon = lb.icon;
        const isActive = activeBranch === "leaderboard";
        return (
          <div className="flex-shrink-0 border-t border-border px-2 py-2">
            <button
              onClick={() => { handleBranchClick("leaderboard"); if (isMobile) setMobileOpen(false); }}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-150 group ${isActive ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-card/30'}`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-md bg-muted/50 ${showCollapsed ? 'mx-auto' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              {!showCollapsed && (
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">Leaderboard</div>
                </div>
              )}
            </button>
          </div>
        );
      })()} */}
      </div>
    </>
  );
};

/** Highlight matching text segments */
function highlightMatch(text: string, query: string): JSX.Element {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return <>{text}</>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.trim().length);
  const after = text.slice(idx + query.trim().length);
  return (
    <>
      {before}
      <span className="bg-primary/20 text-primary rounded-sm px-0.5">{match}</span>
      {after}
    </>
  );
}

export default SubsectionsSidebar;
