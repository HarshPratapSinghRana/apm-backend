import type { SecurityIssue } from "../types/types";

// Use relative URLs when served from the same Flask backend
// const BASE_URL = "http://localhost:8000";
//export const BASE_URL = "https://maq-agents-portal-backend.azurewebsites.net";
export const BASE_URL = window.location.origin;
export const PROTOCOL = "https";
export const ENDPOINT = "maq-docusphere.azurewebsites.net";
export const analyzeCode = async (code: string, language: string) => {
    const response = await fetch(`${BASE_URL}/analyze`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, language }),
    });

    if (!response.ok) {
        throw new Error("Failed to analyze code");
    }

    return response.json();
};

export const exportToExcel = async (issues: SecurityIssue[]) => {
    const response = await fetch(`${BASE_URL}/export-issues-excel`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ issues }),
    });

    if (!response.ok) {
        throw new Error("Failed to export issues");
    }

    // Create a blob from the response
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Create a link element to download the file
    const a = document.createElement("a");
    a.href = url;
    a.download = "issues.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
};

export const documentIntelligence = async (
    pdf_url: string,
    user_query: string,
) => {
    const response = await fetch(`${BASE_URL}/api/document-intelligence`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdf_url, user_query }),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `Document intelligence request failed: ${response.status} ${text ?? ""}`,
        );
    }

    return response.json();
};

export const generateBackendZip = async (payload: Record<string, string>) => {
    const response = await fetch(`${BASE_URL}/generate-backend-zip`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `Generate backend zip failed: ${response.status} ${text ?? ""}`,
        );
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "ai_doc_intelligence_backend.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
};

export const getCodebase = async (blobZipUrl: string) => {
    const response = await fetch(`${BASE_URL}/get-codebase`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ blob_zip_url: blobZipUrl }),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `Failed to fetch codebase: ${response.status} ${text ?? ""}`,
        );
    }

    return response.json();
};

/**
 * Fetch video_url and code_base blob URLs for a use case from the backend.
 * Keeps sensitive blob SAS tokens out of the frontend bundle.
 */
export type MediaUrls = {
    video_url: string;
    code_base: string;
    github_repo: string;
    architecture_image: string;
    demo_embed_url: string;
    deck_embed_url: string;
    has_artifacts: boolean;
};

const EMPTY_MEDIA_URLS: MediaUrls = {
    video_url: "",
    code_base: "",
    architecture_image: "",
    github_repo: "",
    demo_embed_url: "",
    deck_embed_url: "",
    has_artifacts: false,
};

export const getMediaUrls = async (useCaseId: string): Promise<MediaUrls> => {
    const response = await fetch(
        `${BASE_URL}/api/media-urls/${encodeURIComponent(useCaseId)}`,
    );

    // A 404 simply means this use case has no media entry yet. Treat it as
    // "no media available" rather than an error so callers can render a graceful
    // disabled state instead of surfacing a console error / blank screen.
    if (response.status === 404) {
        return { ...EMPTY_MEDIA_URLS };
    }

    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `Failed to fetch media URLs: ${response.status} ${text ?? ""}`,
        );
    }

    const data = (await response.json()) as Partial<MediaUrls>;
    return {
        video_url: data.video_url ?? "",
        code_base: data.code_base ?? "",
        github_repo: data.github_repo ?? "",
        architecture_image: data.architecture_image ?? "",
        demo_embed_url: data.demo_embed_url ?? "",
        deck_embed_url: data.deck_embed_url ?? "",
        has_artifacts: data.has_artifacts ?? false,
    };
};

/* ─── GitHub proxy helpers ─── */

export const getGitHubTree = async (repoUrl: string, ref = "main") => {
    const response = await fetch(
        `${BASE_URL}/api/github/tree?repo_url=${encodeURIComponent(repoUrl)}&ref=${encodeURIComponent(ref)}`,
    );
    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `GitHub tree fetch failed: ${response.status} ${text ?? ""}`,
        );
    }
    return response.json();
};

export const getGitHubFile = async (
    repoUrl: string,
    path: string,
    ref = "main",
) => {
    const response = await fetch(
        `${BASE_URL}/api/github/file?repo_url=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(path)}&ref=${encodeURIComponent(ref)}`,
    );
    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `GitHub file fetch failed: ${response.status} ${text ?? ""}`,
        );
    }
    return response.json();
};

export const getGitHubReleases = async (repoUrl: string) => {
    const response = await fetch(
        `${BASE_URL}/api/github/releases?repo_url=${encodeURIComponent(repoUrl)}`,
    );
    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `GitHub releases fetch failed: ${response.status} ${text ?? ""}`,
        );
    }
    return response.json();
};

/* ─── Contribution workflow ─── */
// Contributors download the full project, edit/add/remove files locally with
// their own tools, and upload the whole thing back as a zip — see
// submitContributionZip() below. The backend diffs it against the live repo
// and commits only what actually changed.

export const getGitHubContributors = async (repoUrl: string) => {
    const response = await fetch(
        `${BASE_URL}/api/github/contributors?repo_url=${encodeURIComponent(repoUrl)}`,
    );
    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `GitHub contributors fetch failed: ${response.status} ${text ?? ""}`,
        );
    }
    return response.json();
};

export const getMergedContributors = async (repoUrl: string) => {
    const response = await fetch(
        `${BASE_URL}/api/github/merged-contributors?repo_url=${encodeURIComponent(repoUrl)}`,
    );
    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `Merged contributors fetch failed: ${response.status} ${text ?? ""}`,
        );
    }
    return response.json();
};

export interface MyContribution {
    pr_number: number;
    title: string;
    url: string;
    status: "open" | "merged" | "rejected";
    created_at: string;
    updated_at: string;
    merged_at: string | null;
}

/**
 * Check the live status (open / merged / rejected) of every contribution PR
 * a specific contributor has submitted for this repo. GitHub's own PR
 * notifications go to the shared bot account that owns GITHUB_PAT, not the
 * actual contributor, so this is how they can check status from the portal.
 */
export const getMyContributions = async (
    repoUrl: string,
    email: string,
): Promise<MyContribution[]> => {
    const response = await fetch(
        `${BASE_URL}/api/github/my-contributions?repo_url=${encodeURIComponent(repoUrl)}&email=${encodeURIComponent(email)}`,
    );
    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `My contributions fetch failed: ${response.status} ${text ?? ""}`,
        );
    }
    return response.json();
};

export interface ZipContributionPayload {
    repo_url: string;
    message: string;
    contributor_name: string;
    contributor_email: string;
    file: File;
    base_branch?: string;
    agent_name?: string;
}

export interface ZipContributionResult {
    success: boolean;
    pr_number: number;
    pr_url: string;
    branch: string;
    files_applied: { path: string; action: "update" | "add" | "delete" }[];
    files_skipped: string[];
    sharepoint_logged?: boolean;
    sharepoint_error?: string | null;
}

/**
 * Upload a full project zip (downloaded from the portal, edited locally with
 * the contributor's own tools, then re-zipped). The backend diffs it against
 * the live repo by git blob SHA and commits only what actually changed —
 * no manual per-file staging required.
 *
 * If a Graph bearer token is supplied (acquired on the frontend via MSAL),
 * it is forwarded via the X-Graph-Token header so the backend can also log
 * the submission as a row in the AI-LEAP-Github-Contribution-Submissions
 * SharePoint list. This is best-effort — omitting it just skips the log.
 * `agent_name` (the use case/agent title, e.g. "LaunchFAST") is written to
 * that list's Title column instead of the commit message.
 */
export const submitContributionZip = async (
    payload: ZipContributionPayload,
    graphToken?: string,
): Promise<ZipContributionResult> => {
    const formData = new FormData();
    formData.append("repo_url", payload.repo_url);
    formData.append("message", payload.message);
    formData.append("contributor_name", payload.contributor_name);
    formData.append("contributor_email", payload.contributor_email);
    formData.append("base_branch", payload.base_branch || "main");
    formData.append("agent_name", payload.agent_name || "");
    formData.append("file", payload.file);

    const response = await fetch(`${BASE_URL}/api/github/contribute-zip`, {
        method: "POST",
        headers: graphToken ? { "X-Graph-Token": graphToken } : undefined,
        body: formData,
    });
    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `Zip contribution failed: ${response.status} ${text ?? ""}`,
        );
    }
    return response.json();
};

/* ─── Agent Eval slide-deck (SharePoint) helper ─── */

/**
 * Fetch a short-lived, embeddable preview URL for the agent eval slide deck
 * stored in SharePoint. The Graph bearer token is acquired on the frontend
 * (MSAL) and forwarded via the X-Graph-Token header — the backend keeps the
 * SharePoint location and never exposes the token to the browser bundle.
 */
export const getDeckPreview = async (
    graphToken: string,
): Promise<{ preview_url: string; file_name: string }> => {
    const response = await fetch(`${BASE_URL}/api/sharepoint/deck-preview`, {
        headers: { "X-Graph-Token": graphToken },
    });
    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `Deck preview failed: ${response.status} ${text ?? ""}`,
        );
    }
    return response.json();
};

/**
 * Fetch a short-lived, pre-authenticated direct URL for the agent eval demo
 * video stored in the same SharePoint library as the deck. Plays in a <video>
 * tag (no iframe → no CSP), so it works for any signed-in user with access.
 */
export const getDeckVideoUrl = async (
    graphToken: string,
): Promise<{ video_url: string; file_name: string }> => {
    const response = await fetch(`${BASE_URL}/api/sharepoint/video-url`, {
        headers: { "X-Graph-Token": graphToken },
    });
    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `Video URL fetch failed: ${response.status} ${text ?? ""}`,
        );
    }
    return response.json();
};

/**
 * Fetch a short-lived, embeddable preview URL for a solution's artifact deck
 * (PPTX/PDF) stored in SharePoint. The deck location is resolved server-side
 * from media_urls.json, so only the solution id is passed from the browser.
 */
export const getArtifactPreview = async (
    useCaseId: string,
    graphToken: string,
): Promise<{ preview_url: string; file_name: string }> => {
    const response = await fetch(
        `${BASE_URL}/api/sharepoint/artifact-preview/${encodeURIComponent(
            useCaseId,
        )}`,
        {
            headers: { "X-Graph-Token": graphToken },
        },
    );
    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `Artifact preview failed: ${response.status} ${text ?? ""}`,
        );
    }
    return response.json();
};

/* ─── Agent feedback summary (aggregated likes/dislikes) ─── */
export interface FeedbackCounts {
    likes: number;
    dislikes: number;
}
export type FeedbackSummary = Record<string, FeedbackCounts>;

/**
 * Fetch aggregated Like/Dislike counts per agent (keyed by agent name/title)
 * from the SharePoint-backed feedback list. Used to sort agents by popularity.
 * Requires a Microsoft Graph token (acquired on the frontend via MSAL).
 */
export const getFeedbackSummary = async (
    graphToken: string,
): Promise<FeedbackSummary> => {
    const response = await fetch(`${BASE_URL}/api/feedback/summary`, {
        headers: { "X-Graph-Token": graphToken },
    });
    if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
            `Feedback summary fetch failed: ${response.status} ${text ?? ""}`,
        );
    }
    const data = await response.json();
    return (data.summary as FeedbackSummary) || {};
};

/* ─── Agent feedback helpers ─── */
export interface AgentFeedbackPayload {
    agentName: string;
    vote: "Like" | "Dislike";
    comment?: string;
    submittedBy?: string;
}

export const submitAgentFeedback = async (
    payload: AgentFeedbackPayload,
    graphToken: string,
    sharepointToken: string,
): Promise<{ success: boolean; item_id: string; list_name: string }> => {
    const response = await fetch(`${BASE_URL}/api/feedback`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Graph-Token": graphToken,
            "X-SharePoint-Token": sharepointToken,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.detail ||
                errorData.message ||
                `Feedback submission failed: ${response.statusText}`,
        );
    }

    return response.json();
};

export interface BannerConfig {
    enabled: boolean;
    agents?: Array<{
        id: string;
        title: string;
        domainId: string;
        domainName: string;
    }>;
    agent: {
        id: string;
        title: string;
        domainId: string;
        domainName: string;
    } | null;
}

export const getBannerConfig = async (): Promise<BannerConfig> => {
    const response = await fetch(`${BASE_URL}/api/banner-config`);
    if (!response.ok) {
        throw new Error("Failed to fetch banner config");
    }
    return response.json();
};
