import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, Play, ExternalLink, TrendingUp, Copy, BookOpen, Zap, Folder, Newspaper, MessageCircle, Send, Loader2, Crown, GitBranch, Mail, HelpCircle, Lock, Clock, UserCheck, TrendingDown, Rocket, ShoppingCart, Users, ChevronDown, ChevronUp, ArrowRight, X, Info, Presentation } from "lucide-react";
import { getComponentByName, hasComponent } from './ComponentRegistry';
import { DynamicComponentWrapper } from './DynamicComponentWrapper';
import CodebaseTab from "./CodebaseTab";
import ArtifactsTab from "./ArtifactsTab";
import ArchitectureTechStack from "./ArchitectureTechStack";
import { useMsal } from "@azure/msal-react";
import { caseStudies, type CaseStudy } from "@/data/case-studies";
import { getMediaUrls, getMergedContributors } from "@/api/api";
import { getOwnership } from "@/data/code-ownership";
import agentsData from "@/data/agents.json";
import { AgentFeedbackPanel } from "./AgentFeedbackPanel";

interface UseCase {
  id: string;
  title: string;
  description: string;
  key_features: string[];
  impact: string;
  has_video?: boolean;
  blog_url?: string;
  category?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  estimated_time?: string;
  popularity_score?: number;
  tags?: string[];
  architecture?: string;
  component?: string;
  has_code?: boolean;
  github_repo?: string;
  maturity?: string;
  featured?: boolean;
  impact_metrics?: { value: string; label: string; icon: string }[];
}

interface TabContentProps {
  useCase: UseCase | null;
  onTabChange?: (tab: string) => void;
  initialTab?: "details" | "try" | "codebase" | "artifacts" | "contact";
}

const TabContent = ({ useCase, onTabChange, initialTab = "details" }: TabContentProps) => {
  // NOTE: All tabs are now exposed in the UI.
  const [activeTab, setActiveTab] = useState<"details" | "try" | "codebase" | "artifacts" | "contact">(initialTab);
  const [prevUseCaseId, setPrevUseCaseId] = useState<string | null>(null);
  const [prevUseCaseId, setPrevUseCaseId] = useState<string | null>(null);

  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  // Source of truth for code availability is the backend media_urls.json,
  // surfaced via getMediaUrls(). The Code tab is enabled ONLY when that entry
  // actually points at a code base or a GitHub repo — never just because
  // useCase.has_code is true. A 404 (no entry) resolves to "no code".
  const [hasCode, setHasCode] = useState(false);
  const [hasArtifacts, setHasArtifacts] = useState(false);
  const [mediaChecked, setMediaChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!useCase?.id) {
      setHasCode(false);
      setHasArtifacts(false);
      setMediaChecked(true);
      return;
    }
    setMediaChecked(false);
    getMediaUrls(useCase.id)
      .then((media) => {
        if (cancelled) return;
        setHasCode(Boolean(media.code_base || media.github_repo));
        setHasArtifacts(Boolean(media.has_artifacts));
      })
      .catch(() => {
        if (!cancelled) {
          setHasCode(false);
          setHasArtifacts(false);
        }
      })
      .finally(() => {
        if (!cancelled) setMediaChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [useCase?.id]);

  // If the Code tab is active but this use case has no code, fall back to Details.
  useEffect(() => {
    if (mediaChecked && !hasCode && activeTab === "codebase") {
      setActiveTab("details");
    }
    if (mediaChecked && !hasArtifacts && activeTab === "artifacts") {
      setActiveTab("details");
    }
  }, [mediaChecked, hasCode, hasArtifacts, activeTab]);
  

  useEffect(() => {
    if (useCase && useCase.id !== prevUseCaseId) {
      setLoading(true);
      setPrevUseCaseId(useCase.id);
      const timeout = setTimeout(() => setLoading(false), 600);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCase?.id]);

  const handleCopyLink = async () => {
    try {
      const text = useCase
        ? `${useCase.title}\n\n${useCase.description ?? ""}`.trim()
        : window.location.href;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!useCase) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Play className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-foreground">
              Discover AI Solutions
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              Select a use case from the sidebar to explore detailed features, watch demos, and try interactive experiences
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-background overflow-hidden">
      {/* Solution name — always shown above the tab navigation */}
      <div className="border-b border-border bg-card px-6 pt-5 pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{useCase.title}</h1>
            {useCase.maturity && (
              <span className="px-3 py-1 text-sm font-semibold rounded-full border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                {useCase.maturity}
              </span>
            )}
            {useCase.architecture && (
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {useCase.architecture}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInstallModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-sm transition-all cursor-pointer"
              title="Install this AI agent and skills in Engineering Commons (VS Code & CLI)"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Install in Engineering Commons</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab("details")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "details"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="w-4 h-4 inline-block mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab("try")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "try"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="w-4 h-4 inline-block mr-2" />
              Try now
            </button>
            {hasArtifacts ? (
              <button
                onClick={() => setActiveTab("artifacts")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "artifacts"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Presentation className="w-4 h-4 inline-block mr-2" />
                Artifacts
              </button>
            ) : (
              <button
                onClick={() => hasCode && setActiveTab("codebase")}
                disabled={!hasCode}
                title={hasCode ? undefined : "No code base available for this agent"}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  !hasCode
                    ? "border-transparent text-muted-foreground/40 cursor-not-allowed"
                    : activeTab === "codebase"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Folder className="w-4 h-4 inline-block mr-2" />
                Code
              </button>
            )}
            <button
              onClick={() => setActiveTab("contact")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "contact"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageCircle className="w-4 h-4 inline-block mr-2" />
              Contact
            </button>
          </div>

          {/* Share Feedback button */}
          <AgentFeedbackPanel agentName={useCase.title} buttonMode />
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-28">
        {loading ? (
          <SkeletonTabContent />
        ) : activeTab === "details" ? (
          <EnhancedDetailsTab useCase={useCase} onTabChange={(t) => setActiveTab(t as any)} />
        ) : activeTab === "try" ? (
          <TryItTab useCase={useCase} />
        ) : activeTab === "codebase" ? (
          <CodebaseTab useCase={useCase} />
        ) : activeTab === "artifacts" ? (
          <ArtifactsTab useCase={useCase} />
        ) : (
          <ContactTab useCase={useCase} />
        )}
      </div>
    </div>
  );
};

// Enhanced Skeleton loader
const SkeletonTabContent = () => (
  <div className="tab-content p-6 space-y-6 animate-pulse">
    {/* Header skeleton */}
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="h-8 w-1/3 bg-muted rounded-lg" />
        <div className="h-6 w-20 bg-muted rounded-full" />
      </div>
      <div className="h-4 w-2/3 bg-muted rounded" />
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-muted rounded-full" />
        <div className="h-6 w-20 bg-muted rounded-full" />
        <div className="h-6 w-14 bg-muted rounded-full" />
      </div>
    </div>

    {/* Stats skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 cards-grid-symmetric">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-xl border border-card-border p-4 space-y-2">
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-6 w-1/2 bg-muted rounded" />
        </div>
      ))}
    </div>

    {/* Content grid skeleton */}
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-card rounded-xl border border-card-border p-6 space-y-4">
          <div className="h-5 w-1/4 bg-muted rounded mb-2" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-5 h-5 bg-muted rounded-full mt-0.5" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-br from-primary-subtle to-primary-subtle/50 rounded-xl border border-primary/20 p-6">
          <div className="h-5 w-1/4 bg-muted rounded mb-4" />
          <div className="h-4 w-3/4 bg-muted rounded" />
        </div>
      </div>
      <div className="bg-card rounded-xl border border-card-border p-6">
        <div className="h-5 w-1/4 bg-muted rounded mb-4" />
        <div className="aspect-video w-full bg-muted rounded-lg" />
      </div>
    </div>
  </div>
);

/* ── Helper: find parent domain for a use case ── */
function findDomain(useCaseId: string): string {
  for (const d of agentsData.domains as any[]) {
    if (d.use_cases?.some((uc: any) => uc.id === useCaseId)) return d.domain;
  }
  return "—";
}

/* ── Maturity bar helper ── */
const MATURITY_LEVELS = ["Concept", "Pilot", "Production"] as const;
const MaturityBar = ({ level }: { level?: string }) => {
  const idx = MATURITY_LEVELS.findIndex((m) => m === level);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {MATURITY_LEVELS.map((m, i) => (
          <div
            key={m}
            className={`h-1.5 w-6 rounded-full ${
              i <= idx
                ? "bg-primary"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
            title={m}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-muted-foreground">{level ?? "—"}</span>
    </div>
  );
};

/* ── Impact metric icon mapper ── */
function ImpactIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "TrendingDown": return <TrendingDown className={className} />;
    case "Clock": return <Clock className={className} />;
    case "UserCheck": return <UserCheck className={className} />;
    default: return <TrendingUp className={className} />;
  }
}

/* ═══════════════════════════════════════════════════════
   Enhanced Details Tab — voice-faq-agent only (for now)
   ═══════════════════════════════════════════════════════ */
const EnhancedDetailsTab = ({ useCase, onTabChange }: { useCase: UseCase; onTabChange: (tab: string) => void }) => {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoOverlayOpen, setVideoOverlayOpen] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(true);
  const [gettingStartedExpanded, setGettingStartedExpanded] = useState(false);

  // Measure the demo video vs. the right column (Key Features + Getting Started
  // + Related) to choose the layout for Business Impact + Architecture.
  const videoRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const videoElRef = useRef<HTMLVideoElement>(null);
  const [videoHeight, setVideoHeight] = useState(0);
  const [rightHeight, setRightHeight] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const domainName = useMemo(() => findDomain(useCase.id), [useCase.id]);

  /* Look up impact_metrics directly from JSON to bypass TS type narrowing */
  const impactMetrics = useMemo(() => {
    for (const d of agentsData.domains as any[]) {
      const uc = d.use_cases?.find((u: any) => u.id === useCase.id);
      if (uc?.impact_metrics) return uc.impact_metrics as { value: string; label: string; icon: string }[];
    }
    return [] as { value: string; label: string; icon: string }[];
  }, [useCase.id]);

  useEffect(() => {
    if (!useCase?.id || !useCase?.has_video) { setVideoUrl(""); return; }
    let cancelled = false;
    setVideoLoading(true);
    getMediaUrls(useCase.id)
      .then((data) => { if (!cancelled) setVideoUrl(data.video_url || ""); })
      .catch(() => { if (!cancelled) setVideoUrl(""); })
      .finally(() => { if (!cancelled) setVideoLoading(false); });
    return () => { cancelled = true; };
  }, [useCase?.id, useCase?.has_video]);

  // Close the demo-video overlay on Escape.
  useEffect(() => {
    if (!videoOverlayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVideoOverlayOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [videoOverlayOpen]);

  // Keep the measured heights in sync with content/layout changes.
  useEffect(() => {
    const vEl = videoRef.current;
    const rEl = rightColRef.current;
    const measure = () => {
      if (vEl) setVideoHeight(vEl.offsetHeight);
      if (rEl) setRightHeight(rEl.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (vEl) ro.observe(vEl);
    if (rEl) ro.observe(rEl);
    return () => ro.disconnect();
  }, [useCase.id, useCase.has_video, videoUrl, videoLoading, featuresExpanded, gettingStartedExpanded]);

  const relatedCaseStudies = useMemo(() => {
    const stop = new Set(["a","an","and","are","as","at","be","by","for","from","how","in","into","is","it","of","on","or","our","that","the","their","this","to","with","using","use","case","cases","agent","ai","ml"]);
    const tokenize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !stop.has(w));
    const haystack = [useCase.title, useCase.description, useCase.impact, ...(useCase.key_features ?? []), ...(useCase.tags ?? [])].join(" ");
    const queryTokens = new Set(tokenize(haystack));
    if (queryTokens.size === 0) return [] as CaseStudy[];
    const scored = caseStudies.map((cs) => { const t = tokenize(cs.title); const overlap = t.reduce((acc, w) => acc + (queryTokens.has(w) ? 1 : 0), 0); return { cs, score: overlap / Math.max(6, t.length), overlap }; }).filter((x) => x.overlap >= 2).sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((x) => x.cs);
  }, [useCase]);

  /* Getting Started step handlers */
  const handleStep = (step: number) => {
    switch (step) {
      case 1: onTabChange("try"); break;
      case 2: document.getElementById("enhanced-demo-video")?.scrollIntoView({ behavior: "smooth" }); break;
      case 3: onTabChange("codebase"); break;
      case 4: onTabChange("codebase"); break;
    }
  };

  // Play the demo video in full screen from the overlay play button.
  const handlePlayFullscreen = () => {
    const el = videoElRef.current;
    if (!el) return;
    el.controls = true;
    const anyEl = el as any;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (anyEl.webkitRequestFullscreen) anyEl.webkitRequestFullscreen();
    else if (anyEl.webkitEnterFullscreen) anyEl.webkitEnterFullscreen();
    el.play().catch(() => {});
  };

  // When the right column is taller than the demo video, tuck Business Impact +
  // Architecture under the video (3:1) to fill the space; otherwise show them
  // full-width below the grid (original layout). When there's no demo video at
  // all, always fill the left column so it isn't left blank beside the tall
  // right column.
  const fillUnderVideo =
    isDesktop &&
    (!useCase.has_video || (videoHeight > 0 && rightHeight > videoHeight + 8));

  const businessImpact = (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Business Impact</h2>
      </div>
      {impactMetrics.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-4 items-stretch">
          {impactMetrics.map((m, i) => (
            <div key={i} className="bg-muted/40 rounded-xl border border-border px-1 py-2.5 text-center shadow-sm flex flex-col items-center justify-center">
              <p className="text-base font-bold text-foreground leading-none">{m.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1 leading-tight break-words">{m.label}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-foreground/80 leading-relaxed text-sm">{useCase.impact}</p>
    </div>
  );

  return (
    <div className="tab-content p-6 space-y-6">
      {/* ── Top row: Description+Impact | Demo Video | Architecture/Getting Started/Tech Stack ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* LEFT column — Introduction + Business Impact (single card) */}
        <div className="min-w-0 flex flex-col">
          <div className="bg-card rounded-xl border border-card-border p-6 h-full flex flex-col">
            {/* Introduction */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Info className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-card-foreground">Introduction</h2>
              </div>
              <p className="text-card-foreground leading-relaxed text-sm">{useCase.description}</p>
              {useCase.tags && useCase.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {useCase.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full border border-border">#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-dashed border-border" />

            {/* Business Impact */}
            {businessImpact}
          </div>
        </div>

        {/* CENTER column — Watch Demo Video + View Architecture + Technical Stack */}
        <div className="min-w-0 flex flex-col gap-6">
          {/* Watch Demo Video — compact card, opens a large overlay */}
          <div className="bg-card rounded-xl border border-card-border overflow-hidden">
            <button
              type="button"
              onClick={() => videoUrl && setVideoOverlayOpen(true)}
              disabled={!videoUrl}
              className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted/20 disabled:cursor-default disabled:hover:bg-transparent group"
            >
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Play className="w-4 h-4 text-primary" fill="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-lg font-semibold text-card-foreground">Watch Demo Video</span>
                {!videoLoading && !videoUrl && (
                  <span className="block text-xs italic text-muted-foreground">Not available</span>
                )}
              </div>
              <ArrowRight className="w-5 h-5 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* View System Architecture — compact card, opens overlay */}
          <ArchitectureTechStack useCase={useCase} only="architecture" />

          {/* Technical Stack — static, always open */}
          <div className="flex-1 flex flex-col">
            <ArchitectureTechStack useCase={useCase} only="tech" fill />
          </div>
        </div>

        {/* RIGHT column — Key Features (static, always open) */}
        <div className="min-w-0 flex flex-col">
          {useCase.key_features && useCase.key_features.length > 0 && (
            <div className="bg-card rounded-xl border border-card-border p-6 flex-1">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-card-foreground">Key Features</h2>
              </div>
              <div className="grid gap-0.5">
                {useCase.key_features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 px-2 py-1 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="mt-0.5"><Check className="feature-icon" /></div>
                    <span className="min-w-0 break-words text-sm text-card-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Demo video overlay (large, covers most of the screen) ── */}
      {videoOverlayOpen && videoUrl && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9998]"
            onClick={() => setVideoOverlayOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 pointer-events-none">
            <div
              className="relative pointer-events-auto w-[95vw] max-w-[1400px]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors z-10 shadow-lg"
                onClick={() => setVideoOverlayOpen(false)}
                aria-label="Close video"
              >
                <X className="w-4 h-4" />
              </button>
              <video
                src={videoUrl}
                title={useCase.title}
                controls
                autoPlay
                className="w-full max-h-[88vh] rounded-xl bg-black shadow-2xl"
              />
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

const DetailsTab = ({ useCase }: { useCase: UseCase }) => {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    if (!useCase?.id || !useCase?.has_video) {
      setVideoUrl("");
      return;
    }
    let cancelled = false;
    setVideoLoading(true);
    getMediaUrls(useCase.id)
      .then((data) => { if (!cancelled) setVideoUrl(data.video_url || ""); })
      .catch(() => { if (!cancelled) setVideoUrl(""); })
      .finally(() => { if (!cancelled) setVideoLoading(false); });
    return () => { cancelled = true; };
  }, [useCase?.id, useCase?.has_video]);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Intermediate": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Advanced": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const relatedCaseStudies = useMemo(() => {
    const stop = new Set([
      "a",
      "an",
      "and",
      "are",
      "as",
      "at",
      "be",
      "by",
      "for",
      "from",
      "how",
      "in",
      "into",
      "is",
      "it",
      "of",
      "on",
      "or",
      "our",
      "that",
      "the",
      "their",
      "this",
      "to",
      "with",
      "using",
      "use",
      "case",
      "cases",
      "agent",
      "ai",
      "ml",
    ]);

    const tokenize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !stop.has(w));

    const haystack = [
      useCase.title,
      useCase.description,
      useCase.impact,
      ...(useCase.key_features ?? []),
      ...(useCase.tags ?? []),
    ].join(" ");

    const queryTokens = new Set(tokenize(haystack));
    if (queryTokens.size === 0) return [] as CaseStudy[];

    const scored = caseStudies
      .map((cs) => {
        const t = tokenize(cs.title);
        const overlap = t.reduce((acc, w) => acc + (queryTokens.has(w) ? 1 : 0), 0);
        // Light bias to show "closest" items first.
        const score = overlap / Math.max(6, t.length);
        return { cs, score, overlap };
      })
      .filter((x) => x.overlap >= 2)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 3).map((x) => x.cs);
  }, [useCase]);


  return (
    <div className="tab-content p-6 space-y-8">
      {/* Enhanced Header */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{useCase.title}</h1>
            {useCase.architecture && (
              <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${
                useCase.architecture === 'No Code'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : useCase.architecture === 'Low Code'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
              }`}>
                {useCase.architecture}
              </span>
            )}
          </div>
          <p className="text-muted-foreground leading-relaxed text-lg">
            {useCase.description}
          </p>
        </div>

        {/* Tags */}
        {useCase.tags && useCase.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {useCase.tags.map((tag, index) => (
              <span key={index} className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full border border-border">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>



      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Left Side - Key Features */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-card-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-card-foreground">Key Features</h2>
            </div>
            <div className="grid gap-3">
              {useCase.key_features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="mt-0.5">
                    <Check className="feature-icon" />
                  </div>
                  <span className="text-card-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Related Case Studies (under Key Features) */}
          {relatedCaseStudies.length > 0 && (
            <div className="bg-gradient-to-br from-primary-subtle to-primary-subtle/50 rounded-xl border border-primary/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Newspaper className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Related Case Studies</h2>
              </div>

              <div className="grid gap-3">
                {relatedCaseStudies.map((cs) => (
                  <a
                    key={cs.id}
                    href={cs.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative rounded-xl border border-border bg-card/60 p-4 hover:bg-card transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {cs.category}
                        </span>
                        <p className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors leading-snug">
                          {cs.title}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-500 rounded-b-xl" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Video + supporting cards (stacked) */}
        <div className="space-y-6">
          {/* Demo Video */}
          <div className="bg-card rounded-xl border border-card-border p-6 self-start">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Play className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-card-foreground">Demo Video</h2>
              </div>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              {videoLoading ? (
                <div className="w-full h-full flex items-center justify-center bg-black/5">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : videoUrl ? (
                <video
                  src={videoUrl}
                  title={useCase.title}
                  controls
                  className="w-full h-full rounded-lg bg-black"
                >
                  Sorry, your browser does not support embedded videos.
                </video>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  No demo video available
                </div>
              )}
            </div>
          </div>

          {/* Business Impact (under Demo Video) */}
          <div className="bg-gradient-to-br from-primary-subtle to-primary-subtle/50 rounded-xl border border-primary/20 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Business Impact</h2>
            </div>
            <p className="text-foreground leading-relaxed font-medium">
              {useCase.impact}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// NOTE: "Try now" is intentionally hidden in the UI (tab button + render branch above).
// This component remains available to restore later.
const TryItTab = ({ useCase }: { useCase: UseCase }) => {
  const [requestSent, setRequestSent] = useState(false);

  const handleRequestDemo = () => {
    setRequestSent(true);
    setTimeout(() => setRequestSent(false), 3000);
  };

  // Check if the use case has a component defined
  const hasInteractiveComponent = useCase.component && hasComponent(useCase.component);

  // Get the dynamic component if it exists
  const DynamicComponent = useCase.component ? getComponentByName(useCase.component) : null;

  return (
    <div className="tab-content p-3">
      {hasInteractiveComponent && DynamicComponent ? (
        <div className="space-y-3">
          <DynamicComponentWrapper componentName={useCase.component}>
            <DynamicComponent />
          </DynamicComponentWrapper>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Interactive Demo Placeholder */}
          <div className="bg-card rounded-xl border border-card-border p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto animate-float">
              <Play className="w-10 h-10 text-primary-foreground" />
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-bold text-card-foreground">
                Interactive Demo Coming Soon
              </h2>
              <p className="text-muted-foreground">
                Experience {useCase.title} in action with our interactive playground.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <button
                onClick={handleRequestDemo}
                disabled={requestSent}
                className={`btn-primary w-full max-w-xs ${requestSent ? 'opacity-75' : ''}`}
              >
                {requestSent ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Request Sent!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Request Demo Access
                  </span>
                )}
              </button>
              <button className="btn-secondary w-full max-w-xs mx-auto flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" />
                View Documentation
              </button>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-2 pt-4">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">
                {useCase.component ? 'Component Not Found' : 'In Development'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


/* ── Contact Contributor Tab ────────────────────────── */
const ContactTab = ({ useCase }: { useCase: UseCase }) => {
  const { accounts } = useMsal();
  const msalName = accounts?.[0]?.name ?? "";
  const msalEmail = accounts?.[0]?.username ?? "";

  const [formData, setFormData] = useState({
    name: msalName,
    email: msalEmail,
    subject: "",
    category: "general",
    description: "",
    priority: "medium",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setFormData({ name: msalName, email: msalEmail, subject: "", category: "general", description: "", priority: "medium" });
  };

  const [ghContributors, setGhContributors] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    getMediaUrls(useCase.id)
      .then((data) => {
        const repoUrl = data.github_repo || useCase.github_repo || "";
        if (!repoUrl) return;
        return getMergedContributors(repoUrl).then((list) => {
          if (!cancelled) setGhContributors(list || []);
        });
      })
      .catch(() => {
        if (!cancelled) setGhContributors([]);
      });
    return () => {
      cancelled = true;
    };
  }, [useCase.id, useCase.github_repo]);

  const inputClass = "w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";
  const labelClass = "text-xs font-medium text-muted-foreground block mb-1.5";

  const ownership = getOwnership(useCase.id);

  return (
    <div className="tab-content p-6">
      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* ── Left Column: Header + Owner/Contributors (sticky) ── */}
        <div className="lg:col-span-2 space-y-5 lg:sticky lg:top-6">
          {/* Header */}
          <div className="bg-card rounded-xl border border-card-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Contact Contributor</h2>
                <p className="text-sm text-muted-foreground">Get help or share feedback about <span className="font-medium text-foreground">{useCase.title}</span></p>
              </div>
            </div>
          </div>

          {/* Owner & Contributors */}
          {ownership && (
            <div className="bg-card rounded-xl border border-card-border p-5 space-y-5">
              {/* Owner */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-card-foreground">Owner</h3>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {ownership.owner.name
                      ? ownership.owner.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
                      : "NA"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground">{ownership.owner.name || "NA"}</p>
                    <p className="text-xs text-muted-foreground">{ownership.owner.role || "NA"}</p>
                  </div>
                  <a href={`mailto:${ownership.owner.email}`} className="text-primary hover:text-primary/80 transition-colors" title={ownership.owner.email}>
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Contributors */}
              {ownership.contributors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-card-foreground">Contributors ({ownership.contributors.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {ownership.contributors.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-xs">
                          {c.name
                            ? c.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
                            : "NA"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground">{c.name || "NA"}</p>
                          <p className="text-xs text-muted-foreground">{c.role || "NA"}</p>
                        </div>
                        {/* Versioning logic hidden — version number and date no longer shown
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-primary">
                            <GitBranch className="w-3 h-3" /> {c.version}
                          </span>
                          <p className="text-xs text-muted-foreground">{new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        */}
                        <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-primary transition-colors" title={c.email}>
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Version history summary — hidden (versioning logic commented out)
              {ownership.versions.length > 1 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{ownership.versions.length} versions</span> · Current: <span className="font-mono text-primary">{ownership.current_version}</span> · First release: {new Date(ownership.versions[ownership.versions.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}
              */}

              {/* GitHub Contributors — derived from merged PR descriptions, so it shows the actual
                  portal user who contributed, not the shared bot account that owns the commits */}
              {ghContributors.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <GitBranch className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-semibold text-card-foreground">Contributors ({ghContributors.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {ghContributors.map((c) => (
                      <div key={c.email || c.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 font-medium text-xs">
                          {c.name
                            ? c.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
                            : "NA"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.contributions} PR{c.contributions === 1 ? "" : "s"} merged
                          </p>
                        </div>
                        {c.latest_pr_url && (
                          <a href={c.latest_pr_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="View latest merged PR">
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right Column: Query Form ── */}
        <div className="lg:col-span-3 mb-16">
          <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-card-border p-6 space-y-5">
            {/* Form Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <HelpCircle className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-card-foreground">Ask a Question / Report Issue</h3>
                <p className="text-xs text-muted-foreground">Submit your query to the solution owner</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Your Name *</label>
                <div className="relative">
                  <input name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" readOnly={!!msalName} className={`${inputClass} ${msalName ? 'bg-muted/50 cursor-default pr-9' : ''}`} />
                  {msalName && <Lock className="w-3 h-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />}
                </div>
              </div>
              <div>
                <label className={labelClass}>Email Address *</label>
                <div className="relative">
                  <input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" readOnly={!!msalEmail} className={`${inputClass} ${msalEmail ? 'bg-muted/50 cursor-default pr-9' : ''}`} />
                  {msalEmail && <Lock className="w-3 h-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />}
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Subject *</label>
              <input name="subject" value={formData.subject} onChange={handleChange} required placeholder="e.g. Integration help with Azure OpenAI endpoint" className={inputClass} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className={inputClass}>
                  <option value="general">General Question</option>
                  <option value="integration">Integration Help</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="deployment">Deployment Support</option>
                  <option value="customization">Customization</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className={inputClass}>
                  <option value="low">Low – Just curious</option>
                  <option value="medium">Medium – Need guidance</option>
                  <option value="high">High – Blocking issue</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Describe your query *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Provide details about what you need help with, steps you've already tried, or any relevant context..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={submitted}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {submitted ? (
                  <><Check className="w-4 h-4" /> Submitted!</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit</>
                )}
              </button>
              <p className="text-xs text-muted-foreground">* Required fields</p>
            </div>
          </form>
        </div>
      </div>

      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 text-foreground animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white">
                  <Rocket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Install in Engineering Commons</h3>
                  <p className="text-xs text-muted-foreground">{useCase.title} (v1.0.0)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInstallModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="rounded-lg bg-purple-500/10 border border-purple-500/25 p-3 text-purple-800 dark:text-purple-300">
                <span className="font-semibold block mb-1">📦 What will be installed into your workspace:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li><code className="text-foreground font-mono">.github/agents/{useCase.id}.agent.md</code> — GitHub Copilot Agent Prompt</li>
                  <li><code className="text-foreground font-mono">.agents/skills/{useCase.id}/SKILL.md</code> — Antigravity & Cursor Agent Skill</li>
                  <li><code className="text-foreground font-mono">cip.yml</code> & <code className="text-foreground font-mono">README.md</code> — Enterprise CIP Configuration</li>
                </ul>
              </div>

              <div>
                <label className="font-semibold block mb-1.5 text-foreground">Method 1: VS Code Extension (1-Click Install)</label>
                <a
                  href={`vscode://engineering-commons/install?name=${encodeURIComponent(useCase.id)}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  Install Directly in VS Code Extension
                </a>
              </div>

              <div>
                <label className="font-semibold block mb-1.5 text-foreground">Method 2: Engineering Commons CLI</label>
                <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg p-2 font-mono text-[11px]">
                  <span className="flex-1 truncate select-all">engineering-commons install {useCase.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`engineering-commons install ${useCase.id}`);
                      setCopiedCli(true);
                      setTimeout(() => setCopiedCli(false), 2000);
                    }}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
                    title="Copy CLI install command"
                  >
                    {copiedCli ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={() => setShowInstallModal(false)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabContent;