import { FC, useMemo, useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown, Search, LayoutGrid, Bot, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ViewToggle from "@/components/ui/ViewToggle";
import agentsData from "@/data/agents.json";
import { branches } from "@/data/branches";
import { caseStudies } from "@/data/case-studies";
import type { GlobalSearchResult, GlobalSearchTarget } from "@/types/globalSearch";
import {
} from "@/components/ui/command";

interface LeapHeaderProps {
  expanded: boolean;
  onBack: () => void;
  onHome: () => void;
  onGlobalNavigate: (target: GlobalSearchTarget) => void;
  onToggleView?: (view: "classic" | "modern") => void;
}

export const LeapHeader: FC<LeapHeaderProps> = ({
  expanded,
  onBack,
  onHome,
  onGlobalNavigate,
  onToggleView,
}) => {
  const { signOut, accounts } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const user = accounts[0];
  const userName = user?.name || "User";
  const userEmail = user?.username || "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close search suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo<GlobalSearchResult[]>(() => {
    // Products: derive from Solutions → Products cards (including flattened ones).
    const productsChild = branches
      .find((b) => b.id === "solutions")
      ?.children.find((c) => c.id === "solutions-by-technology");

    const productResults: GlobalSearchResult[] =
      (productsChild?.cards ?? [])
        .filter((c) => !!c.productDetailId)
        .map((c) => ({
          id: `product:${c.productDetailId}`,
          title: c.label,
          subtitle: "Solutions → By technology",
          group: "Products",
          target: { type: "productDetail", productId: c.productDetailId! },
        })) ?? [];

    const useCaseResults: GlobalSearchResult[] = agentsData.domains.flatMap((d: any) =>
      (d.use_cases ?? []).map((uc: any) => ({
        id: `usecase:${d.id}:${uc.id}`,
        title: uc.title,
        subtitle: `${d.domain} → Use Cases`,
        group: "Industry Use Cases",
        target: { type: "industryUseCase", domainId: d.id, useCaseId: uc.id },
      }))
    );

    const caseStudyResults: GlobalSearchResult[] = caseStudies.map((cs) => ({
      id: `casestudy:${cs.id}`,
      title: cs.title,
      subtitle: cs.category,
      group: "Case Studies",
      target: { type: "externalUrl", url: cs.url },
    }));

    return [...productResults, ...useCaseResults, ...caseStudyResults];
  }, []);

  // Ctrl/Cmd + K focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      const mod = navigator.platform.toLowerCase().includes("mac") ? e.metaKey : e.ctrlKey;
      if (mod && isK) {
        e.preventDefault();
        setSearchFocused(true);
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchResults.filter((r) => {
      const blob = `${r.title} ${r.subtitle ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [searchQuery, searchResults]);

  const grouped = useMemo(() => {
    const map: Record<GlobalSearchResult["group"], GlobalSearchResult[]> = {
      Products: [],
      "Industry Use Cases": [],
      "Case Studies": [],
      Other: [],
    };
    for (const r of filteredResults) map[r.group].push(r);
    return map;
  }, [filteredResults]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md">
      <div className="w-full mx-auto flex items-center justify-between h-12 sm:h-14 px-3 sm:px-4 md:px-6">
        {/* Left: MAQ Logo + LEAP brand */}
        <button
          onClick={onHome}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img
            src="/MAQ-Software-Logo.svg"
            alt="MAQ Software"
            className="h-4 sm:h-5 w-auto"
          />
          {expanded && (
            <>
              <div className="h-4 sm:h-5 w-px bg-border" />
              <span className="font text-base sm:text-lg text-foreground tracking-tight">
                AI LEAP Platform
              </span>
            </>
          )}
        </button>

        {/* Spacer to push right side controls */}
        <div className="flex-1" />

        {/* Right: Toggle + User Profile */}
        <div className="flex items-center gap-3">
          {onToggleView && (
            <ViewToggle current="classic" onChange={onToggleView} />
          )}
          {/* <span className="text-xs text-muted-foreground hidden md:block">
            MAQ Software &middot; AI Enablement Platform
          </span> */}
          
          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-[#BA141A] flex items-center justify-center text-white text-xs font-semibold">
                {userInitials}
              </div>
              <span className="text-sm font-medium text-foreground hidden md:block max-w-[120px] truncate">
                {userName}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showDropdown ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-lg py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#BA141A] flex items-center justify-center text-white text-sm font-semibold">
                      {userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                      <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <div className="px-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search suggestions are rendered under the search bar */}
    </header>
  );
};
