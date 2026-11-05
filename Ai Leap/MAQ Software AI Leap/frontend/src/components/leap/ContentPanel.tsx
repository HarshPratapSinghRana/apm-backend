import { FC, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Rocket,
    ChevronRight,
    ExternalLink,
    Clock,
    FileText,
    Check,
    TrendingUp,
    ChevronDown,
    BookOpen,
    Brain,
    Building2,
    Cpu,
    Upload,
} from "lucide-react";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import agentsData from "@/data/agents.json";
import UseCaseSidebar from "@/components/UseCaseSidebar";
import TabContent from "@/components/TabContent";
import SiblingNavigator, { SiblingOption } from "@/components/SiblingNavigator";
import { ProjectsGrid } from "@/components/leap/ProjectsGrid";
import { ProjectDetailPanel } from "@/components/leap/ProjectDetailPanel";
import { ApisGrid } from "@/components/leap/ApisContent";
import {
    CoursesGrid,
    TutorialsGrid,
    WorkshopsGrid,
    COETrainingGrid,
    mlCourses,
    type MlCourse,
} from "@/components/leap/LearningContent";
import { WebsiteViewer } from "@/components/leap/WebsiteViewer";
import { ProductDetailPage } from "@/components/leap/ProductDetailPage";
import { ServiceDetailPage } from "@/components/leap/ServiceDetailPage";
import { CaseStudiesContent } from "@/components/leap/CaseStudiesContent";
import { AgentEvalContent } from "@/components/leap/AgentEvalContent";
// Knowledge Hub commented out
// import ArchitectureGallery from "@/components/knowledge/ArchitectureGallery";
// import DecisionGuide from "@/components/knowledge/DecisionGuide";
// import EvalFramework from "@/components/knowledge/EvalFramework";
// import AgenticSdlc from "@/components/knowledge/AgenticSdlc";
// Leaderboard commented out
// import Leaderboard from "@/components/leap/Leaderboard";
// AI Advisor commented out
// import { AdvisorContent } from "@/components/leap/AdvisorContent";
import { ProductsContent } from "@/components/leap/ProductsContent";
import type { ProductsCategory } from "@/components/leap/ProductsContent";
import { UploadSolutionModal } from "@/components/UploadSolutionModal";
import {
    StandardServicesContent,
    ReferenceArchitecturesContent,
    AILandingZoneContent,
    GovernanceSecurityContent,
    MonitoringAlertingContent,
    VersioningStandardsContent,
    UseCaseArchitecturesContent,
    KeyMetricsContent,
} from "@/components/leap/ArchitectureReferenceContent";
import { projects } from "@/data/projects";
import { branches, BranchConfig, CardItem } from "@/data/branches";
import { productCategories } from "@/data/product-categories";
import { servicesDetail } from "@/data/services-detail";
import { compareUseCasesByPriority } from "@/lib/useCaseOrdering";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContentPanelProps {
    activeBranch: string;
    activeChild: string | null;
    activeDomain: string | null;
    activeProject: string | null;
    onBack: () => void;
    onChildSelect: (childId: string | null) => void;
    onDomainSelect: (domainId: string) => void;
    onProjectSelect: (projectId: string) => void;
    onProjectBack: () => void;
    navRequest?: import("@/types/globalSearch").GlobalSearchTarget | null;
    onNavRequestApplied?: () => void;
    onCodeTabActive?: (active: boolean) => void;
    advisorQuery?: string;
    onNavigate?: (branchId: string, childId: string | null) => void;
    initialUploadModalOpen?: boolean;
}

export const ContentPanel: FC<ContentPanelProps> = ({
    activeBranch,
    activeChild,
    activeDomain,
    activeProject,
    onBack,
    onChildSelect,
    onDomainSelect,
    onProjectSelect,
    onProjectBack,
    navRequest,
    onNavRequestApplied,
    onCodeTabActive,
    advisorQuery,
    onNavigate,
    initialUploadModalOpen = false,
}) => {
    const [selectedUrlCard, setSelectedUrlCard] = useState<CardItem | null>(
        null,
    );
    const [selectedNestedCard, setSelectedNestedCard] =
        useState<CardItem | null>(null);
    const [selectedComingSoonCard, setSelectedComingSoonCard] =
        useState<CardItem | null>(null);
    const [selectedProductCategoryCard, setSelectedProductCategoryCard] =
        useState<CardItem | null>(null);
    const [selectedProductDetailCard, setSelectedProductDetailCard] =
        useState<CardItem | null>(null);
    const [selectedLdpTrack, setSelectedLdpTrack] = useState<string | null>(
        null,
    );
    const [selectedMlCourseId, setSelectedMlCourseId] = useState<string | null>(
        null,
    );
    const [selectedAgenticUseCase, setSelectedAgenticUseCase] = useState<{
        industryId: string;
        useCaseId: string;
    } | null>(null);
    const [selectedKbUseCase, setSelectedKbUseCase] = useState<{
        domainId: string;
        useCaseId: string;
    } | null>(null);
    const [solutionsTechCategory, setSolutionsTechCategory] =
        useState<ProductsCategory>("All");
    const [solutionsTechSearch, setSolutionsTechSearch] = useState("");
    const [isServiceEmbedActive, setIsServiceEmbedActive] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(
        initialUploadModalOpen,
    );
    const contentRef = useRef<HTMLDivElement>(null);
    const pendingUseCaseRef = useRef<{
        industryId: string;
        useCaseId: string;
    } | null>(null);
    const prevBranchForResetRef = useRef<string | null>(activeBranch);
    const navigate = useNavigate();

    const branch = branches.find((b) => b.id === activeBranch);
    if (!branch) return null;

    // Reset all selected states when branch changes, then apply any pending navigation
    useEffect(() => {
        const branchChanged = prevBranchForResetRef.current !== activeBranch;
        prevBranchForResetRef.current = activeBranch;

        setSelectedUrlCard(null);
        setSelectedNestedCard(null);
        setSelectedComingSoonCard(null);
        setSelectedProductCategoryCard(null);
        setSelectedProductDetailCard(null);
        setSelectedLdpTrack(null);
        setSelectedMlCourseId(null);
        setSelectedKbUseCase(null);
        setIsServiceEmbedActive(false);
        // Only close the upload modal when the branch actually changes (e.g. clicking
        // another left-nav item). Avoid closing on the initial mount so deep-links
        // that open it via the URL (?upload-solution=true) keep it open.
        if (branchChanged) {
            setIsUploadModalOpen(false);
        }

        // Apply pending use case AFTER the reset (single effect guarantees order)
        if (pendingUseCaseRef.current && activeBranch === "solutions") {
            setSelectedAgenticUseCase(pendingUseCaseRef.current);
            pendingUseCaseRef.current = null;
        } else {
            setSelectedAgenticUseCase(null);
        }
    }, [activeBranch]);

    // Clear card-level detail views when switching child tabs WITHIN the same
    // branch (e.g. Productivity → Tools → Reusable Components). Without this, a
    // previously opened card (selectedUrlCard, etc.) stays set and keeps rendering
    // instead of the newly selected child's content. Skipped when the branch
    // itself changes, since the branch-change effect above already resets state.
    const prevBranchForChildRef = useRef<string | null>(activeBranch);
    const prevChildRef = useRef<string | null>(activeChild);
    useEffect(() => {
        const branchChanged = prevBranchForChildRef.current !== activeBranch;
        const childChanged = prevChildRef.current !== activeChild;
        prevBranchForChildRef.current = activeBranch;
        prevChildRef.current = activeChild;

        if (!branchChanged && childChanged) {
            setSelectedUrlCard(null);
            setSelectedNestedCard(null);
            setSelectedComingSoonCard(null);
            setSelectedProductCategoryCard(null);
            setSelectedProductDetailCard(null);
            setSelectedLdpTrack(null);
            setSelectedMlCourseId(null);
            setSelectedAgenticUseCase(null);
            setSelectedKbUseCase(null);
            setIsServiceEmbedActive(false);
            setIsUploadModalOpen(false);
        }
    }, [activeChild, activeBranch]);

    // Restore the selected Knowledge Hub agent from the URL (?project=<useCaseId>)
    // so a refresh / deep-link reopens the same agent detail view.
    useEffect(() => {
        if (activeBranch !== "knowledge-hub") return;
        if (!activeProject) {
            setSelectedKbUseCase(null);
            return;
        }
        if (selectedKbUseCase?.useCaseId === activeProject) return;
        const domain = agentsData.domains.find((d) =>
            d.use_cases.some((uc) => uc.id === activeProject),
        );
        if (domain) {
            setSelectedKbUseCase({
                domainId: domain.id,
                useCaseId: activeProject,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeBranch, activeProject]);

    // Scroll content to top when switching sub-sections
    useEffect(() => {
        contentRef.current?.scrollTo(0, 0);
    }, [activeChild, activeBranch]);

    // Reset Solutions → By technology filter only when leaving that section.
    useEffect(() => {
        if (
            activeBranch === "solutions" &&
            activeChild === "solutions-by-technology"
        )
            return;
        setSolutionsTechCategory("All");
        setSolutionsTechSearch("");
    }, [activeBranch, activeChild]);

    // Apply global navigation requests that require internal panel state.
    useEffect(() => {
        if (!navRequest) return;

        if (navRequest.type === "productDetail") {
            setSelectedProductCategoryCard(null);
            setSelectedNestedCard(null);
            setSelectedComingSoonCard(null);
            setSelectedUrlCard(null);
            setSelectedProductDetailCard({
                id: navRequest.productId,
                label: navRequest.productId,
                description: "",
                productDetailId: navRequest.productId,
            });
            onNavRequestApplied?.();
            return;
        }

        // Route industry use case to the selectedAgenticUseCase rendering path
        // so the correct industry mapping and use case auto-selection happen.
        if (navRequest.type === "industryUseCase") {
            setSelectedAgenticUseCase({
                industryId: toSolutionsIndustryForUseCase(
                    navRequest.domainId,
                    navRequest.useCaseId,
                ),
                useCaseId: navRequest.useCaseId,
            });
            onNavRequestApplied?.();
        }
    }, [navRequest, onNavRequestApplied]);

    const Icon = branch.icon;
    const currentTab = activeChild || branch.children[0]?.id || null;

    // Show back button when in deep navigation (including Services detail → tiles)
    const showBackButton =
        activeDomain !== null ||
        activeProject !== null ||
        selectedUrlCard !== null ||
        selectedNestedCard !== null ||
        selectedComingSoonCard !== null ||
        selectedProductCategoryCard !== null ||
        selectedProductDetailCard !== null ||
        selectedLdpTrack !== null ||
        selectedMlCourseId !== null ||
        selectedAgenticUseCase !== null ||
        selectedKbUseCase !== null ||
        (activeBranch === "services" && activeChild !== null);

    const handleSolutionsViewSelect = useCallback(
        (childId: "solutions-by-industry" | "solutions-by-technology") => {
            setSelectedUrlCard(null);
            setSelectedNestedCard(null);
            setSelectedComingSoonCard(null);
            setSelectedProductCategoryCard(null);
            setSelectedProductDetailCard(null);
            setSelectedLdpTrack(null);
            setSelectedMlCourseId(null);
            setSelectedAgenticUseCase(null);
            onChildSelect(childId);
        },
        [onChildSelect],
    );

    const handleBackClick = () => {
        if (selectedUrlCard) {
            setSelectedUrlCard(null);
        } else if (selectedNestedCard) {
            setSelectedNestedCard(null);
        } else if (selectedComingSoonCard) {
            setSelectedComingSoonCard(null);
        } else if (selectedProductCategoryCard) {
            setSelectedProductCategoryCard(null);
        } else if (selectedProductDetailCard) {
            setSelectedProductDetailCard(null);
        } else if (selectedAgenticUseCase) {
            setSelectedAgenticUseCase(null);
        } else if (selectedKbUseCase) {
            setSelectedKbUseCase(null);
            onProjectBack();
        } else if (selectedMlCourseId) {
            setSelectedMlCourseId(null);
        } else if (selectedLdpTrack) {
            setSelectedLdpTrack(null);
        } else if (activeBranch === "services" && activeChild) {
            onChildSelect(null);
        } else {
            onBack();
        }
    };

    /* ─── Compute sibling-navigation dropdown data ─── */
    const siblingNav = useMemo(() => {
        // Case 1: Domain/industry detail view (Industry > Use Cases > [domain] OR Solutions > By industry > [industry])
        if (activeDomain) {
            // Solutions → By industry should show the 6 industry buckets, not raw agents.json domains
            if (
                activeBranch === "solutions" &&
                currentTab === "solutions-by-industry"
            ) {
                const counts: Record<string, number> = {};
                for (const d of agentsData.domains as any[]) {
                    for (const uc of d.use_cases ?? []) {
                        const bucket = toSolutionsIndustryForUseCase(
                            d.id,
                            uc.id,
                        );
                        counts[bucket] = (counts[bucket] ?? 0) + 1;
                    }
                }

                const options: SiblingOption[] = SOLUTIONS_INDUSTRIES.filter(
                    (ind) => (counts[ind.id] ?? 0) > 0,
                ).map((ind) => ({
                    id: ind.id,
                    label: ind.label,
                    subtitle: `${counts[ind.id] ?? 0} use case${(counts[ind.id] ?? 0) !== 1 ? "s" : ""}`,
                    icon: ind.icon,
                }));
                const current = SOLUTIONS_INDUSTRIES.find(
                    (x) => x.id === activeDomain,
                );
                return {
                    currentId: activeDomain,
                    currentLabel: current?.label || "Select",
                    options,
                    onSelect: (id: string) => onDomainSelect(id),
                };
            }

            const options: SiblingOption[] = agentsData.domains.map((d) => ({
                id: d.id,
                label: d.domain,
                subtitle: `${d.use_cases.length} use case${d.use_cases.length !== 1 ? "s" : ""}`,
                icon: d.icon,
            }));
            const current = agentsData.domains.find(
                (d) => d.id === activeDomain,
            );
            return {
                currentId: activeDomain,
                currentLabel: current?.domain || "Select",
                options,
                onSelect: (id: string) => onDomainSelect(id),
            };
        }

        // Case 2: Any card-level drill-down (URL / nested / coming-soon / product-category / product-detail)
        const activeCard =
            selectedProductDetailCard ||
            selectedProductCategoryCard ||
            selectedUrlCard ||
            selectedNestedCard ||
            selectedComingSoonCard;

        if (activeCard) {
            const child = branch.children.find((c) => c.id === currentTab);
            const cards = child?.cards;
            if (cards && cards.length > 1) {
                const options: SiblingOption[] = cards
                    .filter((c) => !c.disabled)
                    .map((c) => {
                        let subtitle = "";
                        if (c.productDetailId) {
                            subtitle = "Product";
                        } else if (c.productCategoryId) {
                            const cat = productCategories.find(
                                (pc) => pc.id === c.productCategoryId,
                            );
                            subtitle = cat
                                ? `${cat.products.length} product${cat.products.length !== 1 ? "s" : ""}`
                                : "";
                        } else if (c.nestedItems && c.nestedItems.length > 0) {
                            subtitle = `${c.nestedItems.length} item${c.nestedItems.length !== 1 ? "s" : ""}`;
                        } else if (c.url) {
                            subtitle = "External";
                        }
                        return { id: c.id, label: c.label, subtitle };
                    });

                return {
                    currentId: activeCard.id,
                    currentLabel: activeCard.label,
                    options,
                    onSelect: (id: string) => {
                        const card = cards.find((c) => c.id === id);
                        if (!card) return;
                        // Clear all card states first
                        setSelectedUrlCard(null);
                        setSelectedNestedCard(null);
                        setSelectedComingSoonCard(null);
                        setSelectedProductCategoryCard(null);
                        setSelectedProductDetailCard(null);
                        // Activate the appropriate state for the selected card
                        if (card.productDetailId)
                            setSelectedProductDetailCard(card);
                        else if (card.productCategoryId)
                            setSelectedProductCategoryCard(card);
                        else if (card.url) setSelectedUrlCard(card);
                        else if (
                            card.nestedItems &&
                            card.nestedItems.length > 0
                        )
                            setSelectedNestedCard(card);
                        else setSelectedComingSoonCard(card);
                    },
                };
            }
        }

        // Case 3: ML Course detail view - dropdown to switch between ML courses
        if (selectedMlCourseId && selectedLdpTrack) {
            const options: SiblingOption[] = mlCourses.map((c) => ({
                id: c.id,
                label: `[${c.code}] ${c.title}`,
                subtitle: c.specializationStatus,
            }));
            const current = mlCourses.find((c) => c.id === selectedMlCourseId);
            return {
                currentId: selectedMlCourseId,
                currentLabel: current
                    ? `[${current.code}] ${current.title}`
                    : "Select",
                options,
                onSelect: (id: string) => setSelectedMlCourseId(id),
            };
        }

        return null;
    }, [
        activeDomain,
        selectedProductDetailCard,
        selectedProductCategoryCard,
        selectedUrlCard,
        selectedNestedCard,
        selectedComingSoonCard,
        selectedMlCourseId,
        selectedLdpTrack,
        branch,
        currentTab,
        onDomainSelect,
    ]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ─── Branch Header ─── */}
            <div className="flex-shrink-0 px-6 pt-4 pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        {/* Back button - only show when in detailed view */}
                        {showBackButton && (
                            <button
                                onClick={handleBackClick}
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/40 transition-all group"
                            >
                                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                        )}
                        {!(
                            isServiceEmbedActive ||
                            (activeBranch === "services" &&
                                activeChild !== null)
                        ) && (
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">
                                    {branch.label}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {branch.description}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right side: Upload button (for solutions-by-industry) + Sibling navigator dropdown */}
                    <div className="flex flex-1 items-center justify-end gap-3">
                        {/* Upload Solution Button - only show on Solutions > Industry view */}
                        {activeBranch === "solutions" &&
                            activeChild === "solutions-by-industry" &&
                            !showBackButton && (
                                <button
                                    onClick={() => {
                                        setIsUploadModalOpen(true);
                                        navigate(
                                            "/?branch=solutions&child=solutions-by-industry&upload-solution=true",
                                        );
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                    <span className="hidden sm:inline">
                                        Upload Solution
                                    </span>
                                    <span className="sm:hidden">Upload</span>
                                </button>
                            )}

                        {siblingNav && (
                            <SiblingNavigator
                                currentId={siblingNav.currentId}
                                currentLabel={siblingNav.currentLabel}
                                options={siblingNav.options}
                                onSelect={siblingNav.onSelect}
                                variant="bar"
                            />
                        )}
                    </div>
                </div>

                {/* Solutions tab navbar */}
                {activeBranch === "solutions" && !showBackButton && (
                    <div className="flex items-center gap-1 mt-4 border-b border-border pb-px overflow-x-auto">
                        {[
                            {
                                id: "solutions-by-industry",
                                label: "Industry",
                                icon: <Building2 className="w-4 h-4" />,
                            },
                            {
                                id: "solutions-by-technology",
                                label: "Technology",
                                icon: <Cpu className="w-4 h-4" />,
                            },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() =>
                                    handleSolutionsViewSelect(
                                        tab.id as
                                            | "solutions-by-industry"
                                            | "solutions-by-technology",
                                    )
                                }
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap border-b-2 -mb-px ${
                                    currentTab === tab.id
                                        ? "border-primary text-primary bg-primary/5"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Tab Content (No tabs UI anymore) ─── */}
            <div
                ref={contentRef}
                className={`flex-1 ${isServiceEmbedActive ? "overflow-hidden p-0" : selectedUrlCard && selectedUrlCard.url ? "overflow-hidden p-0" : selectedProductCategoryCard ? "overflow-hidden p-0" : selectedAgenticUseCase ? "overflow-hidden p-0" : selectedKbUseCase ? "overflow-hidden p-0" : activeDomain ? "overflow-hidden p-0" : "overflow-y-auto px-6 py-6 pb-28"} custom-scrollbar`}
            >
                {selectedUrlCard && selectedUrlCard.url ? (
                    <WebsiteViewer
                        url={selectedUrlCard.url}
                        title={selectedUrlCard.label}
                    />
                ) : selectedAgenticUseCase ? (
                    <SolutionsIndustryDetailView
                        industryId={selectedAgenticUseCase.industryId}
                        initialUseCaseId={selectedAgenticUseCase.useCaseId}
                        onCodeTabActive={onCodeTabActive}
                    />
                ) : selectedKbUseCase ? (
                    <KbUseCaseDetailView
                        domainId={selectedKbUseCase.domainId}
                        useCaseId={selectedKbUseCase.useCaseId}
                        onCodeTabActive={onCodeTabActive}
                    />
                ) : selectedProductDetailCard &&
                  selectedProductDetailCard.productDetailId ? (
                    <ProductDetailPage
                        productId={selectedProductDetailCard.productDetailId}
                    />
                ) : selectedProductCategoryCard &&
                  selectedProductCategoryCard.productCategoryId ? (
                    <ProductCategoryDetailView
                        categoryId={
                            selectedProductCategoryCard.productCategoryId
                        }
                    />
                ) : selectedLdpTrack && selectedMlCourseId ? (
                    (() => {
                        const course = mlCourses.find(
                            (c) => c.id === selectedMlCourseId,
                        );
                        return course ? (
                            <MlCourseDetailPage course={course} />
                        ) : null;
                    })()
                ) : selectedLdpTrack ? (
                    <LdpMlTrackDetailView
                        trackId={selectedLdpTrack}
                        onSelectCourse={setSelectedMlCourseId}
                    />
                ) : selectedComingSoonCard ? (
                    <ComingSoonView childLabel={selectedComingSoonCard.label} />
                ) : (
                    <ChildContent
                        childId={currentTab}
                        activeDomain={activeDomain}
                        activeProject={activeProject}
                        onDomainSelect={onDomainSelect}
                        onProjectSelect={onProjectSelect}
                        onProjectBack={onProjectBack}
                        activeBranch={activeBranch}
                        onChildSelect={onChildSelect}
                        solutionsTechCategory={solutionsTechCategory}
                        onSolutionsTechCategoryChange={setSolutionsTechCategory}
                        solutionsTechSearch={solutionsTechSearch}
                        onSolutionsTechSearchChange={setSolutionsTechSearch}
                        onSelectUrlCard={setSelectedUrlCard}
                        selectedNestedCard={selectedNestedCard}
                        onSelectNestedCard={setSelectedNestedCard}
                        onSelectComingSoonCard={setSelectedComingSoonCard}
                        onSelectProductCategoryCard={
                            setSelectedProductCategoryCard
                        }
                        onSelectProductDetailCard={setSelectedProductDetailCard}
                        onSelectLdpTrack={setSelectedLdpTrack}
                        onSelectMlCourse={(courseId: string) => {
                            setSelectedLdpTrack("ldp-ml-track");
                            setSelectedMlCourseId(courseId);
                        }}
                        onSelectAgenticUseCase={(
                            domainId: string,
                            useCaseId: string,
                        ) => {
                            setSelectedAgenticUseCase({
                                industryId: toSolutionsIndustry(domainId),
                                useCaseId,
                            });
                        }}
                        onSelectKbUseCase={(
                            domainId: string,
                            useCaseId: string,
                        ) => {
                            setSelectedKbUseCase({ domainId, useCaseId });
                            // Persist the selected agent in the URL (?project=<useCaseId>).
                            onProjectSelect(useCaseId);
                        }}
                        initialUseCaseId={
                            navRequest?.type === "industryUseCase"
                                ? navRequest.useCaseId
                                : null
                        }
                        onServiceEmbedChange={setIsServiceEmbedActive}
                        onCodeTabActive={onCodeTabActive}
                        advisorQuery={
                            activeBranch === "ai-advisor"
                                ? advisorQuery
                                : undefined
                        }
                        onNavigate={onNavigate}
                        onPendingUseCaseNav={(domainId, useCaseId) => {
                            pendingUseCaseRef.current = {
                                industryId: toSolutionsIndustryForUseCase(
                                    domainId,
                                    useCaseId,
                                ),
                                useCaseId,
                            };
                            onNavigate?.("solutions", "solutions-by-industry");
                        }}
                    />
                )}
            </div>

            {/* Upload Solution Modal */}
            <UploadSolutionModal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    setIsUploadModalOpen(false);
                    navigate("/?branch=solutions&child=solutions-by-industry");
                }}
            />
        </div>
    );
};

/* ─── Cards Grid Component ─── */
const CardsGrid: FC<{
    cards: CardItem[];
    selectedNestedCard: CardItem | null;
    onSelectNestedCard: (card: CardItem | null) => void;
    onCardSelect?: (card: CardItem) => void;
    onSelectComingSoonCard?: (card: CardItem) => void;
    onSelectProductCategoryCard?: (card: CardItem) => void;
    onSelectProductDetailCard?: (card: CardItem) => void;
    onSelectIndustryUseCase?: (domainId: string, useCaseId: string) => void;
    showFullDescription?: boolean;
}> = ({
    cards,
    selectedNestedCard,
    onSelectNestedCard,
    onCardSelect,
    onSelectComingSoonCard,
    onSelectProductCategoryCard,
    onSelectProductDetailCard,
    onSelectIndustryUseCase,
    showFullDescription,
}) => {
    if (
        selectedNestedCard &&
        selectedNestedCard.nestedItems &&
        selectedNestedCard.nestedItems.length > 0
    ) {
        return (
            <div className="space-y-6 animate-leap-fade-in-up">
                <div className="cards-grid-symmetric">
                    {selectedNestedCard.nestedItems.map((item, index) => (
                        <div
                            key={item.id}
                            onClick={() => {
                                if (item.disabled) return;
                                if (
                                    item.industryUseCaseId &&
                                    item.industryDomainId
                                ) {
                                    onSelectIndustryUseCase?.(
                                        item.industryDomainId,
                                        item.industryUseCaseId,
                                    );
                                    return;
                                }
                                if (item.productDetailId) {
                                    onSelectProductDetailCard?.(item);
                                } else if (item.productCategoryId) {
                                    onSelectProductCategoryCard?.(item);
                                } else if (item.url) {
                                    onCardSelect?.(item);
                                } else if (
                                    item.nestedItems &&
                                    item.nestedItems.length > 0
                                ) {
                                    onSelectNestedCard(item);
                                } else {
                                    // Show coming soon for cards without URL or nested items
                                    onSelectComingSoonCard?.(item);
                                }
                            }}
                            className={
                                item.disabled
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer"
                            }
                        >
                            <CardItemComponent
                                key={item.id}
                                card={item}
                                index={index}
                                hasNested={
                                    !!(
                                        item.nestedItems &&
                                        item.nestedItems.length > 0
                                    )
                                }
                                disabled={item.disabled}
                                showFullDescription={showFullDescription}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-leap-fade-in-up">
            <div className="cards-grid-symmetric">
                {cards.map((card, index) => (
                    <div
                        key={card.id}
                        onClick={() => {
                            if (card.disabled) return;
                            if (
                                card.industryUseCaseId &&
                                card.industryDomainId
                            ) {
                                onSelectIndustryUseCase?.(
                                    card.industryDomainId,
                                    card.industryUseCaseId,
                                );
                                return;
                            }
                            if (card.productDetailId) {
                                // If card has a product detail ID, open product detail page (custom UI)
                                onSelectProductDetailCard?.(card);
                            } else if (card.productCategoryId) {
                                // If card has a product category, open product category detail view
                                onSelectProductCategoryCard?.(card);
                            } else if (card.url) {
                                // If card has a URL, notify parent to open it
                                onCardSelect?.(card);
                            } else if (
                                card.nestedItems &&
                                card.nestedItems.length > 0
                            ) {
                                onSelectNestedCard(card);
                            } else {
                                // Show coming soon for cards without URL or nested items
                                onSelectComingSoonCard?.(card);
                            }
                        }}
                        className={
                            card.disabled
                                ? "cursor-not-allowed"
                                : "cursor-pointer"
                        }
                    >
                        <CardItemComponent
                            card={card}
                            index={index}
                            hasNested={
                                !!(
                                    card.nestedItems &&
                                    card.nestedItems.length > 0
                                )
                            }
                            disabled={card.disabled}
                            showFullDescription={showFullDescription}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─── Single Card Item ─── */
const CardItemComponent: FC<{
    card: CardItem;
    index: number;
    hasNested?: boolean;
    disabled?: boolean;
    showFullDescription?: boolean;
}> = ({
    card,
    index,
    hasNested = false,
    disabled = false,
    showFullDescription = false,
}) => {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const hasUrl = !!card.url;
    const hasProductCategory = !!card.productCategoryId;
    const productCategory = hasProductCategory
        ? productCategories.find((c) => c.id === card.productCategoryId)
        : null;

    // Get count for display
    const itemCount =
        hasProductCategory && productCategory
            ? productCategory.products.length
            : hasNested
              ? card.nestedItems?.length || 0
              : 0;

    // Get icon component if specified
    const IconComponent = card.icon
        ? (Icons[card.icon as keyof typeof Icons] as LucideIcon)
        : null;
    // Only show Read more toggle when not in full-description mode and description is long
    const canExpandDescription =
        !showFullDescription && (card.description || "").trim().length > 120;

    return (
        <button
            className={`block group text-left w-full h-full${disabled ? " opacity-60 pointer-events-none" : ""}`}
            style={{
                animationDelay: `${index * 80}ms`,
                animation: "fadeInUp 0.6s ease-out both",
            }}
            disabled={disabled}
        >
            <div className="relative domain-card h-full overflow-hidden">
                {/* Coming soon badge for disabled cards */}
                {disabled && (
                    <span className="absolute top-3 right-3 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground tracking-wide uppercase z-10">
                        Coming Soon
                    </span>
                )}
                {/* Link indicator arrow for clickable cards */}
                {!disabled && !((hasProductCategory || hasNested) && itemCount > 0) && (
                    <span className="absolute top-3 right-3 z-10 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                        <Icons.SquareArrowOutUpRight className="w-4 h-4" />
                    </span>
                )}
                <div className="flex flex-col h-full min-h-0">
                    {/* Icon + Count row */}
                    <div className="flex items-start justify-between mb-4">
                        {IconComponent && (
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                                <IconComponent className="w-5 h-5 text-primary" />
                            </div>
                        )}
                        {(hasProductCategory || hasNested) && itemCount > 0 && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                <span className="text-xs font-semibold text-primary">
                                    {itemCount}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-[#1a1a1a] mb-3 line-clamp-2">
                        {card.label}
                    </h3>

                    {/* Description */}
                    <div
                        className={
                            isDescriptionExpanded
                                ? "flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar"
                                : ""
                        }
                    >
                        <p
                            className={`text-[#6b7280] text-xs leading-relaxed ${
                                showFullDescription || isDescriptionExpanded
                                    ? ""
                                    : "line-clamp-3"
                            }`}
                        >
                            {card.description}
                        </p>
                    </div>
                    {canExpandDescription && (
                        <span
                            role="button"
                            tabIndex={0}
                            className="mt-2 inline-flex text-xs font-medium text-primary hover:underline flex-shrink-0"
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setIsDescriptionExpanded((value) => !value);
                            }}
                            onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.key !== " ")
                                    return;
                                event.preventDefault();
                                event.stopPropagation();
                                setIsDescriptionExpanded((value) => !value);
                            }}
                        >
                            {isDescriptionExpanded ? "Read less" : "Read more"}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
};

/* ─── Child Content Router ─── */
const ChildContent: FC<{
    childId: string | null;
    activeDomain: string | null;
    activeProject: string | null;
    onDomainSelect: (id: string) => void;
    onProjectSelect: (id: string) => void;
    onProjectBack: () => void;
    activeBranch: string | null;
    onChildSelect?: (childId: string | null) => void;
    solutionsTechCategory?: ProductsCategory;
    onSolutionsTechCategoryChange?: (cat: ProductsCategory) => void;
    solutionsTechSearch?: string;
    onSolutionsTechSearchChange?: (q: string) => void;
    onSelectUrlCard: (card: CardItem) => void;
    selectedNestedCard: CardItem | null;
    onSelectNestedCard: (card: CardItem | null) => void;
    onSelectComingSoonCard: (card: CardItem) => void;
    onSelectProductCategoryCard: (card: CardItem) => void;
    onSelectProductDetailCard: (card: CardItem) => void;
    onSelectAgenticUseCase?: (domainId: string, useCaseId: string) => void;
    onSelectKbUseCase?: (domainId: string, useCaseId: string) => void;
    onSelectLdpTrack: (trackId: string) => void;
    onSelectMlCourse: (courseId: string) => void;
    initialUseCaseId?: string | null;
    onServiceEmbedChange?: (active: boolean) => void;
    onCodeTabActive?: (active: boolean) => void;
    advisorQuery?: string;
    onNavigate?: (branchId: string, childId: string | null) => void;
    onPendingUseCaseNav?: (domainId: string, useCaseId: string) => void;
}> = ({
    childId,
    activeDomain,
    activeProject,
    onDomainSelect,
    onProjectSelect,
    onProjectBack,
    activeBranch,
    onChildSelect,
    solutionsTechCategory,
    onSolutionsTechCategoryChange,
    solutionsTechSearch,
    onSolutionsTechSearchChange,
    onSelectUrlCard,
    selectedNestedCard,
    onSelectNestedCard,
    onSelectComingSoonCard,
    onSelectProductCategoryCard,
    onSelectProductDetailCard,
    onSelectAgenticUseCase,
    onSelectKbUseCase,
    onSelectLdpTrack,
    onSelectMlCourse,
    initialUseCaseId,
    onServiceEmbedChange,
    onCodeTabActive,
    advisorQuery,
    onNavigate,
    onPendingUseCaseNav,
}) => {
    // Find the branch and child to check if they have cards
    const branch = branches.find((b) => b.id === activeBranch);
    const child = branch?.children.find((c) => c.id === childId);

    // Services: show MAQ Software services cards or embedded service detail page
    if (activeBranch === "services") {
        return <MaqServicesSection onActiveChange={onServiceEmbedChange} />;
    }

    // Solutions > By industry (6 fixed industries; remap agents.json use cases)
    if (childId === "solutions-by-industry") {
        if (activeDomain) {
            return (
                <SolutionsIndustryDetailView
                    industryId={activeDomain}
                    initialUseCaseId={activeProject ?? initialUseCaseId ?? null}
                    onCodeTabActive={onCodeTabActive}
                    onSelectUseCase={onProjectSelect}
                />
            );
        }
        return <SolutionsIndustryTilesGrid onSelectIndustry={onDomainSelect} />;
    }

    // Solutions > By technology (Products + Agentic AI use cases)
    if (
        childId === "solutions-by-technology" &&
        child?.cards &&
        child.cards.length > 0
    ) {
        const agenticCards: CardItem[] = agentsData.domains.flatMap((d) =>
            (d.use_cases ?? []).map((u) => ({
                id: u.id,
                label: u.title,
                description: u.description,
                icon: d.icon,
                industryDomainId: d.id,
                industryUseCaseId: u.id,
            })),
        );

        // Include the 3 Industry → Agents cards under Agentic AI as well.
        // - Retail Pulse + Responsible AI Agent should open their Product Detail pages
        // - Loan Underwriting Agent should open the existing Finance use case
        const industryAgentsCards: CardItem[] = [
            {
                id: "retail-pulse",
                label: "Retail Pulse",
                description:
                    "An AI-powered retail analytics agent that monitors store performance, tracks sales trends, and delivers real-time actionable insights to optimize operations and boost revenue.",
                icon: "ShoppingCart",
                productDetailId: "retail-pulse",
            },
            {
                id: "rai-agents",
                label: "Responsible AI Agent",
                description:
                    "An automated solution to implement Responsible AI standards across AI systems — providing continuous, context-aware guidance, evaluation, and mitigation for legal, ethical, and organizational compliance.",
                icon: "ShieldCheck",
                productDetailId: "rai-agent",
            },
        ];

        return (
            <ProductsContent
                cards={[
                    ...child.cards,
                    ...agenticCards,
                    ...industryAgentsCards,
                ]}
                onSelectUrlCard={onSelectUrlCard}
                onSelectProductDetailCard={onSelectProductDetailCard}
                onSelectComingSoonCard={onSelectComingSoonCard}
                onSelectIndustryUseCase={(card) => {
                    if (!card.industryDomainId || !card.industryUseCaseId)
                        return;
                    onSelectAgenticUseCase?.(
                        card.industryDomainId,
                        card.industryUseCaseId,
                    );
                }}
                activeCategory={solutionsTechCategory}
                onActiveCategoryChange={onSolutionsTechCategoryChange}
                searchQuery={solutionsTechSearch}
                onSearchQueryChange={onSolutionsTechSearchChange}
            />
        );
    }

    // If the child has cards, display them
    if (child?.cards && child.cards.length > 0) {
        return (
            <CardsGrid
                cards={child.cards}
                selectedNestedCard={selectedNestedCard}
                onSelectNestedCard={onSelectNestedCard}
                onCardSelect={onSelectUrlCard}
                onSelectComingSoonCard={onSelectComingSoonCard}
                onSelectProductCategoryCard={onSelectProductCategoryCard}
                onSelectProductDetailCard={onSelectProductDetailCard}
                showFullDescription={childId === "solutions-tools"}
            />
        );
    }

    /* Development */
    if (childId === "use-cases") {
        if (activeDomain) {
            return (
                <DomainDetailView
                    domainId={activeDomain}
                    onDomainSwitch={onDomainSelect}
                    initialUseCaseId={activeProject ?? initialUseCaseId ?? null}
                    onCodeTabActive={onCodeTabActive}
                    onSelectUseCase={onProjectSelect}
                />
            );
        }
        return <DomainsGrid onDomainSelect={onDomainSelect} />;
    }
    if (childId === "scenarios") {
        if (activeProject) {
            const project = projects.find((p) => p.id === activeProject);
            if (project)
                return (
                    <ProjectDetailPanel
                        project={project}
                        onBack={onProjectBack}
                    />
                );
        }
        return <ProjectsGrid onProjectSelect={onProjectSelect} />;
    }
    if (childId === "tech") return <ComingSoonView childLabel="tech" />;
    if (childId === "demos") return <ComingSoonView childLabel="demos" />;

    /* Products */
    if (childId === "datalens")
        return <ProductDetailPage productId="datalens" />;
    if (childId === "embedfast")
        return <ProductDetailPage productId="embedfast" />;
    if (childId === "certyfast")
        return <ProductDetailPage productId="certyfast" />;
    if (childId === "loadfast")
        return <ProductDetailPage productId="loadfast" />;
    if (childId === "migratefast")
        return <ProductDetailPage productId="migratefast" />;

    /* Services */
    if (childId === "agentic-ai-ml")
        return <ServiceDetailPage serviceId="agentic-ai-ml" />;
    if (childId === "data-analytics")
        return <ServiceDetailPage serviceId="data-analytics" />;
    if (childId === "reporting-visualization")
        return <ServiceDetailPage serviceId="reporting-visualization" />;

    /* Training */
    if (childId === "coe") return <COETrainingGrid />;
    if (childId === "workshops") return <WorkshopsGrid />;
    if (childId === "internal-training")
        return (
            <LearningContentView
                onLdpTrackSelect={onSelectLdpTrack}
                onMlCourseSelect={onSelectMlCourse}
            />
        );

    /* Resources / IT */
    if (childId === "resource-planning")
        return <ComingSoonView childLabel="Resource Planning" />;

    /* Documentation */
    if (childId === "content") return <ComingSoonView childLabel="Content" />;
    if (childId === "website") return <ComingSoonView childLabel="Website" />;

    /* Architecture / Patterns Reference Library */
    if (childId === "standard-services") return <StandardServicesContent />;
    if (childId === "reference-architectures")
        return <ReferenceArchitecturesContent />;
    if (childId === "ai-landing-zone") return <AILandingZoneContent />;
    if (childId === "governance-security") return <GovernanceSecurityContent />;
    if (childId === "monitoring-alerting") return <MonitoringAlertingContent />;
    if (childId === "versioning-standards")
        return <VersioningStandardsContent />;
    if (childId === "use-case-architectures")
        return <UseCaseArchitecturesContent />;
    if (childId === "key-metrics") return <KeyMetricsContent />;

    /* Case Studies - branch with no children renders directly */
    if (activeBranch === "case-studies") return <CaseStudiesContent />;

    /* Knowledge Hub commented out
  if (activeBranch === "knowledge-hub") {
    if (childId === "kb-architectures") return <ArchitectureGallery onSelectUseCase={onSelectKbUseCase} />;
    if (childId === "kb-decision-guide") return <DecisionGuide onSelectUseCase={onSelectKbUseCase} />;
    if (childId === "kb-eval-framework") return <EvalFramework />;
    if (childId === "kb-sdlc") return <AgenticSdlc onSelectUseCase={onSelectKbUseCase} />;
    return <ArchitectureGallery onSelectUseCase={onSelectKbUseCase} />;
  }
  */

    /* AI Advisor commented out */
    // if (activeBranch === "ai-advisor") {
    //   const pending = localStorage.getItem("leap-advisor-pending") || advisorQuery || "";
    //   if (localStorage.getItem("leap-advisor-pending")) localStorage.removeItem("leap-advisor-pending");
    //   return <AdvisorContent initialQuery={pending} onNavigate={onNavigate} onSelectUseCase={(domainId, useCaseId) => {
    //     onPendingUseCaseNav?.(domainId, useCaseId);
    //   }} />;
    // }

    /* Leaderboard commented out */
    // if (activeBranch === "leaderboard") return <Leaderboard onNavigate={onNavigate} onSelectUseCase={(domainId, useCaseId) => {
    //   onPendingUseCaseNav?.(domainId, useCaseId);
    // }} />;

    return <ComingSoonView childLabel={childId} />;
};

/* ─── MAQ Software Services Section (embedded) ──────── */
const MAQ_SERVICES = [
    {
        id: "ai-ml",
        title: "Agentic AI & machine learning",
        description:
            "Harness the power of artificial intelligence and machine learning to automate processes and uncover hidden patterns.",
        url: "https://maqsoftware.com/services/artificial-intelligence-and-machine-learning",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <rect x="4" y="4" width="6" height="6" rx="1" />
                <rect x="14" y="4" width="6" height="6" rx="1" />
                <rect x="4" y="14" width="6" height="6" rx="1" />
                <rect x="14" y="14" width="6" height="6" rx="1" />
                <path d="M9 7h6" />
                <path d="M7 9v6" />
                <path d="M17 9v6" />
                <path d="M9 17h6" />
            </svg>
        ),
    },
    {
        id: "data-analytics",
        title: "Data & analytics",
        description:
            "Drive growth through data-driven insights and powerful analytics.",
        url: "https://maqsoftware.com/services/data-and-analytics",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <rect x="3" y="12" width="4" height="9" rx="0.5" />
                <rect x="10" y="7" width="4" height="14" rx="0.5" />
                <rect x="17" y="3" width="4" height="18" rx="0.5" />
            </svg>
        ),
    },
    {
        id: "reporting-visualization",
        title: "Reporting & visualization",
        description:
            "Visualize your data with intuitive reports and dashboards that provide clarity and insight at a glance.",
        url: "https://maqsoftware.com/services/reporting-and-visualization",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                <path d="M3 9h6" />
                <path d="M3 15h6" />
                <path d="M13 8l2 2 4-4" />
            </svg>
        ),
    },
    {
        id: "app-modernization",
        title: "Application modernization",
        description:
            "Update legacy systems with modern, scalable applications that enhance performance and user experience.",
        url: "https://maqsoftware.com/services/application-modernization",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <path d="M7 8l3 3-3 3" />
                <path d="M13 14h4" />
            </svg>
        ),
    },
    {
        id: "cloud-optimization",
        title: "Cloud optimization",
        description:
            "Adopt technologies for flexible, scalable, and cost-effective IT solutions that grow with your business.",
        url: "https://maqsoftware.com/services/cloud",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                <path d="M9 15l2 2 4-4" />
            </svg>
        ),
    },
    {
        id: "security",
        title: "Security",
        description:
            "Fortify your business with advanced security solutions that protect data, systems, and users from evolving threats.",
        url: "https://maqsoftware.com/services/security",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <circle cx="12" cy="11" r="1" />
                <path d="M12 12v3" />
            </svg>
        ),
    },
];

const MaqServicesSection: FC<{
    onActiveChange?: (active: boolean) => void;
}> = ({ onActiveChange }) => {
    const [activeServiceUrl, setActiveServiceUrl] = useState<string | null>(
        null,
    );

    useEffect(() => {
        onActiveChange?.(activeServiceUrl !== null);
    }, [activeServiceUrl, onActiveChange]);

    if (activeServiceUrl) {
        return (
            <div className="w-full h-full flex flex-col animate-leap-fade-in-up">
                <div
                    style={{
                        padding: "0 24px 8px",
                        borderBottom: "1px solid #e5e7eb",
                    }}
                >
                    <button
                        onClick={() => setActiveServiceUrl(null)}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "#dc2626",
                            fontWeight: 500,
                            fontSize: "14px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                        }}
                    >
                        <ArrowLeft size={16} />
                        Back to services
                    </button>
                </div>
                <iframe
                    src={activeServiceUrl}
                    title="MAQ Software Service"
                    style={{
                        width: "100%",
                        flex: 1,
                        border: "none",
                        minHeight: "calc(100vh - 7rem)",
                    }}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation-by-user-activation"
                />
            </div>
        );
    }

    return (
        <div
            style={{
                padding: "40px 48px",
                maxWidth: "1200px",
                fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
            }}
            className="animate-leap-fade-in-up"
        >
            <h2
                style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    color: "#1a1a1a",
                    marginBottom: "32px",
                }}
            >
                Services we provide
            </h2>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "24px",
                }}
            >
                {MAQ_SERVICES.map((svc) => (
                    <div
                        key={svc.id}
                        style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "32px 28px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            minHeight: "220px",
                            background: "#fff",
                            transition: "box-shadow 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow =
                                "0 4px 16px rgba(0,0,0,0.08)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    color: "#1a1a1a",
                                    marginBottom: "16px",
                                }}
                            >
                                {svc.icon}
                            </div>
                            <h3
                                style={{
                                    fontSize: "18px",
                                    fontWeight: 700,
                                    color: "#1a1a1a",
                                    marginBottom: "12px",
                                }}
                            >
                                {svc.title}
                            </h3>
                            <p
                                style={{
                                    fontSize: "14px",
                                    color: "#6b7280",
                                    lineHeight: 1.6,
                                    margin: 0,
                                }}
                            >
                                {svc.description}
                            </p>
                        </div>
                        <button
                            onClick={() => setActiveServiceUrl(svc.url)}
                            style={{
                                marginTop: "20px",
                                color: "#dc2626",
                                fontSize: "14px",
                                fontWeight: 500,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                                textAlign: "left",
                            }}
                        >
                            Learn more &gt;
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─── Services Tiles Grid ────────────────────────────── */
interface ServiceTileChild {
    id: string;
    label: string;
    description: string;
    icon?: string;
}

const ServicesTilesGrid: FC<{
    services: ServiceTileChild[];
    onSelect: (id: string) => void;
}> = ({ services, onSelect }) => {
    return (
        <div className="space-y-4 animate-leap-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 cards-grid-symmetric">
                {services.map((svc, index) =>
                    (() => {
                        const IconComponent = svc.icon
                            ? (Icons[
                                  svc.icon as keyof typeof Icons
                              ] as LucideIcon)
                            : null;

                        return (
                            <button
                                key={svc.id}
                                onClick={() => onSelect(svc.id)}
                                className="block group text-left w-full h-full"
                                style={{
                                    animationDelay: `${index * 80}ms`,
                                    animation: "fadeInUp 0.6s ease-out both",
                                }}
                            >
                                <div className="relative domain-card h-full overflow-hidden">
                                    <div className="flex flex-col h-full">
                                        {/* Icon */}
                                        <div className="flex items-start mb-4">
                                            {IconComponent && (
                                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                                                    <IconComponent className="w-5 h-5 text-primary" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3 line-clamp-2">
                                            {svc.label}
                                        </h3>

                                        {/* Description */}
                                        <p className="text-[#6b7280] text-sm leading-relaxed line-clamp-3">
                                            {svc.description}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })(),
                )}
            </div>
        </div>
    );
};

/* ─── Domains Grid ───────────────────────────────────── */
const DomainsGrid: FC<{ onDomainSelect: (id: string) => void }> = ({
    onDomainSelect,
}) => {
    return (
        <div className="space-y-4 animate-leap-fade-in-up">
            <div className="cards-grid-symmetric">
                {agentsData.domains.map((domain, index) => (
                    <DomainCardInline
                        key={domain.id}
                        id={domain.id}
                        domain={domain.domain}
                        description={domain.description}
                        icon={domain.icon}
                        useCaseCount={domain.use_cases.length}
                        index={index}
                        onClick={() => onDomainSelect(domain.id)}
                        disabled={domain.use_cases.length === 0}
                    />
                ))}
            </div>
        </div>
    );
};

/* ─── Inline Domain Card (no Link, uses onClick) ────── */
interface DomainCardInlineProps {
    id: string;
    domain: string;
    description: string;
    icon: string;
    useCaseCount: number;
    index: number;
    onClick: () => void;
    disabled?: boolean;
}

const DomainCardInline: FC<DomainCardInlineProps> = ({
    domain,
    description,
    icon,
    useCaseCount,
    index,
    onClick,
    disabled = false,
}) => {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const iconName = icon === "HeartPulse" ? "Heart" : icon;
    const IconComponent = Icons[iconName as keyof typeof Icons] as LucideIcon;
    const canExpandDescription = description.trim().length > 120;

    return (
        <div
            role={disabled ? undefined : "button"}
            tabIndex={disabled ? undefined : 0}
            onClick={disabled ? undefined : onClick}
            onKeyDown={
                disabled
                    ? undefined
                    : (e) => {
                          if (e.key === "Enter" || e.key === " ") onClick();
                      }
            }
            className={`block group text-left w-full h-full${
                disabled ? " opacity-60 cursor-default" : " cursor-pointer"
            }`}
            style={{
                animationDelay: `${index * 80}ms`,
                animation: "fadeInUp 0.6s ease-out both",
            }}
        >
            <div className="relative domain-card h-full overflow-hidden">
                <div className="flex flex-col h-full min-h-0">
                    {/* Icon + Count row */}
                    <div className="flex items-start justify-between mb-4">
                        <div
                            className={`flex items-center justify-center w-12 h-12 rounded-xl bg-[#F4F4F5] flex-shrink-0 ${disabled ? "text-[#8A8A8A]" : "text-[#565656]"}`}
                        >
                            {IconComponent && (
                                <IconComponent className="w-6 h-6" strokeWidth={1.7} />
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div
                                className={`w-1.5 h-1.5 rounded-full ${disabled ? "bg-[#C4C4C4]" : "bg-[#B01E28]"}`}
                            />
                            <span
                                className={`text-[13px] font-semibold ${disabled ? "text-[#9B9B9B]" : "text-[#B01E28]"}`}
                            >
                                {useCaseCount} solutions
                            </span>
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-[#1a1a1a] mb-3 line-clamp-2">
                        {domain}
                    </h3>

                    {/* Description */}
                    <div
                        className={
                            isDescriptionExpanded
                                ? "flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar"
                                : ""
                        }
                    >
                        <p
                            className={`text-[#6b7280] text-xs leading-relaxed ${isDescriptionExpanded ? "" : "line-clamp-3"}`}
                        >
                            {description}
                        </p>
                    </div>
                    {canExpandDescription && (
                        <span
                            role="button"
                            tabIndex={0}
                            className="mt-2 inline-flex text-xs font-medium text-primary hover:underline flex-shrink-0"
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setIsDescriptionExpanded((value) => !value);
                            }}
                            onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.key !== " ")
                                    return;
                                event.preventDefault();
                                event.stopPropagation();
                                setIsDescriptionExpanded((value) => !value);
                            }}
                        >
                            {isDescriptionExpanded ? "Read less" : "Read more"}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── Domain Detail View (sidebar + content) ─────────── */
const DomainDetailView: FC<{
    domainId: string;
    onDomainSwitch: (id: string) => void;
    initialUseCaseId?: string | null;
    onCodeTabActive?: (active: boolean) => void;
    onSelectUseCase?: (useCaseId: string) => void;
}> = ({
    domainId,
    onDomainSwitch,
    initialUseCaseId,
    onCodeTabActive,
    onSelectUseCase,
}) => {
    const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(
        null,
    );
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const handleTabChange = (tab: string) => {
        const isCode = tab === "codebase";
        setIsSidebarCollapsed(isCode);
        onCodeTabActive?.(isCode);
    };

    const domain = agentsData.domains.find((d) => d.id === domainId);

    useEffect(() => {
        if (!domain || domain.use_cases.length === 0) return;

        if (
            initialUseCaseId &&
            domain.use_cases.some((uc: any) => uc.id === initialUseCaseId)
        ) {
            setSelectedUseCaseId(initialUseCaseId);
            return;
        }

        const enabledOnes = domain.use_cases.filter((uc: any) => !uc.disabled);
        const sorted = (
            enabledOnes.length > 0 ? enabledOnes : domain.use_cases
        ).sort((a, b) => a.title.localeCompare(b.title));
        setSelectedUseCaseId(sorted[0].id);
    }, [domain, initialUseCaseId]);

    // Report the currently shown agent up so it can be persisted in the URL.
    useEffect(() => {
        if (selectedUseCaseId) onSelectUseCase?.(selectedUseCaseId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUseCaseId]);

    if (!domain) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Domain not found</p>
            </div>
        );
    }

    const selectedUseCase =
        domain.use_cases.find((uc) => uc.id === selectedUseCaseId) || null;

    return (
        <div className="animate-leap-fade-in-up h-full">
            {/* Sidebar + Content */}
            <div className="flex h-full overflow-hidden bg-card">
                <UseCaseSidebar
                    useCases={domain.use_cases}
                    selectedUseCaseId={selectedUseCaseId}
                    onSelectUseCase={setSelectedUseCaseId}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() =>
                        setIsSidebarCollapsed(!isSidebarCollapsed)
                    }
                />
                <TabContent
                    useCase={selectedUseCase}
                    onTabChange={handleTabChange}
                />
            </div>
        </div>
    );
};

/* ─── Knowledge Hub: Use Case Detail View (code-first) ── */
const KbUseCaseDetailView: FC<{
    domainId: string;
    useCaseId: string;
    onCodeTabActive?: (active: boolean) => void;
}> = ({ domainId, useCaseId, onCodeTabActive }) => {
    const domain = agentsData.domains.find((d) => d.id === domainId);
    const useCase = domain?.use_cases.find((uc) => uc.id === useCaseId) || null;

    const handleTabChange = (tab: string) => {
        onCodeTabActive?.(tab === "codebase");
    };

    if (!useCase) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Use case not found</p>
            </div>
        );
    }

    return (
        <div className="animate-leap-fade-in-up h-full">
            <div className="flex h-full overflow-hidden bg-card">
                <TabContent useCase={useCase} onTabChange={handleTabChange} />
            </div>
        </div>
    );
};

/* ─── Solutions: By industry (fixed 6 industries) ─────── */
type SolutionsIndustryId =
    | "retail"
    | "healthcare"
    | "finance"
    | "manufacturing"
    | "legal"
    | "engineering"
    | "feature-showcase"
    | "automotive"
    | "edge";

const USE_CASE_INDUSTRY_OVERRIDES: Record<string, SolutionsIndustryId> = {
    // Retail (10)
    "enterprise-knowledge-bot": "retail",
    "hiring-support-agent": "retail",
    "voice-faq-agent": "retail",
    "automated-customer-service": "retail",
    "automated-product-tag-generator": "retail",
    "fraud-anomaly-detection-agent": "retail",
    "loyalty-newsletter-enrollment": "retail",
    "personalization-engine": "retail",
    "product-discovery-bot": "retail",
    "planogram-compliance-agent": "retail",

    // Finance (10)
    "loan-underwriting-agent": "finance",
    "market-intelligence-pricing-agent": "finance",
    "invoice-extraction-agent": "finance",
    "invoice-po-matching-agent": "finance",
    "poe-scanner": "finance",
    "expense-forecaster": "finance",
    "expense-trend-analyzer": "finance",
    "executive-copilot-agent": "finance",
    "security-risk-analyzer-agent": "finance",
    "code-standards-reviewer-agent": "finance",

    // Legal (3)
    "legal-intake-routing": "legal",
    "ai-billing-timekeeper": "legal",
    "compliance-agent": "legal",

    // Manufacturing (2)
    "inventory-overview-agent": "manufacturing",
    "vendor-receipt-scanner": "manufacturing",

    // Engineering (6)
    "angular-migration-tool": "engineering",
    "pdf-extraction-utility": "engineering",
    "video-generator-agent": "engineering",
    "develop-fast": "engineering",
    "synthetic-data-generation": "engineering",
    "mcp-chat-application": "engineering",

    // Feature Showcase (6)
    "copilot-code-upgrade": "feature-showcase",
    "copilot-ui-testing": "feature-showcase",
    "copilot-accessibility-testing": "feature-showcase",
    "copilot-unit-testing": "feature-showcase",
    "copilot-mcp-server": "feature-showcase",
    "devops-powerbi-semantic-model": "feature-showcase",

    // Retail (additional)
    "agent-mart": "retail",
};

const SOLUTIONS_INDUSTRIES: Array<{
    id: SolutionsIndustryId;
    label: string;
    description: string;
    icon: string;
}> = [
    {
        id: "retail",
        label: "Retail",
        description:
            "Intelligent AI agents designed to streamline retail operations and elevate customer experiences. From inventory optimization to personalized shopping, these solutions drive efficiency and boost sales.",
        icon: "ShoppingCart",
    },
    {
        id: "healthcare",
        label: "Healthcare",
        description:
            "AI-powered agents built to enhance patient care and optimize clinical workflows. These solutions support healthcare teams in delivering safer, more efficient operations.",
        icon: "HeartPulse",
    },
    {
        id: "finance",
        label: "Finance",
        description:
            "AI agents that automate financial processes and strengthen compliance controls. They help teams manage risk, reduce errors, and accelerate document-heavy workflows.",
        icon: "DollarSign",
    },
    {
        id: "manufacturing",
        label: "Manufacturing",
        description:
            "AI agents focused on optimizing production lines and maintaining quality standards. These solutions improve operational visibility and workforce efficiency across the factory floor.",
        icon: "Factory",
    },
    {
        id: "legal",
        label: "Legal",
        description:
            "AI agents that streamline contract management, legal research, and compliance tracking. They help legal teams work faster while reducing risk and improving accuracy.",
        icon: "Scale",
    },
    {
        id: "engineering",
        label: "Engineering",
        description:
            "AI-powered tools that accelerate software engineering workflows — from code migration and generation to automated testing, DevOps, and synthetic data. These solutions boost developer productivity and streamline the entire SDLC.",
        icon: "Code2",
    },
    {
        id: "feature-showcase",
        label: "Feature Showcase",
        description:
            "Real-world demonstrations of AI-assisted development using GitHub Copilot and DevOps tooling. These showcases highlight how AI augments developer workflows across coding, testing, accessibility, and deployment pipelines.",
        icon: "Sparkles",
    },
    {
        id: "automotive",
        label: "Automotive",
        description:
            "AI agents powering smarter vehicle intelligence and fleet operations. These solutions enhance mobility services, route planning, and operational decision-making.",
        icon: "Car",
    },
    {
        id: "edge",
        label: "Edge",
        description:
            "Lightweight, high-performance AI agents designed to run at the edge — close to the data, with minimal latency and maximum efficiency. Purpose-built for environments where speed, privacy, and on-device intelligence are paramount.",
        icon: "Cpu",
    },
];

const toSolutionsIndustry = (domainId: string): SolutionsIndustryId => {
    const d = domainId.toLowerCase().trim();
    if (d === "retail") return "retail";
    if (d === "finance") return "finance";
    if (d === "legal") return "legal";
    if (d === "healthcare") return "healthcare";
    if (d === "manufacturing") return "manufacturing";
    if (d === "automotive" || d === "automative") return "automotive";
    if (d === "engineering") return "engineering";
    if (d === "feature-showcase") return "feature-showcase";

    // Remap remaining domains into the closest of the 8 buckets.
    // - compliance → legal
    // - hr → healthcare
    // - productivity → manufacturing
    if (d === "compliance") return "legal";
    if (d === "hr") return "healthcare";
    if (d === "productivity") return "manufacturing";

    // Catch-all (keeps every use case reachable)
    return "automotive";
};

const toSolutionsIndustryForUseCase = (
    domainId: string,
    useCaseId: string,
): SolutionsIndustryId => {
    return (
        USE_CASE_INDUSTRY_OVERRIDES[useCaseId] ?? toSolutionsIndustry(domainId)
    );
};

const INDUSTRY_VALUE_PROPOSITION: Record<SolutionsIndustryId, string> = {
    retail: "These scenarios help teams improve customer engagement, merchandising quality, and store operations.",
    healthcare:
        "These workflows focus on patient interactions, staff productivity, and safer care operations.",
    finance:
        "These use cases improve document-heavy finance workflows, strengthen controls, and reduce turnaround time.",
    manufacturing:
        "These workflows improve inventory visibility, supplier processing, and day-to-day operational reliability.",
    legal: "These solutions streamline legal intake, compliance tracking, and matter readiness across teams.",
    engineering:
        "These tools accelerate software development through AI-powered code migration, generation, testing, and synthetic data creation.",
    "feature-showcase":
        "These demonstrations showcase how AI augments developer workflows across coding, testing, accessibility, and deployment.",
    automotive:
        "These scenarios support mobility operations, service efficiency, and intelligent decision support.",
    edge: "These solutions bring AI-driven decision-making directly to the source — enabling real-time intelligence without cloud dependency.",
};

const formatUseCaseTitleList = (titles: string[]): string => {
    if (titles.length === 0) return "";
    if (titles.length === 1) return `“${titles[0]}”`;
    if (titles.length === 2) return `“${titles[0]}” and “${titles[1]}”`;
    return `“${titles[0]}”, “${titles[1]}”, and “${titles[2]}”`;
};

const buildIndustryDescription = (
    industryId: SolutionsIndustryId,
    titles: string[],
): string => {
    if (titles.length === 0) {
        return `This industry is ready for upcoming and cross-domain AI use cases as they are onboarded. ${INDUSTRY_VALUE_PROPOSITION[industryId]}`;
    }

    return `Use cases include ${formatUseCaseTitleList(titles)}. ${INDUSTRY_VALUE_PROPOSITION[industryId]}`;
};

const SolutionsIndustryTilesGrid: FC<{
    onSelectIndustry: (id: string) => void;
}> = ({ onSelectIndustry }) => {
    const industrySummaries = useMemo(() => {
        const map: Record<
            SolutionsIndustryId,
            { count: number; titles: string[] }
        > = {
            retail: { count: 0, titles: [] },
            healthcare: { count: 0, titles: [] },
            finance: { count: 0, titles: [] },
            manufacturing: { count: 0, titles: [] },
            legal: { count: 0, titles: [] },
            engineering: { count: 0, titles: [] },
            "feature-showcase": { count: 0, titles: [] },
            automotive: { count: 0, titles: [] },
            edge: { count: 0, titles: [] },
        };

        for (const d of agentsData.domains as any[]) {
            for (const uc of d.use_cases ?? []) {
                const bucket = toSolutionsIndustryForUseCase(d.id, uc.id);
                map[bucket].count += 1;
                if (map[bucket].titles.length < 3) {
                    map[bucket].titles.push(uc.title);
                }
            }
        }

        return map;
    }, []);

    return (
        <div className="space-y-4 animate-leap-fade-in-up">
            <div className="cards-grid-symmetric">
                {SOLUTIONS_INDUSTRIES.map((t, index) => {
                    const count = industrySummaries[t.id].count;
                    const isDisabled = count === 0;
                    return (
                        <DomainCardInline
                            key={t.id}
                            id={t.id}
                            domain={t.label}
                            description={t.description}
                            icon={t.icon}
                            useCaseCount={count}
                            index={index}
                            onClick={() => onSelectIndustry(t.id)}
                            disabled={isDisabled}
                        />
                    );
                })}
            </div>
        </div>
    );
};

const SolutionsIndustryDetailView: FC<{
    industryId: string;
    initialUseCaseId?: string | null;
    onCodeTabActive?: (active: boolean) => void;
    onSelectUseCase?: (useCaseId: string) => void;
}> = ({ industryId, initialUseCaseId, onCodeTabActive, onSelectUseCase }) => {
    const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(
        null,
    );
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const handleTabChange = (tab: string) => {
        const isCode = tab === "codebase";
        setIsSidebarCollapsed(isCode);
        onCodeTabActive?.(isCode);
    };

    const industry = SOLUTIONS_INDUSTRIES.find((x) => x.id === industryId);

    const useCases = useMemo(() => {
        const items = (agentsData.domains as any[]).flatMap((d) =>
            (d.use_cases ?? [])
                .filter(
                    (uc: any) =>
                        toSolutionsIndustryForUseCase(d.id, uc.id) ===
                        industryId,
                )
                .map((uc: any) => ({
                    ...uc,
                    __domainId: d.id as string,
                })),
        );
        return items.sort(compareUseCasesByPriority);
    }, [industryId]);

    useEffect(() => {
        if (useCases.length === 0) {
            setSelectedUseCaseId(null);
            return;
        }

        if (
            initialUseCaseId &&
            useCases.some((u: any) => u.id === initialUseCaseId)
        ) {
            setSelectedUseCaseId(initialUseCaseId);
            return;
        }

        setSelectedUseCaseId(useCases[0].id);
    }, [useCases, initialUseCaseId]);

    // Report the currently shown agent up so it can be persisted in the URL
    // (enables refresh / deep linking down to the selected agent).
    useEffect(() => {
        if (selectedUseCaseId) onSelectUseCase?.(selectedUseCaseId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUseCaseId]);

    if (!industry) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Industry not found</p>
            </div>
        );
    }

    const selected =
        useCases.find((uc: any) => uc.id === selectedUseCaseId) ?? null;

    // Re-hydrate the selected use case from its original domain so detail view stays accurate.
    const selectedFromDomain =
        selected && (selected as any).__domainId
            ? (() => {
                  const domain = (agentsData.domains as any[]).find(
                      (d) => d.id === (selected as any).__domainId,
                  );
                  return (
                      domain?.use_cases?.find(
                          (u: any) => u.id === selected.id,
                      ) ?? null
                  );
              })()
            : null;

    return (
        <div className="animate-leap-fade-in-up h-full">
            <div className="flex h-full overflow-hidden bg-card">
                <UseCaseSidebar
                    useCases={useCases}
                    selectedUseCaseId={selectedUseCaseId}
                    onSelectUseCase={setSelectedUseCaseId}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() =>
                        setIsSidebarCollapsed(!isSidebarCollapsed)
                    }
                />
                {selectedUseCaseId === "agent-eval" ? (
                    <AgentEvalContent
                        onCodeViewChange={onCodeTabActive}
                    />
                ) : (
                    <TabContent
                        useCase={
                            selectedFromDomain
                                ? (() => {
                                      const uc = selectedFromDomain as any;
                                      return {
                                          id: uc.id,
                                          title: uc.title,
                                          description: uc.description,
                                          key_features: uc.key_features ?? [],
                                          impact: uc.impact ?? "",
                                          has_video: uc.has_video ?? false,
                                          architecture: uc.architecture,
                                          component: uc.component,
                                          has_code: uc.has_code ?? false,
                                          github_repo: uc.github_repo,
                                      };
                                  })()
                                : null
                        }
                        onTabChange={handleTabChange}
                    />
                )}
            </div>
        </div>
    );
};

/* ─── Product Category Detail View (sidebar + content) ─── */
const ProductCategoryDetailView: FC<{
    categoryId: string;
}> = ({ categoryId }) => {
    const [selectedProductId, setSelectedProductId] = useState<string | null>(
        null,
    );
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const category = productCategories.find((c) => c.id === categoryId);

    useEffect(() => {
        if (category && category.products.length > 0) {
            const sorted = [...category.products].sort((a, b) =>
                a.title.localeCompare(b.title),
            );
            setSelectedProductId(sorted[0].id);
        }
    }, [category]);

    if (!category) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">
                    Product category not found
                </p>
            </div>
        );
    }

    const selectedProduct =
        category.products.find((p) => p.id === selectedProductId) || null;

    // Map products to the use case format expected by UseCaseSidebar and TabContent
    const useCases = category.products.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
    }));

    const selectedUseCase = selectedProduct
        ? {
              id: selectedProduct.id,
              title: selectedProduct.title,
              description: selectedProduct.description,
              key_features: selectedProduct.key_features,
              impact: selectedProduct.impact,
              has_video: !!selectedProduct.video_url,
          }
        : null;

    return (
        <div className="animate-leap-fade-in-up h-full">
            {/* Sidebar + Content */}
            <div className="flex h-full overflow-hidden bg-card">
                <UseCaseSidebar
                    useCases={useCases}
                    selectedUseCaseId={selectedProductId}
                    onSelectUseCase={setSelectedProductId}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() =>
                        setIsSidebarCollapsed(!isSidebarCollapsed)
                    }
                    sidebarLabel="Products"
                />
                <TabContent useCase={selectedUseCase} />
            </div>
        </div>
    );
};

/* ─── Learning Content View (Courses + Tutorials) ───── */
const LearningContentView: FC<{
    onLdpTrackSelect: (trackId: string) => void;
    onMlCourseSelect: (courseId: string) => void;
}> = ({ onLdpTrackSelect, onMlCourseSelect }) => {
    // Calculate summary stats
    const completed = mlCourses.filter(
        (c) => c.specializationStatus === "Completed",
    ).length;
    const inProgress = mlCourses.filter(
        (c) => c.specializationStatus === "In Progress",
    ).length;
    const notStarted = mlCourses.filter(
        (c) => c.specializationStatus === "Not Started",
    ).length;

    return (
        <div className="space-y-10 animate-leap-fade-in-up">
            <div>
                <div className="mb-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Brain className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">
                                    LDP – Machine Learning
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {mlCourses.length} specializations
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            {completed > 0 && (
                                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Completed: {completed}/{mlCourses.length}
                                </span>
                            )}
                            {inProgress > 0 && (
                                <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    In Progress: {inProgress}/{mlCourses.length}
                                </span>
                            )}
                            {notStarted > 0 && (
                                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                    Not Started: {notStarted}/{mlCourses.length}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Machine Learning Courses Grid */}
                <div className="cards-grid-symmetric">
                    {mlCourses.map((course, index) => (
                        <MlCourseCard
                            key={course.id}
                            course={course}
                            index={index}
                            onView={() => onMlCourseSelect(course.id)}
                        />
                    ))}
                </div>
            </div>
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4">
                    Courses
                </h2>
                <CoursesGrid />
            </div>
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4">
                    Tutorials
                </h2>
                <TutorialsGrid />
            </div>
        </div>
    );
};

/* ─── LDP ML Track Detail View (cards grid) ─── */
const LdpMlTrackDetailView: FC<{
    trackId: string;
    onSelectCourse: (courseId: string) => void;
}> = ({ onSelectCourse }) => {
    // Summary stats
    const completed = mlCourses.filter(
        (c) => c.specializationStatus === "Completed",
    ).length;
    const inProgress = mlCourses.filter(
        (c) => c.specializationStatus === "In Progress",
    ).length;
    const notStarted = mlCourses.filter(
        (c) => c.specializationStatus === "Not Started",
    ).length;

    return (
        <div className="space-y-6 animate-leap-fade-in-up">
            {/* Header row matching LDP portal */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">
                            Machine Learning
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {mlCourses.length} specializations
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {completed > 0 && (
                        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            Completed: {completed}/{mlCourses.length}
                        </span>
                    )}
                    {inProgress > 0 && (
                        <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            In Progress: {inProgress}/{mlCourses.length}
                        </span>
                    )}
                    {notStarted > 0 && (
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                            Not Started: {notStarted}/{mlCourses.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Course Cards Grid */}
            <div className="cards-grid-symmetric">
                {mlCourses.map((course, index) => (
                    <MlCourseCard
                        key={course.id}
                        course={course}
                        index={index}
                        onView={() => onSelectCourse(course.id)}
                    />
                ))}
            </div>
        </div>
    );
};

/* ─── ML Course Card (LDP-style, consistent size) ─── */
const MlCourseCard: FC<{
    course: MlCourse;
    index: number;
    onView: () => void;
}> = ({ course, index, onView }) => {
    const statusColor =
        course.specializationStatus === "Completed"
            ? "text-emerald-600"
            : course.specializationStatus === "In Progress"
              ? "text-blue-600"
              : "text-muted-foreground";

    const progressPercent =
        course.totalModules > 0
            ? (course.completedModules / course.totalModules) * 100
            : course.totalQuizzes > 0
              ? (course.completedQuizzes / course.totalQuizzes) * 100
              : 0;

    return (
        <button
            onClick={onView}
            className="block group text-left w-full h-full"
            style={{
                animationDelay: `${index * 80}ms`,
                animation: "fadeInUp 0.6s ease-out both",
            }}
        >
            <div className="relative domain-card p-6 h-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                <div className="flex flex-col h-full relative z-10">
                    <div className="flex-shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    course.specializationStatus === "Completed"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : course.specializationStatus ===
                                            "In Progress"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-gray-100 text-gray-700"
                                }`}
                            >
                                {course.specializationStatus}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                                {course.credits} cr
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col justify-between flex-1">
                        <div>
                            <h3 className="text-sm font-bold text-[#1a1a1a] mb-1 group-hover:text-primary transition-colors line-clamp-2">
                                [{course.code}] {course.title}
                            </h3>
                            <p className="text-[#6b7280] text-xs leading-snug mb-2 line-clamp-1">
                                {course.description}
                            </p>
                        </div>
                        <div className="mt-2 space-y-1">
                            {(course.totalModules > 0 ||
                                course.totalQuizzes > 0) && (
                                <>
                                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                course.specializationStatus ===
                                                "Completed"
                                                    ? "bg-emerald-500"
                                                    : course.specializationStatus ===
                                                        "In Progress"
                                                      ? "bg-blue-500"
                                                      : "bg-gray-300"
                                            }`}
                                            style={{
                                                width: `${progressPercent}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {course.totalModules > 0 &&
                                        course.totalQuizzes > 0 ? (
                                            <p>
                                                {course.completedModules}/
                                                {course.totalModules} mod •{" "}
                                                {course.completedQuizzes}/
                                                {course.totalQuizzes} quiz
                                            </p>
                                        ) : course.totalModules > 0 ? (
                                            <p>
                                                {course.completedModules}/
                                                {course.totalModules} modules
                                            </p>
                                        ) : (
                                            <p>
                                                {course.completedQuizzes}/
                                                {course.totalQuizzes} quizzes
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-500" />
            </div>
        </button>
    );
};

/* ─── ML Course Detail Page (full page view) ─── */
const MlCourseDetailPage: FC<{
    course: MlCourse;
}> = ({ course }) => {
    const statusColor =
        course.specializationStatus === "Completed"
            ? "text-emerald-600"
            : course.specializationStatus === "In Progress"
              ? "text-blue-600"
              : "text-muted-foreground";

    const statusBg =
        course.specializationStatus === "Completed"
            ? "bg-emerald-50 border-emerald-200"
            : course.specializationStatus === "In Progress"
              ? "bg-blue-50 border-blue-200"
              : "bg-gray-50 border-gray-200";

    const progressPercent =
        course.totalModules > 0
            ? (course.completedModules / course.totalModules) * 100
            : course.totalQuizzes > 0
              ? (course.completedQuizzes / course.totalQuizzes) * 100
              : 0;

    return (
        <div className="space-y-6 animate-leap-fade-in-up">
            {/* Header */}
            <div className="flex flex-col gap-4 items-start lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground">
                        [{course.code}] {course.title}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Machine Learning Specialization
                    </p>
                </div>
                {course.portalUrl && (
                    <a
                        href={course.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-sm font-medium text-primary flex-shrink-0"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Open in LDP Portal
                    </a>
                )}
            </div>

            {/* Status badges + Progress */}
            <div className="flex items-center gap-3 flex-wrap">
                <span
                    className={`text-xs px-3 py-1 rounded-full font-medium border ${statusBg} ${statusColor}`}
                >
                    {course.specializationStatus}
                </span>
                <span className="text-xs px-3 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                    {course.credits} credits
                </span>
                {course.totalModules > 0 && (
                    <span className="text-xs px-3 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                        Modules: {course.completedModules}/{course.totalModules}
                    </span>
                )}
                {course.totalQuizzes > 0 && (
                    <span className="text-xs px-3 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                        Quizzes: {course.completedQuizzes}/{course.totalQuizzes}
                    </span>
                )}

                {/* Compact progress bar */}
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                    <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                course.specializationStatus === "Completed"
                                    ? "bg-emerald-500"
                                    : course.specializationStatus ===
                                        "In Progress"
                                      ? "bg-blue-500"
                                      : "bg-gray-300"
                            }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                        {Math.round(progressPercent)}%
                    </span>
                </div>
            </div>

            {/* Description */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                    Description
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                    {course.description}
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
                {/* Key Topics */}
                <div className="bg-muted/30 rounded-xl border border-border p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <h4 className="text-sm font-semibold text-card-foreground">
                            Key Topics
                        </h4>
                    </div>
                    <div className="space-y-2">
                        {course.key_features.map((feat, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-card-foreground">
                                    {feat}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Impact */}
                <div className="bg-gradient-to-br from-primary/5 to-primary/0 rounded-xl border border-primary/15 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 bg-primary/15 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">
                            Impact
                        </h4>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                        {course.impact}
                    </p>
                </div>
            </div>
        </div>
    );
};

/* ─── Coming Soon Placeholder ────────────────────────── */
const ComingSoonView: FC<{ childLabel: string | null }> = ({ childLabel }) => {
    const label = childLabel
        ? childLabel.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "This section";

    return (
        <div className="flex flex-col items-center justify-center py-32 animate-leap-fade-in-up">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Rocket className="w-10 h-10 text-primary/60" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
                Coming Soon
            </h2>
            <p className="text-muted-foreground text-center max-w-md">
                <span className="font-medium text-foreground">{label}</span> is
                currently under development. Check back soon for updates!
            </p>
        </div>
    );
};
