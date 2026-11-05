import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Search,
    ArrowRight,
    X,
    Lightbulb,
    Sparkles,
    Play,
    Code,
    ShoppingCart,
    Heart,
    DollarSign,
    Factory,
    Scale,
    Car,
    Code2,
    Package,
    GraduationCap,
    BarChart3,
    Wrench,
    Upload,
    Cpu,
} from "lucide-react";
import { branches } from "@/data/branches";
import agentsData from "@/data/agents.json";
import { agentPath } from "@/lib/agents";
import { ContentPanel } from "@/components/leap/ContentPanel";
import { LeapHeader } from "@/components/leap/LeapHeader";
import { SubsectionsSidebar } from "@/components/leap/SubsectionsSidebar";
import { useToast } from "@/hooks/use-toast";
import type { GlobalSearchTarget } from "@/types/globalSearch";

const domainIconMap: Record<string, any> = {
    ShoppingCart,
    HeartPulse: Heart,
    DollarSign,
    Factory,
    Scale,
    Car,
    Code2,
    Sparkles,
    Cpu,
};

interface IndexProps {
    onToggle?: (view: "classic" | "modern") => void;
}

const Index = ({ onToggle }: IndexProps) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // The URL query string is the source of truth for section navigation, so deep
    // links, bookmarks and refresh (F5) all restore the same view. State is seeded
    // from the URL on first render and kept in sync below.
    const [expanded, setExpanded] = useState(() => searchParams.has("branch"));
    const [activeBranch, setActiveBranch] = useState<string | null>(() =>
        searchParams.get("branch"),
    );
    const [activeChild, setActiveChild] = useState<string | null>(() =>
        searchParams.get("child"),
    );
    const [activeDomain, setActiveDomain] = useState<string | null>(() =>
        searchParams.get("domain"),
    );
    const [activeProject, setActiveProject] = useState<string | null>(() =>
        searchParams.get("project"),
    );
    const [navRequest, setNavRequest] = useState<GlobalSearchTarget | null>(
        null,
    );
    const [codeTabActive, setCodeTabActive] = useState(false);
    const [advisorQuery, setAdvisorQuery] = useState("");
    const [showLandingSuggestions, setShowLandingSuggestions] = useState(false);
    const [noSearchResults, setNoSearchResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const landingInputRef = useRef<HTMLInputElement>(null);
    const landingSuggestionsRef = useRef<HTMLDivElement>(null);
    const featuredScrollRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Reset scroll position of the root container when transitioning to the expanded sidebar layout
    useEffect(() => {
        if (expanded && rootRef.current) {
            rootRef.current.scrollTop = 0;
        }
    }, [expanded]);

    // ── URL ⇄ state sync ──────────────────────────────────────────────────────
    // Write the current section selection into the query string whenever it
    // changes (replace, so we don't spam history on every sub-selection).
    useEffect(() => {
        const next = new URLSearchParams(searchParams);
        const apply = (key: string, value: string | null) => {
            if (value) next.set(key, value);
            else next.delete(key);
        };
        apply("branch", expanded ? activeBranch : null);
        apply("child", expanded ? activeChild : null);
        apply("domain", expanded ? activeDomain : null);
        apply("project", expanded ? activeProject : null);
        // The upload-solution flag is only valid on the bare "Solutions by Industry"
        // list view. Drop it once the user drills into a domain/project or leaves
        // that view, so a stale flag can't reopen the modal on a later remount.
        if (
            next.get("upload-solution") === "true" &&
            (!expanded ||
                activeDomain ||
                activeProject ||
                activeBranch !== "solutions" ||
                activeChild !== "solutions-by-industry")
        ) {
            next.delete("upload-solution");
        }
        if (next.toString() !== searchParams.toString()) {
            setSearchParams(next, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expanded, activeBranch, activeChild, activeDomain, activeProject]);

    // React to external URL changes (back/forward, deep links) by mirroring them
    // back into state.
    useEffect(() => {
        const branch = searchParams.get("branch");
        const child = searchParams.get("child");
        const domain = searchParams.get("domain");
        const project = searchParams.get("project");
        setExpanded(Boolean(branch));
        setActiveBranch(branch);
        setActiveChild(child);
        setActiveDomain(domain);
        setActiveProject(project);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Build flat list of searchable items for landing autocomplete
    const landingSearchableItems = useMemo(() => {
        const items: {
            title: string;
            domain: string;
            domainId: string;
            useCaseId: string;
        }[] = [];
        for (const domain of agentsData.domains) {
            for (const uc of domain.use_cases) {
                items.push({
                    title: uc.title,
                    domain: domain.domain,
                    domainId: domain.id,
                    useCaseId: uc.id,
                });
            }
        }
        return items;
    }, []);

    const [landingSuggestions, setLandingSuggestions] = useState<
        { title: string; domain: string; domainId: string; useCaseId: string }[]
    >([]);

    // Autocomplete: local substring matching over the catalogue (instant, primary).
    // The LLM-backed /api/search is only used by the "Find Solutions" button.
    useEffect(() => {
        const q = advisorQuery.trim().toLowerCase();
        if (q.length < 2) {
            setLandingSuggestions([]);
            return;
        }
        const words = q.split(/\s+/);
        const matches = landingSearchableItems
            .filter((item) =>
                words.some((w) => item.title.toLowerCase().includes(w)),
            )
            .slice(0, 6);
        setLandingSuggestions(matches);
    }, [advisorQuery, landingSearchableItems]);

    // Featured Solutions — pinned to Smart Store and WPP agents.
    const featuredItems = useMemo(() => {
        const FEATURED_IDS = [
            "smart-store-supplychain-agent",
            "wpp-pricing-optimizer-agent",
        ];
        const items: { useCase: any; domainName: string; domainId: string }[] =
            [];
        for (const id of FEATURED_IDS) {
            for (const domain of agentsData.domains) {
                const uc = domain.use_cases.find((u: any) => u.id === id);
                if (uc) {
                    items.push({
                        useCase: uc,
                        domainName: domain.domain,
                        domainId: domain.id,
                    });
                    break;
                }
            }
        }
        return items;
    }, []);

    // Close landing suggestions on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                landingSuggestionsRef.current &&
                !landingSuggestionsRef.current.contains(e.target as Node) &&
                landingInputRef.current &&
                !landingInputRef.current.contains(e.target as Node)
            ) {
                setShowLandingSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Pick up navigation intent from Modern theme Quick Access cards
    useEffect(() => {
        const raw = localStorage.getItem("leap-nav");
        if (raw) {
            localStorage.removeItem("leap-nav");
            try {
                const { branch, child } = JSON.parse(raw);
                if (branch) {
                    setExpanded(true);
                    setActiveBranch(branch);
                    setActiveChild(child ?? null);
                }
            } catch {
                /* ignore bad JSON */
            }
        }
    }, []);

    const handleLeapClick = useCallback(() => {
        if (!expanded) {
            setExpanded(true);
            // Auto-select the first branch (Development)
            const firstBranch = branches[0];
            setActiveBranch(firstBranch?.id || null);
            // Auto-select the first child of the first branch
            if (firstBranch && firstBranch.children.length > 0) {
                setActiveChild(firstBranch.children[0].id);
            }
        }
    }, [expanded]);

    // Landing search: find the best-matching agent and open it in the Solutions ›
    // By industry view (same path as the domain cards). If nothing close matches,
    // surface a "no solution found" message instead of redirecting to the (now
    // hidden) AI Advisor.
    // "Find Solutions" button: LLM-backed semantic search via /api/search.
    // Opens the first (most relevant) solution it returns; otherwise shows the
    // on-screen "no matching solution" message.
    const handleLandingSearch = useCallback(async () => {
        const q = advisorQuery.trim();
        if (!q) return;
        setShowLandingSuggestions(false);
        setNoSearchResults(false);
        setIsSearching(true);
        try {
            const res = await fetch("/api/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: q }),
            });
            const data = await res.json();
            const results = (data.results || []).filter(
                (r: any) => r.type === "solution",
            );
            if (results.length > 0) {
                const first = results[0];
                setNoSearchResults(false);
                setAdvisorQuery("");
                setExpanded(true);
                setActiveBranch("solutions");
                setActiveChild("solutions-by-industry");
                setActiveDomain(first.domain_id);
                setActiveProject(first.id);
            } else {
                setNoSearchResults(true);
            }
        } catch {
            setNoSearchResults(true);
        } finally {
            setIsSearching(false);
        }
    }, [advisorQuery]);

    const handleBranchClick = useCallback((branchId: string) => {
        // Click branch parent → open the tabbed detail view for that branch
        setActiveBranch(branchId);
        // Services: landing page (tiles) - no subsection.
        // Solutions: land on By industry.
        // Others: auto-select first child.
        const branch = branches.find((b) => b.id === branchId);
        if (branchId === "solutions") {
            setActiveChild("solutions-by-industry");
        } else if (branchId === "services") {
            setActiveChild(null);
        } else if (branch && branch.children.length > 0) {
            setActiveChild(branch.children[0].id);
        } else {
            setActiveChild(null);
        }
        setActiveDomain(null);
        setActiveProject(null);
    }, []);

    const handleChildClick = useCallback(
        (branchId: string, childId: string) => {
            setActiveBranch(branchId);
            setActiveChild(childId);
            setActiveDomain(null);
            setActiveProject(null);
        },
        [],
    );

    const handleChildSelect = useCallback((childId: string | null) => {
        setActiveChild(childId);
        setActiveDomain(null);
        setActiveProject(null);
    }, []);

    const handleDomainSelect = useCallback((domainId: string) => {
        setActiveDomain(domainId);
    }, []);

    const handleProjectSelect = useCallback((projectId: string) => {
        setActiveProject(projectId);
    }, []);

    const handleProjectBack = useCallback(() => {
        setActiveProject(null);
    }, []);

    const handleBack = useCallback(() => {
        // Solutions › By industry auto-opens the first agent (sets project in the
        // URL), so a single back click should return straight to the industry grid
        // by clearing the domain and project together.
        if (
            activeBranch === "solutions" &&
            activeChild === "solutions-by-industry" &&
            (activeProject || activeDomain)
        ) {
            setActiveProject(null);
            setActiveDomain(null);
            return;
        }
        if (activeProject) {
            // Go back from project detail → projects grid
            setActiveProject(null);
        } else if (activeDomain) {
            // Go back from domain detail → domain grid
            setActiveDomain(null);
        }
    }, [activeProject, activeDomain, activeBranch, activeChild]);

    const handleHome = useCallback(() => {
        setActiveProject(null);
        setActiveDomain(null);
        setActiveChild(null);
        setActiveBranch(null);
        setExpanded(false);
        setNavRequest(null);
    }, []);

    const handleBranchBreadcrumb = useCallback(() => {
        // Click branch name in breadcrumb → go back to branch selection with children visible
        setActiveProject(null);
        setActiveDomain(null);
        setActiveChild(null);
        setActiveBranch(null);
    }, []);

    const handleChildBreadcrumb = useCallback(() => {
        // Click child name in breadcrumb → clear domain/project selection
        setActiveProject(null);
        setActiveDomain(null);
    }, []);

    // Escape key navigation - goes back within content or to home
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (activeProject || activeDomain) {
                    handleBack();
                } else if (expanded) {
                    handleHome();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleBack, handleHome, activeProject, activeDomain, expanded]);

    const handleGlobalNavigate = useCallback((target: GlobalSearchTarget) => {
        if (target.type === "externalUrl") {
            window.open(target.url, "_blank", "noopener,noreferrer");
            return;
        }

        // Ensure the main experience is visible.
        setExpanded(true);

        if (target.type === "productDetail") {
            setActiveBranch("solutions");
            setActiveChild("solutions-by-technology");
            setActiveDomain(null);
            setActiveProject(null);
            setNavRequest(target);
            return;
        }

        if (target.type === "industryUseCase") {
            setActiveBranch("solutions");
            setActiveChild("solutions-by-industry");
            setActiveDomain(null);
            setActiveProject(null);
            setNavRequest(target);
        }
    }, []);

    return (
        <div
            ref={rootRef}
            className={`h-screen bg-[#EDEDEE] relative ${expanded ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"}`}
        >
            {/* Header - always visible */}
            <LeapHeader
                expanded={expanded}
                onBack={handleHome}
                onHome={handleHome}
                onGlobalNavigate={handleGlobalNavigate}
                onToggleView={onToggle}
            />

            {/* ─── State 1: Landing ─── */}
            {!expanded && (
                <div
                    className="relative flex flex-col items-center overflow-y-auto overflow-x-hidden"
                    style={{ minHeight: "calc(100vh - 3.5rem)" }}
                >
                    {/* ── Hero Section ── */}
                    <div className="relative z-10 text-center max-w-2xl px-4 sm:px-6 pt-12 sm:pt-16 md:pt-20 animate-leap-fade-in-up">
                        <button
                            onClick={handleLeapClick}
                            className="group inline-block cursor-pointer"
                        >
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1C1C1E] tracking-tight mb-2">
                                AI LEAP Platform
                            </h1>
                        </button>
                        <p className="text-[#6B6B6B] text-base leading-[1.6] mb-4 max-w-lg mx-auto">
                            Accelerating enterprise AI adoption with intelligent
                            agents, learning paths, and development tools —
                            powered by{" "}
                            <span className="font-semibold text-[#3A3A3A]">
                                MAQ Software
                            </span>
                            .
                        </p>
                        <button
                            onClick={handleLeapClick}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B01E28] hover:underline transition-all"
                        >
                            Explore the Platform{" "}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    {/* ── AI Solution Advisor search ── */}
                    <div
                        className="relative z-30 w-full max-w-2xl px-4 sm:px-6 mt-2 sm:mt-3 animate-leap-fade-in-up"
                        style={{ animationDelay: "0.2s" }}
                    >
                        <div className="relative">
                            <div className="flex items-center gap-2.5 rounded-xl border border-[#DEDEDE] bg-white shadow-[0_1px_3px_rgba(20,20,20,0.05)] h-[52px] pl-4 pr-1.5">
                                <Search className="h-[18px] w-[18px] text-[#9B9B9B] flex-shrink-0" />
                                <input
                                    ref={landingInputRef}
                                    type="text"
                                    value={advisorQuery}
                                    onChange={(e) => {
                                        setAdvisorQuery(e.target.value);
                                        setShowLandingSuggestions(true);
                                        setNoSearchResults(false);
                                    }}
                                    onFocus={() =>
                                        setShowLandingSuggestions(true)
                                    }
                                    onKeyDown={(e) => {
                                        // Enter intentionally does nothing — search runs only via the
                                        // "Find Solutions" button.
                                        if (e.key === "Enter")
                                            e.preventDefault();
                                        if (e.key === "Escape")
                                            setShowLandingSuggestions(false);
                                    }}
                                    placeholder="Describe your business problem... e.g. 'Automate customer support for retail'"
                                    className="flex-1 bg-transparent text-[14.5px] text-[#2A2A2A] placeholder:text-[#9B9B9B] placeholder:font-normal outline-none min-w-0"
                                />
                                {advisorQuery && (
                                    <button
                                        onClick={() => {
                                            setAdvisorQuery("");
                                            setShowLandingSuggestions(false);
                                            setNoSearchResults(false);
                                        }}
                                        className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all flex-shrink-0"
                                    >
                                        <X
                                            className="h-3.5 w-3.5"
                                            strokeWidth={3}
                                        />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (advisorQuery.trim()) {
                                            handleLandingSearch();
                                        }
                                    }}
                                    disabled={isSearching}
                                    className="flex-shrink-0 flex items-center gap-[7px] rounded-lg h-10 px-[18px] text-[13.5px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: "#B01E28" }}
                                >
                                    {isSearching ? (
                                        <>
                                            Searching
                                            <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                        </>
                                    ) : (
                                        <>
                                            Find Solutions
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* No matching solution message */}
                            {noSearchResults && (
                                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-lg z-50 px-4 py-3 flex items-center gap-2">
                                    <Search className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
                                    <span className="text-sm text-muted-foreground">
                                        No matching solution found on the
                                        platform. Try a different keyword.
                                    </span>
                                </div>
                            )}

                            {/* Live autocomplete suggestions */}
                            {showLandingSuggestions &&
                                landingSuggestions.length > 0 && (
                                    <div
                                        ref={landingSuggestionsRef}
                                        className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-lg z-50 overflow-hidden"
                                    >
                                        <div className="px-3 py-1.5 border-b border-border/40">
                                            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                                <Lightbulb className="h-3 w-3" />
                                                Suggestions
                                            </span>
                                        </div>
                                        {landingSuggestions.map((item) => (
                                            <button
                                                key={`${item.domainId}-${item.title}`}
                                                onClick={() => {
                                                    setShowLandingSuggestions(
                                                        false,
                                                    );
                                                    setNoSearchResults(false);
                                                    setAdvisorQuery("");
                                                    setExpanded(true);
                                                    setActiveBranch(
                                                        "solutions",
                                                    );
                                                    setActiveChild(
                                                        "solutions-by-industry",
                                                    );
                                                    setActiveDomain(
                                                        item.domainId,
                                                    );
                                                    setActiveProject(
                                                        item.useCaseId,
                                                    );
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                                            >
                                                <span className="text-foreground truncate">
                                                    {item.title}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground shrink-0 rounded-full bg-muted/60 px-2 py-0.5">
                                                    {item.domain}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* ── Solutions by Industry ── */}
                    <section
                        className="w-full px-6 py-10 animate-leap-fade-in-up"
                        style={{ animationDelay: "0.3s" }}
                    >
                        <div className="mx-auto max-w-6xl">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">
                                        Solutions by Industry
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Explore AI agents tailored for specific
                                        business domains.
                                    </p>
                                </div>
                                <button
                                    onClick={() =>
                                        navigate(
                                            "/?branch=solutions&child=solutions-by-industry&upload-solution=true",
                                        )
                                    }
                                    className="flex shrink-0 items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-medium shadow-sm hover:border-primary hover:text-primary transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                    <span className="hidden sm:inline">
                                        Upload Solution
                                    </span>
                                    <span className="sm:hidden">Upload</span>
                                </button>
                            </div>
                            <div className="mt-6 flex flex-wrap justify-start gap-[18px]">
                                {agentsData.domains.map((d) => {
                                    const Icon =
                                        domainIconMap[d.icon] || ShoppingCart;
                                    const count = d.use_cases.length;
                                    const active = count > 0;
                                    return (
                                        <button
                                            key={d.id}
                                            onClick={() => {
                                                if (active) {
                                                    setExpanded(true);
                                                    setActiveBranch(
                                                        "solutions",
                                                    );
                                                    setActiveChild(
                                                        "solutions-by-industry",
                                                    );
                                                    setActiveDomain(d.id);
                                                    setActiveProject(null);
                                                }
                                            }}
                                            disabled={!active}
                                            className={`group relative w-[calc(50%-9px)] rounded-xl border border-[#E6E6E6] bg-white px-[22px] pb-[22px] pt-10 text-center transition-all sm:w-[calc(33.333%-12px)] md:w-[calc(20%-14.4px)] ${
                                                active
                                                    ? "cursor-pointer shadow-[0_1px_2px_rgba(20,20,20,0.04)] hover:border-[#D6D6D6] hover:shadow-[0_8px_22px_rgba(20,20,20,0.07)]"
                                                    : "cursor-default opacity-60"
                                            }`}
                                        >
                                            <span className="absolute right-3.5 top-3.5 flex items-center gap-[5px]">
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#B01E28]" : "bg-[#C4C4C4]"}`}
                                                />
                                                <span
                                                    className={`text-[13px] font-semibold ${active ? "text-[#B01E28]" : "text-[#9B9B9B]"}`}
                                                >
                                                    {count} solutions
                                                </span>
                                            </span>
                                            <div
                                                className={`mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#F4F4F5] ${active ? "text-[#565656]" : "text-[#8A8A8A]"}`}
                                            >
                                                <Icon
                                                    className="h-6 w-6"
                                                    strokeWidth={1.7}
                                                />
                                            </div>
                                            <div className="mb-1.5 text-base font-semibold text-[#1C1C1E]">
                                                {d.domain}
                                            </div>
                                            <div className="line-clamp-2 text-[13px] leading-[1.5] text-[#8A8A8A]">
                                                {d.description}
                                            </div>
                                            {active && (
                                                <div className="mt-2 text-xs font-medium text-[#8A8A8A] transition-colors group-hover:text-[#B01E28]">
                                                    Explore →
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                {/* Edge — static entry (0 use cases, disabled) */}
                                <button
                                    className="group relative w-[calc(50%-9px)] cursor-default rounded-xl border border-[#E6E6E6] bg-white px-[22px] pb-[22px] pt-10 text-center opacity-60 sm:w-[calc(33.333%-12px)] md:w-[calc(20%-14.4px)]"
                                    disabled
                                >
                                    <span className="absolute right-3.5 top-3.5 flex items-center gap-[5px]">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#C4C4C4]" />
                                        <span className="text-[13px] font-semibold text-[#9B9B9B]">
                                            0 solutions
                                        </span>
                                    </span>
                                    <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#F4F4F5] text-[#8A8A8A]">
                                        <Cpu className="h-6 w-6" strokeWidth={1.7} />
                                    </div>
                                    <div className="mb-1.5 text-base font-semibold text-[#1C1C1E]">
                                        Edge
                                    </div>
                                    <div className="line-clamp-2 text-[13px] leading-[1.5] text-[#8A8A8A]">
                                        Lightweight, high-performance AI agents
                                        designed to run at the edge.
                                    </div>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* ── Featured Solutions ── */}
                    <section
                        className="w-full px-6 py-10 animate-leap-fade-in-up"
                        style={{ animationDelay: "0.4s" }}
                    >
                        <div className="mx-auto max-w-6xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">
                                        Featured Solutions
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Try interactive demos and download code
                                        for these highlighted agents
                                    </p>
                                </div>
                            </div>
                            <div
                                ref={featuredScrollRef}
                                className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(18rem,1fr))]"
                            >
                                {featuredItems.map(
                                    ({ useCase, domainName, domainId }) => (
                                        <div
                                            key={useCase.id}
                                            onClick={() =>
                                                navigate(agentPath(useCase.id))
                                            }
                                            className="group flex cursor-pointer flex-col rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5 transition-all hover:border-[#D6D6D6] hover:shadow-md"
                                        >
                                            <h3 className="text-sm font-semibold text-foreground">
                                                {useCase.title}
                                            </h3>
                                            <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                                                {useCase.description}
                                            </p>
                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                                                    {domainName}
                                                </span>
                                            </div>
                                            <div className="mt-4 flex gap-2">
                                                <span className="flex items-center gap-1.5 rounded-lg bg-[#1C1C1E] px-3 py-1.5 text-xs font-medium text-white">
                                                    <Play className="h-3 w-3" />
                                                    Try It
                                                </span>
                                                {useCase.has_code && (
                                                    <span className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
                                                        <Code className="h-3 w-3" />
                                                        Code
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ── Quick Access ── */}
                    <section
                        className="w-full px-6 py-10 animate-leap-fade-in-up"
                        style={{ animationDelay: "0.5s" }}
                    >
                        <div className="mx-auto max-w-6xl">
                            <h2 className="text-xl font-bold text-foreground">
                                Quick Access
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Jump directly to platform sections
                            </p>
                            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                    {
                                        id: "products",
                                        branch: "solutions",
                                        child: "solutions-by-technology",
                                        icon: Package,
                                        title: "Products & Tools",
                                        description:
                                            "15+ enterprise AI products including EmbedFAST, AI-DataLens, CertyFAST, and more.",
                                        stat: "15+ products",
                                    },
                                    {
                                        id: "training",
                                        branch: "training",
                                        child: "coe",
                                        icon: GraduationCap,
                                        title: "Training & Workshops",
                                        description:
                                            "COE programs, hands-on workshops, and learning paths for GenAI and Agentic AI.",
                                        stat: "3 programs",
                                    },
                                    {
                                        id: "case-studies",
                                        branch: "case-studies",
                                        child: undefined,
                                        icon: BarChart3,
                                        title: "Case Studies",
                                        description:
                                            "78+ real-world success stories across Agentic AI, data modernization, and analytics.",
                                        stat: "78+ studies",
                                    },
                                    {
                                        id: "productivity",
                                        branch: "productivity",
                                        child: "solutions-tools",
                                        icon: Wrench,
                                        title: "Productivity Tools",
                                        description:
                                            "SWE Agent, DocuSphere, Prompt Playbook, and reusable components for rapid development.",
                                        stat: "3 tools",
                                    },
                                    /* Knowledge Hub commented out */
                                    /* { id: "knowledge", branch: "knowledge-hub", child: "kb-architectures", icon: Lightbulb, title: "Knowledge Hub", description: "Architecture gallery, No Code / Low Code / Pro Code decision guide, and evaluation framework.", stat: "3 guides" }, */
                                ].map((c) => {
                                    const QIcon = c.icon;
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                setExpanded(true);
                                                setActiveBranch(c.branch);
                                                setActiveChild(c.child ?? null);
                                                setActiveDomain(null);
                                                setActiveProject(null);
                                            }}
                                            className="group flex flex-col rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5 text-left transition-all hover:border-[#D6D6D6] hover:shadow-md"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F4F4F5]">
                                                    <QIcon className="h-5 w-5 text-[#565656]" />
                                                </div>
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {c.stat}
                                                </span>
                                            </div>
                                            <h3 className="mt-4 text-sm font-semibold text-foreground">
                                                {c.title}
                                            </h3>
                                            <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                                                {c.description}
                                            </p>
                                            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                                                Explore{" "}
                                                <ArrowRight className="h-3 w-3" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ── Footer ── */}
                    <footer className="w-full border-t border-[#E6E6E6] bg-white px-8 py-6 text-center">
                        <p className="text-[13px] text-[#9B9B9B]">
                            © {new Date().getFullYear()} MAQ Software. All
                            rights reserved. —{" "}
                            <span className="font-semibold text-[#B01E28]">
                                AI LEAP Platform
                            </span>
                        </p>
                    </footer>
                </div>
            )}

            {/* ─── State 2: Sidebar + Content Layout ─── */}
            {expanded && (
                <div className="flex h-[calc(100vh-3rem-var(--banner-height,0px))] sm:h-[calc(100vh-3.5rem-var(--banner-height,0px))]">
                    {/* Branches Sidebar with subsections */}
                    <SubsectionsSidebar
                        branches={branches}
                        activeBranch={activeBranch}
                        activeChild={activeChild}
                        onBranchClick={handleBranchClick}
                        onChildClick={(childId: string) => {
                            if (activeBranch) {
                                handleChildClick(activeBranch, childId);
                            }
                        }}
                        onBack={handleHome}
                        forceCollapsed={codeTabActive}
                    />

                    {/* Main content area */}
                    <div className="flex-1 min-w-0 overflow-hidden animate-leap-fade-in-up pt-12 md:pt-0">
                        {activeBranch && (
                            <ContentPanel
                                activeBranch={activeBranch}
                                activeChild={activeChild}
                                activeDomain={activeDomain}
                                activeProject={activeProject}
                                onBack={handleBack}
                                onChildSelect={handleChildSelect}
                                onDomainSelect={handleDomainSelect}
                                onProjectSelect={handleProjectSelect}
                                onProjectBack={handleProjectBack}
                                navRequest={navRequest}
                                onNavRequestApplied={() => setNavRequest(null)}
                                onCodeTabActive={setCodeTabActive}
                                advisorQuery={
                                    activeBranch === "ai-advisor"
                                        ? advisorQuery
                                        : undefined
                                }
                                initialUploadModalOpen={
                                    searchParams.get("upload-solution") ===
                                        "true" &&
                                    !activeDomain &&
                                    !activeProject
                                }
                                onNavigate={(branchId, childId) => {
                                    setActiveBranch(branchId);
                                    setActiveChild(childId);
                                    setActiveDomain(null);
                                    setActiveProject(null);
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Index;
