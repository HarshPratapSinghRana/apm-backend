import { FC, useEffect, useRef, useState } from "react";
import {
    FlaskConical,
    Play,
    Loader2,
    Presentation,
    AlertCircle,
    Workflow,
    ListChecks,
    Gauge,
    ShieldCheck,
    Wrench,
    Sparkles,
    Bot,
    Maximize2,
    ArrowLeft,
} from "lucide-react";
import {
    InteractionRequiredAuthError,
    type AccountInfo,
} from "@azure/msal-browser";
import { getDeckPreview, getDeckVideoUrl } from "@/api/api";
import CodebaseTab from "@/components/CodebaseTab";
import { useAuth } from "@/hooks/useAuth";
import {
    graphUploadRequest,
    sharepointUploadRequest,
    getSharepointMsalInstance,
} from "@/auth/authConfig";

/** Acquire a Microsoft Graph token for the signed-in user via the SharePoint MSAL app. */
async function acquireGraphToken(account: AccountInfo): Promise<string> {
    const spInstance = await getSharepointMsalInstance();
    let spAccount =
        spInstance
            .getAllAccounts()
            .find(
                (a) =>
                    a.username?.toLowerCase() ===
                    account.username?.toLowerCase(),
            ) ?? null;
    if (!spAccount) {
        try {
            const sso = await spInstance.ssoSilent({
                loginHint: account.username,
            });
            spAccount = sso.account;
        } catch {
            const login = await spInstance.loginPopup({
                ...sharepointUploadRequest,
                loginHint: account.username,
            });
            spAccount = login.account;
        }
    }
    spInstance.setActiveAccount(spAccount);
    try {
        const res = await spInstance.acquireTokenSilent({
            ...graphUploadRequest,
            account: spAccount!,
        });
        return res.accessToken;
    } catch (err) {
        if (err instanceof InteractionRequiredAuthError) {
            const res = await spInstance.acquireTokenPopup({
                ...graphUploadRequest,
                account: spAccount!,
            });
            return res.accessToken;
        }
        throw err;
    }
}

/* ───────────────────────────────────────────────────────────────────────────
 * CONFIG
 *
 * MEDIA_ID  Key used to look up Agent Eval media + repo in the backend
 *           media_urls.json (served via /api/media-urls/:id). That entry holds
 *           `github_repo` (Skills & Docs source), `demo_embed_url` (the demo
 *           video iframe), and optionally `video_url` (SAS blob).
 *
 * Sensitive locations are NOT hardcoded here:
 *   - The repo URL + demo video embed live in backend media_urls.json.
 *   - The slide deck location lives in backend .env (SHAREPOINT_DECK_*),
 *     served via /api/sharepoint/deck-preview.
 * ─────────────────────────────────────────────────────────────────────────── */
const MEDIA_ID = "agent-eval";

/** GitHub web URL for a skill folder's SKILL.md, relative to the resolved repo. */
const skillPath = (skill: string) => `${skill}/SKILL.md`;

const DESCRIPTION = `If you're building AI agents with the Microsoft Agent Framework (agent-framework + agent-framework-foundry), you already get OpenTelemetry instrumentation out of the box. Every agent invocation, tool execution, and model interaction is automatically traced and recorded, giving you a complete, structured view of how your agent behaves in real time.

This built-in telemetry becomes especially powerful when paired with Agent Eval. It uses the captured traces to automatically evaluate production conversations, assessing response quality, correctness, and behavior at scale. Instead of relying on manual review of individual interactions, you get continuous, data-driven evaluation across all your agent traffic.

The result is a feedback loop where observability and evaluation work together — helping you detect issues faster, measure quality consistently, and improve agent performance continuously in production.`;

/** "The Big Picture" — the end-state evaluation flow. */
const BIG_PICTURE: string[] = [
    "Your agent handles a user request in production.",
    "OpenTelemetry captures a response_id linking to the full conversation stored in Foundry.",
    "A scheduled eval runner queries those response IDs from Application Insights.",
    "Foundry's evaluate_traces() fetches the complete conversation server-side (no truncation) and scores it across 17 quality dimensions.",
    "Results appear in the Foundry portal — pass/fail counts, per-item scores, judge reasoning, and trend comparisons across runs.",
];

/** "What You Need to Do — At a Glance". */
interface EvalStep {
    n: number;
    step: string;
    does: string;
    solves: string;
    skill?: string;
}

const STEPS: EvalStep[] = [
    {
        n: 1,
        step: "Install Packages",
        does: "Adds agent-framework, agent-framework-foundry, azure-monitor-opentelemetry, azure-identity, azure-monitor-query.",
        solves: "Without these, no instrumentation or evaluation capability exists.",
        skill: "01-packages",
    },
    {
        n: 2,
        step: "Enable OTel Instrumentation",
        does: "Adds configure_azure_monitor() + enable_instrumentation(enable_sensitive_data=True) to app startup.",
        solves: "Without this, the agent runs blind — no traces, no response_id, no way to evaluate.",
        skill: "02-instrumentation",
    },
    {
        n: 3,
        step: "Verify Traces in App Insights",
        does: "Run a KQL query in Log Analytics to confirm gen_ai.response.id values flow into AppDependencies.",
        solves: "Confirms instrumentation works before running evals; catches misconfig early.",
        skill: "03-verify-traces",
    },
    {
        n: 4,
        step: "Set Up the Eval Runner",
        does: "Create a script that queries response IDs from App Insights and calls evaluate_traces() with the evaluators.",
        solves: "Without this, there is no automated way to evaluate agent quality at scale.",
        skill: "04-eval-runner",
    },
    {
        n: 5,
        step: "Understand Evaluators & Scoring",
        does: "Learn what each of the 17 built-in evaluators measures and their scoring scales.",
        solves: "Helps you pick the right evaluators and set meaningful quality gates.",
        skill: "05-evaluators",
    },
    {
        n: 6,
        step: "View & Interpret Results",
        does: "Open the Foundry portal link from results.report_url for dashboards, per-item scores, reasoning, and trends.",
        solves: "Turns raw scores into actionable reasoning and trend tracking.",
    },
    {
        n: 7,
        step: "Set Up Scheduling",
        does: "Run evals on a recurring basis via notebooks or CI/CD.",
        solves: "One-time evals miss regressions; scheduled runs give continuous quality monitoring.",
    },
];

/** Built-in evaluators reference. */
interface EvaluatorGroup {
    title: string;
    scale: string;
    pass: string;
    icon: typeof Gauge;
    items: { name: string; measures: string }[];
}

const EVALUATOR_GROUPS: EvaluatorGroup[] = [
    {
        title: "Quality",
        scale: "1–5",
        pass: "≥ 3",
        icon: Gauge,
        items: [
            {
                name: "relevance",
                measures: "Response directly addresses the user's query.",
            },
            {
                name: "coherence",
                measures:
                    "Response is logically consistent and well-structured.",
            },
            {
                name: "groundedness",
                measures:
                    "Response is factually supported by retrieved context/data.",
            },
            {
                name: "fluency",
                measures: "Response uses proper grammar and natural language.",
            },
            {
                name: "response_completeness",
                measures: "Response fully answers all parts of the question.",
            },
            {
                name: "similarity",
                measures:
                    "Response is semantically similar to a reference answer.",
            },
        ],
    },
    {
        title: "Agent Behavior",
        scale: "1–5",
        pass: "≥ 3",
        icon: Bot,
        items: [
            {
                name: "task_adherence",
                measures:
                    "Agent follows the task/instructions in the system prompt.",
            },
            {
                name: "task_completion",
                measures: "Agent successfully completes the requested task.",
            },
            {
                name: "intent_resolution",
                measures:
                    "Agent correctly identifies and resolves the user's intent.",
            },
            {
                name: "task_navigation_efficiency",
                measures:
                    "Agent reaches the solution with minimal unnecessary steps.",
            },
        ],
    },
    {
        title: "Tool Usage",
        scale: "0 / 1",
        pass: "= 1",
        icon: Wrench,
        items: [
            {
                name: "tool_selection",
                measures: "Agent chose the right tool(s) for the task.",
            },
            {
                name: "tool_call_accuracy",
                measures: "Tool was called with correct parameters.",
            },
            {
                name: "tool_input_accuracy",
                measures: "Inputs passed to tools are accurate and complete.",
            },
            {
                name: "tool_output_utilization",
                measures:
                    "Agent properly used the tool's output in its response.",
            },
            {
                name: "tool_call_success",
                measures: "Tool call executed successfully without errors.",
            },
        ],
    },
    {
        title: "Safety",
        scale: "0–7 severity",
        pass: "= 0",
        icon: ShieldCheck,
        items: [
            {
                name: "hate_unfairness",
                measures: "Response contains hate speech or unfair content.",
            },
            {
                name: "violence",
                measures: "Response contains violent content.",
            },
            { name: "sexual", measures: "Response contains sexual content." },
            {
                name: "self_harm",
                measures: "Response contains self-harm content.",
            },
        ],
    },
];

const SectionCard: FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className,
}) => (
    <div
        className={`rounded-xl border border-card-border bg-card p-6 ${className ?? ""}`}
    >
        {children}
    </div>
);

/* ─── Overview: description + demo video (from SharePoint via Graph) ─── */
const OverviewView: FC<{ onOpenSkill?: (skill: string) => void }> = ({
    onOpenSkill,
}) => {
    const { accounts } = useAuth();
    const [videoUrl, setVideoUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [videoError, setVideoError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setVideoError(null);
            try {
                const account = accounts?.[0];
                if (!account)
                    throw new Error(
                        "You must be signed in to view the demo video.",
                    );
                const graphToken = await acquireGraphToken(account);
                const data = await getDeckVideoUrl(graphToken);
                if (!cancelled) setVideoUrl(data.video_url || "");
            } catch (e) {
                if (!cancelled) setVideoError((e as Error).message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [accounts]);

    return (
        <div className="space-y-6">
            <SectionCard>
                <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <FlaskConical className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-card-foreground">
                        Automated Agent Evaluation
                    </h2>
                </div>
                <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
                    {DESCRIPTION}
                </p>
            </SectionCard>

            {/* The Big Picture — end-state flow */}
            <SectionCard>
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Workflow className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-card-foreground">
                        The Big Picture
                    </h2>
                </div>
                <ol className="space-y-3">
                    {BIG_PICTURE.map((line, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {i + 1}
                            </span>
                            <span className="text-base leading-relaxed text-muted-foreground">
                                {line}
                            </span>
                        </li>
                    ))}
                </ol>
            </SectionCard>

            {/* What You Need to Do — steps */}
            <SectionCard>
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <ListChecks className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-card-foreground">
                        What You Need to Do
                    </h2>
                </div>
                <div className="space-y-3">
                    {STEPS.map((s) => (
                        <div
                            key={s.n}
                            className="rounded-lg border border-border bg-background/50 p-3"
                        >
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                    {s.n}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base font-semibold text-foreground">
                                            {s.step}
                                        </h3>
                                        {s.skill && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onOpenSkill?.(s.skill!)
                                                }
                                                title={`Open ${s.skill} skill`}
                                                className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                                            >
                                                <Sparkles className="h-3 w-3" />
                                                {s.skill}
                                            </button>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                        {s.does}
                                    </p>
                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground/80">
                                        <span className="font-medium text-foreground/70">
                                            Solves:
                                        </span>{" "}
                                        {s.solves}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* Built-in Evaluators */}
            <SectionCard>
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Gauge className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-card-foreground">
                        Built-in Evaluators
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {EVALUATOR_GROUPS.map((g) => {
                        const Icon = g.icon;
                        return (
                            <div
                                key={g.title}
                                className="rounded-lg border border-border bg-background/50 p-3"
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-primary" />
                                        <h3 className="text-base font-semibold text-foreground">
                                            {g.title}
                                        </h3>
                                    </div>
                                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                        {g.scale} · pass {g.pass}
                                    </span>
                                </div>
                                <ul className="space-y-1.5">
                                    {g.items.map((it) => (
                                        <li
                                            key={it.name}
                                            className="text-sm leading-relaxed"
                                        >
                                            <span className="font-mono font-medium text-foreground">
                                                {it.name}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {" "}
                                                — {it.measures}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </SectionCard>

            <SectionCard>
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Play className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-card-foreground">
                        Demo Video
                    </h2>
                </div>
                <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                    {loading ? (
                        <div className="flex h-full w-full items-center justify-center bg-black/5">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : videoUrl ? (
                        <video
                            src={videoUrl}
                            controls
                            className="h-full w-full rounded-lg bg-black"
                        >
                            Sorry, your browser does not support embedded
                            videos.
                        </video>
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                            <Play className="h-6 w-6 opacity-50" />
                            <span>
                                {videoError
                                    ? `Couldn't load the demo video. ${videoError}`
                                    : "No demo video available yet. Add it to the AgentEvalDeck SharePoint folder and set SHAREPOINT_DECK_VIDEO_FILE."}
                            </span>
                        </div>
                    )}
                </div>
            </SectionCard>
        </div>
    );
};

/* ─── Slide deck: PPTX rendered from SharePoint via Graph preview ─── */
const DeckView: FC = () => {
    const { accounts } = useAuth();
    const [previewUrl, setPreviewUrl] = useState("");
    const [fileName, setFileName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const deckRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onChange = () =>
            setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(null);
            try {
                const account = accounts?.[0];
                if (!account)
                    throw new Error("You must be signed in to view the deck.");

                const spInstance = await getSharepointMsalInstance();

                let spAccount =
                    spInstance
                        .getAllAccounts()
                        .find(
                            (a) =>
                                a.username?.toLowerCase() ===
                                account.username?.toLowerCase(),
                        ) ?? null;

                if (!spAccount) {
                    try {
                        const sso = await spInstance.ssoSilent({
                            loginHint: account.username,
                        });
                        spAccount = sso.account;
                    } catch {
                        const login = await spInstance.loginPopup({
                            ...sharepointUploadRequest,
                            loginHint: account.username,
                        });
                        spAccount = login.account;
                    }
                }
                spInstance.setActiveAccount(spAccount);

                let graphToken: string;
                try {
                    const res = await spInstance.acquireTokenSilent({
                        ...graphUploadRequest,
                        account: spAccount!,
                    });
                    graphToken = res.accessToken;
                } catch (err) {
                    if (err instanceof InteractionRequiredAuthError) {
                        const res = await spInstance.acquireTokenPopup({
                            ...graphUploadRequest,
                            account: spAccount!,
                        });
                        graphToken = res.accessToken;
                    } else {
                        throw err;
                    }
                }

                const data = await getDeckPreview(graphToken);
                if (!cancelled) {
                    setPreviewUrl(data.preview_url);
                    setFileName(data.file_name);
                }
            } catch (e) {
                if (!cancelled) setError((e as Error).message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [accounts]);

    if (loading) {
        return (
            <SectionCard>
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </SectionCard>
        );
    }

    if (error) {
        return (
            <SectionCard>
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            Could not load the slide deck
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {error}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Make sure you have access to the SharePoint library
                            and that the deck file exists.
                        </p>
                    </div>
                </div>
            </SectionCard>
        );
    }

    if (!previewUrl) {
        return (
            <SectionCard>
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
                    <Presentation className="h-8 w-8 opacity-50" />
                    <span>No deck available yet.</span>
                </div>
            </SectionCard>
        );
    }

    return (
        <SectionCard>
            <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Presentation className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-card-foreground">
                        {fileName || "Slide Deck"}
                    </h2>
                </div>
                <button
                    onClick={() => deckRef.current?.requestFullscreen?.()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
                    title="Present full screen"
                >
                    <Maximize2 className="h-4 w-4" />
                    Present
                </button>
            </div>

            <div
                ref={deckRef}
                className="flex items-center justify-center overflow-hidden rounded-lg border border-border bg-black"
            >
                <iframe
                    src={previewUrl}
                    title="Agent Eval slide deck"
                    className={`w-full bg-white ${isFullscreen ? "h-screen" : "h-[75vh]"}`}
                    allowFullScreen
                />
            </div>
        </SectionCard>
    );
};

/* ─── Skills & Docs: full GitHub file browser (reuses the Code tab) ─── */
const SkillsView: FC<{ initialFilePath?: string; onBack?: () => void }> = ({
    initialFilePath,
    onBack,
}) => (
    <div className="flex h-full flex-col">
        {onBack && (
            <div className="px-6 pt-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Overview
                </button>
            </div>
        )}
        <CodebaseTab
            minimal
            initialFilePath={initialFilePath}
            useCase={{
                id: MEDIA_ID,
                title: "Foundry Agent Evaluation",
                description: DESCRIPTION,
                key_features: [],
                impact: "",
            }}
        />
    </div>
);

type EvalTab = "overview" | "deck" | "skills";

const EVAL_TABS: { id: EvalTab; label: string; icon: typeof FlaskConical }[] = [
    { id: "overview", label: "Overview", icon: FlaskConical },
    { id: "deck", label: "Slide Deck", icon: Presentation },
    { id: "skills", label: "Skills & Docs", icon: ListChecks },
];

/**
 * Self-contained Agent Eval view with its own top tabs (Overview / Slide Deck /
 * Skills & Docs). Rendered as a custom agent view under Solutions → Engineering,
 * in place of the standard TabContent — without affecting other agents.
 */
export const AgentEvalContent: FC<{
    onCodeViewChange?: (active: boolean) => void;
}> = ({ onCodeViewChange }) => {
    const [tab, setTab] = useState<EvalTab>("overview");
    // Skill jump from the Overview steps opens that SKILL.md in the Skills tab.
    const [skillFile, setSkillFile] = useState<string | undefined>(undefined);

    // Collapse the outer Use Cases sidebar while the code viewer (Skills & Docs)
    // is open, matching the behaviour of the standard Code tab.
    useEffect(() => {
        onCodeViewChange?.(tab === "skills");
    }, [tab, onCodeViewChange]);

    const openSkill = (skill: string) => {
        setSkillFile(skillPath(skill));
        setTab("skills");
    };

    return (
        <div className="flex-1 flex flex-col bg-background min-w-0">
            {/* Tab bar */}
            <div className="border-b border-border bg-card">
                <div className="flex px-6">
                    {EVAL_TABS.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setTab(t.id);
                                    if (t.id !== "skills")
                                        setSkillFile(undefined);
                                }}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    active
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Icon className="w-4 h-4 inline-block mr-2" />
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-w-0">
                {tab === "skills" ? (
                    <SkillsView initialFilePath={skillFile} />
                ) : tab === "deck" ? (
                    <div className="w-full p-6">
                        <DeckView />
                    </div>
                ) : (
                    <div className="w-full p-6">
                        <OverviewView onOpenSkill={openSkill} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentEvalContent;
