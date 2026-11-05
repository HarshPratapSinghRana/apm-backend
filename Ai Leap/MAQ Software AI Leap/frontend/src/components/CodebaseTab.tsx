import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
    Check,
    ChevronRight,
    Download,
    Zap,
    Folder,
    Sparkles,
    Upload,
    GitBranch,
    ChevronDown,
    ChevronUp,
    X,
    FileCode2,
    Clock,
    User,
    Layers,
    Github,
    Code2,
    FolderOpen,
    GitPullRequest,
    FileArchive,
    ListChecks,
} from "lucide-react";
import {
    getCodebase,
    getMediaUrls,
    getGitHubTree,
    getGitHubFile,
    getGitHubReleases,
    submitContributionZip,
    getMyContributions,
    type MyContribution,
    BASE_URL,
} from "../api/api";
import StarterProjectGenerator from "./StarterProjectGenerator";
import VersionDiffViewer from "./VersionDiffViewer";
import {
    getVersions,
    getCurrentVersion,
    getNextVersion,
    isOwner,
    type CodeVersion,
} from "../data/code-ownership";
import { useMsal } from "@azure/msal-react";
import { graphUploadRequest, getSharepointMsalInstance } from "@/auth/authConfig";

interface UseCase {
    id: string;
    title: string;
    description: string;
    key_features: string[];
    impact: string;
    has_video?: boolean;
    category?: string;
    difficulty?: "Beginner" | "Intermediate" | "Advanced";
    estimated_time?: string;
    popularity_score?: number;
    tags?: string[];
    component?: string;
    has_code?: boolean;
    github_repo?: string;
    architecture?: string;
}

// ---------------------------------------------------------------- //
// NEW SKELETON COMPONENT
// ---------------------------------------------------------------- //
const FolderStructureSkeleton = () => {
    return (
        <div className="animate-pulse p-2 space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-2">
                    {/* Icon space */}
                    <div className="w-4 h-4 bg-muted-foreground/30 rounded"></div>
                    {/* Text line */}
                    <div
                        className="h-3 bg-muted-foreground/30 rounded"
                        style={{
                            width: `${60 + Math.random() * 40}%`,
                            marginLeft: `${i === 0 ? 0 : 16}px`,
                        }}
                    ></div>
                </div>
            ))}
        </div>
    );
};
// ---------------------------------------------------------------- //

// ---------------------------------------------------------------- //
// STATE A — Empty State (no code linked)
// ---------------------------------------------------------------- //
const EmptyCodeState = ({ useCase }: { useCase: UseCase }) => (
    <div className="tab-content p-6">
        <div className="bg-card rounded-xl border border-card-border overflow-hidden">
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="w-20 h-20 bg-muted/50 rounded-2xl flex items-center justify-center mb-6">
                    <Code2 className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <h2 className="text-xl font-semibold text-card-foreground mb-2">
                    No Code Linked Yet
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mb-8">
                    This use case doesn&apos;t have a codebase linked. Once a
                    GitHub repository or code archive is associated, you&apos;ll
                    be able to browse files, view versions, and download the
                    source code here.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground">
                        <FolderOpen className="w-4 h-4" />
                        <span>File browser</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground">
                        <GitBranch className="w-4 h-4" />
                        <span>Version history</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground">
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-6">
                    Coming soon — check back or contact the use-case owner to
                    request access.
                </p>
            </div>
        </div>

        {/* Still show Starter Project Generator */}
        {/*<div className="mt-5 bg-card rounded-xl border border-card-border overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4.5 h-4.5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-card-foreground">Generate Starter Project</h2>
            </div>
            <div className="p-4">
                <StarterProjectGenerator useCase={useCase} />
            </div>
        </div>*/}
    </div>
);
// ---------------------------------------------------------------- //

const CodebaseTab = ({
    useCase,
    minimal = false,
    initialFilePath,
}: {
    useCase: UseCase;
    minimal?: boolean;
    initialFilePath?: string;
}) => {
    // ── Resolved repo URL: fetched from backend media-urls API ──
    const [resolvedRepoUrl, setResolvedRepoUrl] = useState<string>(
        useCase.github_repo || "",
    );
    // Whether the backend media_urls.json declares a downloadable code base for
    // this agent. This (not useCase.has_code) is the source of truth.
    const [resolvedCodeBase, setResolvedCodeBase] = useState<string>("");
    const [mediaLoading, setMediaLoading] = useState(true);
    const [architectureImage, setArchitectureImage] = useState<string>("");
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Close lightbox on Escape key
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLightboxOpen(false);
        };
        if (lightboxOpen) document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [lightboxOpen]);

    // Fetch github_repo from backend media-urls API on mount
    useEffect(() => {
        let cancelled = false;
        setMediaLoading(true);
        getMediaUrls(useCase.id)
            .then((data) => {
                if (!cancelled) {
                    // Backend github_repo takes priority, then fallback to agents.json
                    setResolvedRepoUrl(
                        data.github_repo || useCase.github_repo || "",
                    );
                    setResolvedCodeBase(data.code_base || "");
                    setArchitectureImage(data.architecture_image || "");
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setResolvedRepoUrl(useCase.github_repo || "");
                    setResolvedCodeBase("");
                }
            })
            .finally(() => {
                if (!cancelled) setMediaLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [useCase.id]);

    // ── Determine which state we're in (media_urls.json is the source of truth) ──
    const isGitHub = !!resolvedRepoUrl;
    const hasBlob = !!resolvedCodeBase && !isGitHub;
    const isEmpty = !resolvedCodeBase && !isGitHub && !mediaLoading;

    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [folderStructure, setFolderStructure] = useState<any>(null);
    const [sidebarWidth, setSidebarWidth] = useState(288);
    const [isResizing, setIsResizing] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [showVersionDropdown, setShowVersionDropdown] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<string>("");
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadChangelog, setUploadChangelog] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showDiff, setShowDiff] = useState<{
        from: string;
        to: string;
    } | null>(null);
    const [sourceExpanded, setSourceExpanded] = useState(true);
    const [generatorExpanded, setGeneratorExpanded] = useState(false);
    const [archExpanded, setArchExpanded] = useState(true);
    const [techExpanded, setTechExpanded] = useState(true);
    const [ghFileLoading, setGhFileLoading] = useState(false);
    const [ghReleases, setGhReleases] = useState<any[]>([]);

    // ── Bulk upload contribution: download the whole repo, edit/add/remove
    // files locally with your own tools, re-zip, and upload the whole thing
    // back — the backend diffs it against the live repo (by git blob SHA)
    // and commits only what actually changed.
    const [showZipModal, setShowZipModal] = useState(false);
    const [zipFile, setZipFile] = useState<File | null>(null);
    const [zipMessage, setZipMessage] = useState("");
    const [zipSubmitting, setZipSubmitting] = useState(false);
    const [zipError, setZipError] = useState("");
    const [zipResult, setZipResult] = useState<{
        pr_number: number;
        pr_url: string;
        files_applied: { path: string; action: "update" | "add" | "delete" }[];
        files_skipped: string[];
        sharepoint_logged?: boolean;
        sharepoint_error?: string | null;
    } | null>(null);

    // Hide the top running banner while the Contribute popup is open, then
    // restore it when the popup closes or this tab unmounts.
    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent("app:banner-visibility", {
                detail: { open: showZipModal },
            }),
        );
        return () => {
            window.dispatchEvent(
                new CustomEvent("app:banner-visibility", {
                    detail: { open: false },
                }),
            );
        };
    }, [showZipModal]);

    // ── SharePoint account linking for the contribution log ──
    // A popup triggered several `await`s deep inside the "Submit Pull
    // Request" click handler arrives too late for browsers to recognize it
    // as a direct response to a user gesture, so it gets silently blocked.
    // Instead: `spLinked` reflects whether a SharePoint account is already
    // cached (checked silently, no popup, whenever the modal opens), and a
    // dedicated "Connect SharePoint" button below opens the popup as an
    // IMMEDIATE, un-delayed click — which browsers do not block.
    const [spLinked, setSpLinked] = useState(false);
    const [spLinking, setSpLinking] = useState(false);
    const [spLinkError, setSpLinkError] = useState("");

    const findCachedSpAccount = async () => {
        const account = accounts?.[0];
        if (!account) return null;
        const spInstance = await getSharepointMsalInstance();
        const spAccount =
            spInstance
                .getAllAccounts()
                .find(
                    (a) =>
                        a.username?.toLowerCase() ===
                        account.username?.toLowerCase(),
                ) ?? null;
        return spAccount ? { spInstance, spAccount } : null;
    };

    const tryGetGraphTokenSilently = async (): Promise<string | undefined> => {
        try {
            const cached = await findCachedSpAccount();
            if (!cached) return undefined;
            const { spInstance, spAccount } = cached;
            spInstance.setActiveAccount(spAccount);
            const result = await spInstance.acquireTokenSilent({
                ...graphUploadRequest,
                account: spAccount,
            });
            return result.accessToken;
        } catch (err) {
            console.warn(
                "Silent Graph token acquisition for SharePoint logging failed (non-blocking):",
                err,
            );
            return undefined;
        }
    };

    const handleConnectSharePoint = async () => {
        setSpLinking(true);
        setSpLinkError("");
        try {
            const account = accounts?.[0];
            if (!account) throw new Error("Sign in first.");
            const spInstance = await getSharepointMsalInstance();
            const login = await spInstance.loginPopup({
                ...graphUploadRequest,
                loginHint: account.username,
            });
            spInstance.setActiveAccount(login.account);
            setSpLinked(true);
        } catch (err) {
            setSpLinkError(
                err instanceof Error
                    ? err.message
                    : "Could not connect your SharePoint account.",
            );
        } finally {
            setSpLinking(false);
        }
    };

    // Silently (no popup) check once whether a SharePoint account is already
    // linked AND already consented for the Graph scope we need — merely
    // having a cached MSAL account (e.g. from the unrelated "Submit
    // Solution"/feedback flows) is not enough, since that account may never
    // have consented to Sites.ReadWrite.All, so we actually attempt a
    // silent token acquisition rather than just checking account presence.
    useEffect(() => {
        let cancelled = false;
        tryGetGraphTokenSilently().then((token) => {
            if (!cancelled && token) setSpLinked(true);
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── "My Contributions" panel: lets a contributor check the live status
    // (open/merged/rejected) of everything they've submitted, since GitHub's
    // own PR notifications go to the shared bot account, not to them.
    const [showMyContributions, setShowMyContributions] = useState(false);
    const [myContributions, setMyContributions] = useState<MyContribution[]>(
        [],
    );
    const [myContributionsLoading, setMyContributionsLoading] =
        useState(false);
    const [myContributionsError, setMyContributionsError] = useState("");

    // Set of folder node-keys (full paths) that are currently expanded in the tree.
    // We start collapsed and selectively open the root + ancestors of the initial file.
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
        new Set(),
    );
    const versionRef = useRef<HTMLDivElement>(null);
    // Ensures the "default to latest release" logic only runs once per
    // mount — otherwise it would keep overriding a user's manual version
    // selection every time the fetch effect re-runs.
    const hasDefaultedToLatestRelease = useRef(false);

    const { accounts } = useMsal();
    const userEmail = accounts?.[0]?.username ?? "";
    const userName = accounts?.[0]?.name ?? "Local Dev User";
    const canUpload = !!userEmail;
    const versions = getVersions(useCase.id);
    const currentVersion = getCurrentVersion(useCase.id);
    const nextVersion = getNextVersion(useCase.id);

    // Close version dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (
                versionRef.current &&
                !versionRef.current.contains(e.target as Node)
            ) {
                setShowVersionDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Set initial version. For GitHub repos, explicitly clear it (falls back
    // to showing "main") — the local `currentVersion` default only applies
    // to the non-GitHub blob-based versioning system. We wait for the async
    // media-urls fetch to resolve first, since `isGitHub` briefly reads as
    // false before it does — deciding too early would leave a stale local
    // default (e.g. "v1.0") stuck as the selected ref even after we learn
    // this is actually a GitHub-backed repo.
    useEffect(() => {
        if (mediaLoading) return;
        if (isGitHub) {
            setSelectedVersion("");
        } else {
            setSelectedVersion(currentVersion);
        }
    }, [currentVersion, isGitHub, mediaLoading]);

    const handleUploadSubmit = async () => {
        if (!uploadFile || !uploadChangelog.trim()) return;
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", uploadFile);
            formData.append("changelog", uploadChangelog);
            formData.append("uploader_name", userName);
            formData.append("uploader_email", userEmail);
            formData.append("use_case_id", useCase.id);

            const res = await fetch("/api/versions/upload", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                // Success — reload page to show new version
                setShowUploadModal(false);
                setUploadChangelog("");
                setUploadFile(null);
                window.location.reload();
            }
        } catch {
            // Upload failed — silently handle (backend not running)
        } finally {
            setUploading(false);
        }
    };

    // Build a zip download URL for the resolved repo + selected ref, proxied
    // through our own backend (which attaches GITHUB_PAT server-side) so
    // private repos download correctly regardless of the browser's own
    // GitHub login state. Uses the release tag when selected, else "main".
    const getGitHubArchiveUrl = (): string | null => {
        if (!resolvedRepoUrl) return null;
        const tagMatch = ghReleases.find((r) => r.tag === selectedVersion);
        const ref = tagMatch ? tagMatch.tag : "main";
        return `${BASE_URL}/api/github/download-zip?repo_url=${encodeURIComponent(resolvedRepoUrl)}&ref=${encodeURIComponent(ref)}`;
    };

    const handleDownload = () => {
        if (isGitHub) {
            const ghUrl = getGitHubArchiveUrl();
            if (ghUrl) {
                window.open(ghUrl, "_blank");
            }
            return;
        }
        if (downloadUrl) {
            window.open(downloadUrl, "_blank");
        }
    };

    useEffect(() => {
        // Wait until media URL fetch is complete before loading code
        if (mediaLoading) return;

        const fetchFolderStructure = async () => {
            setLoading(true);
            setError("");

            try {
                if (isGitHub && resolvedRepoUrl) {
                    // ── State B: GitHub-backed ──
                    // Fetch releases first so we know whether to default to
                    // the latest one before deciding what to browse.
                    let releases: any[] = [];
                    try {
                        releases = await getGitHubReleases(resolvedRepoUrl);
                        setGhReleases(releases);
                    } catch {
                        // Releases may not exist — that's fine
                    }

                    // Browse whatever the user already picked from the version
                    // dropdown. On first load only (no manual selection yet),
                    // default to the latest release if one exists; otherwise
                    // fall back to "main" — we never fabricate a version tag
                    // that doesn't actually exist as a ref.
                    let ref = selectedVersion || "main";
                    if (
                        !selectedVersion &&
                        !hasDefaultedToLatestRelease.current &&
                        releases.length > 0
                    ) {
                        hasDefaultedToLatestRelease.current = true;
                        const latest = [...releases].sort((a, b) =>
                            (b.date || "").localeCompare(a.date || ""),
                        )[0];
                        if (latest?.tag) {
                            ref = latest.tag;
                            setSelectedVersion(latest.tag);
                        }
                    }

                    const data = await getGitHubTree(resolvedRepoUrl, ref);
                    if (data?.structure) {
                        setFolderStructure(data.structure);
                        // Prefer an explicitly requested file (e.g. a skill SKILL.md opened
                        // from the Overview steps), then a README, then the first file.
                        const initialFile =
                            (initialFilePath &&
                                findFileByPath(
                                    data.structure,
                                    initialFilePath,
                                )) ||
                            findReadmeFile(data.structure) ||
                            findFirstFile(data.structure);
                        if (initialFile && initialFile.path) {
                            const initialKey = initialFile.path;
                            setSelectedFile(initialKey);
                            setExpandedFolders(
                                buildInitialExpandedSet(
                                    data.structure,
                                    initialFile.path,
                                ),
                            );
                            setGhFileLoading(true);
                            try {
                                const fileData = await getGitHubFile(
                                    resolvedRepoUrl,
                                    initialFile.path,
                                    ref,
                                );
                                setFileContent(
                                    fileData.content ||
                                        `// ${initialFile.name}\n// No content available`,
                                );
                            } catch {
                                setFileContent(
                                    `// ${initialFile.name}\n// Failed to load content`,
                                );
                            } finally {
                                setGhFileLoading(false);
                            }
                        } else {
                            setExpandedFolders(
                                buildInitialExpandedSet(data.structure, null),
                            );
                        }
                    }
                } else if (useCase?.has_code) {
                    // ── State C: Blob-backed ──
                    const mediaUrls = await getMediaUrls(useCase.id);
                    if (!mediaUrls.code_base) {
                        throw new Error(
                            "No code base URL available for this use case",
                        );
                    }
                    const data = await getCodebase(mediaUrls.code_base);
                    if (data?.structure) {
                        setFolderStructure(data.structure);
                        if (data?.sas_url) setDownloadUrl(data.sas_url);
                        const initialFile =
                            findReadmeFile(data.structure) ||
                            findFirstFile(data.structure);
                        if (initialFile) {
                            const initialKey =
                                initialFile.path || initialFile.name;
                            setSelectedFile(initialKey);
                            setExpandedFolders(
                                buildInitialExpandedSet(
                                    data.structure,
                                    initialFile.path || null,
                                ),
                            );
                            setFileContent(
                                initialFile.code ||
                                    `// ${initialFile.name}\n// No content available`,
                            );
                        } else {
                            setExpandedFolders(
                                buildInitialExpandedSet(data.structure, null),
                            );
                        }
                    } else {
                        throw new Error("Invalid API response format");
                    }
                } else {
                    setError("No code base URL provided");
                    setFolderStructure(null);
                }
            } catch (err) {
                console.error("Error fetching folder structure:", err);
                setError("Failed to load folder structure");
            } finally {
                setLoading(false);
            }
        };

        const findFirstFile = (
            node: any,
        ): { name: string; code?: string; path?: string } | null => {
            if (!node) return null;
            if (node.type === "file") return node;
            if (node.children) {
                for (const child of node.children) {
                    const found = findFirstFile(child);
                    if (found) return found;
                }
            }
            return null;
        };

        // Find a file by its path within the tree (case-insensitive). Matches either
        // an exact path or a path ending with the requested suffix, so "01-packages/SKILL.md"
        // resolves regardless of any leading folders.
        const findFileByPath = (
            root: any,
            target: string,
        ): { name: string; code?: string; path?: string } | null => {
            if (!root || !target) return null;
            const want = target.replace(/^\/+/, "").toLowerCase();
            const queue: any[] = [root];
            while (queue.length) {
                const node = queue.shift();
                if (!node) continue;
                if (node.type === "file" && typeof node.path === "string") {
                    const p = node.path.toLowerCase();
                    if (p === want || p.endsWith(`/${want}`)) return node;
                }
                if (node.children) queue.push(...node.children);
            }
            return null;
        };

        // Breadth-first search for a README anywhere in the repo. The shallowest match
        // wins, so a root-level README still takes priority, but READMEs nested under
        // a subproject (e.g. backend/README.md, docs/README.md) are also picked up.
        // Accepts common variants: README.md, README, README.rst, README.txt (case-insensitive).
        const findReadmeFile = (
            root: any,
        ): { name: string; code?: string; path?: string } | null => {
            if (!root) return null;
            const isReadme = (n: any) =>
                n &&
                n.type === "file" &&
                typeof n.name === "string" &&
                /^readme(\.(md|markdown|rst|txt))?$/i.test(n.name);
            const queue: any[] = [root];
            while (queue.length) {
                const node = queue.shift();
                if (!node || !node.children) continue;
                // Check direct children first so the shallowest README is preferred.
                const hit = node.children.find(isReadme);
                if (hit) return hit;
                for (const child of node.children) {
                    if (child && child.type === "folder") queue.push(child);
                }
            }
            return null;
        };

        // Build the initial expanded-folders set: always open the root container,
        // and if we have an initial file path, also open every ancestor folder so
        // the selected file is visible without further clicks.
        const buildInitialExpandedSet = (
            root: any,
            initialPath: string | null,
        ): Set<string> => {
            const expanded = new Set<string>();
            if (root && root.type === "folder") {
                // Root container has no path; we key it by its display name.
                expanded.add(root.name);
            }
            if (initialPath) {
                const parts = initialPath.split("/");
                // Add every ancestor folder path (exclude the leaf file itself).
                for (let i = 1; i < parts.length; i++) {
                    expanded.add(parts.slice(0, i).join("/"));
                }
            }
            return expanded;
        };

        fetchFolderStructure();
    }, [
        useCase.id,
        mediaLoading,
        resolvedRepoUrl,
        initialFilePath,
        selectedVersion,
    ]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const container = document.getElementById("code-viewer-container");
            if (!container) return;

            const containerRect = container.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;

            // Set min width to 200px and max width to 80% of container
            const minWidth = 200;
            const maxWidth = containerRect.width * 0.8;

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        if (isResizing) {
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);

    // Stable identifier for a tree node. Uses the GitHub-provided path when
    // available; otherwise falls back to a path built from the ancestor chain
    // so legacy blob structures without an explicit path still get unique keys.
    const getNodeKey = (node: any, parentPath: string): string => {
        if (node?.path) return node.path;
        return parentPath ? `${parentPath}/${node.name}` : node.name;
    };

    const toggleFolder = (key: string) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const renderFolderStructure = (node: any, depth = 0, parentPath = "") => {
        if (!node) return null;

        const nodeKey = getNodeKey(node, parentPath);
        const isFolder = node.type === "folder";
        const isExpanded = isFolder && expandedFolders.has(nodeKey);
        const isSelected = !isFolder && selectedFile === nodeKey;
        // 14px per level keeps deep trees readable; 8px base padding aligns with the row.
        const paddingLeft = depth * 14 + 8;

        return (
            <div key={nodeKey}>
                <button
                    type="button"
                    aria-expanded={isFolder ? isExpanded : undefined}
                    onClick={async () => {
                        if (isFolder) {
                            toggleFolder(nodeKey);
                            return;
                        }
                        setSelectedFile(nodeKey);
                        if (isGitHub && node.path && resolvedRepoUrl) {
                            // GitHub: fetch file content on demand, at whatever
                            // version (release tag or "main") is currently selected.
                            setGhFileLoading(true);
                            setFileContent(`// Loading ${node.name}...`);
                            try {
                                const fileData = await getGitHubFile(
                                    resolvedRepoUrl,
                                    node.path,
                                    selectedVersion || "main",
                                );
                                setFileContent(
                                    fileData.content ||
                                        `// ${node.name}\n// No content available`,
                                );
                            } catch {
                                setFileContent(
                                    `// ${node.name}\n// Failed to load content`,
                                );
                            } finally {
                                setGhFileLoading(false);
                            }
                        } else {
                            // Blob: content is inline
                            setFileContent(
                                node.code ||
                                    `// ${node.name}\n// No content available`,
                            );
                        }
                    }}
                    style={{ paddingLeft: `${paddingLeft}px` }}
                    className={`flex items-center gap-1.5 pr-2 py-1 rounded hover:bg-muted w-full text-left text-sm transition-colors ${isSelected ? "bg-muted" : ""}`}
                >
                    {isFolder ? (
                        <>
                            {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            )}
                            {isExpanded ? (
                                <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
                            ) : (
                                <Folder className="w-4 h-4 text-blue-500 shrink-0" />
                            )}
                        </>
                    ) : (
                        <>
                            {/* Spacer to align file names with folder labels (no twisty chevron for files). */}
                            <span
                                className="w-3.5 shrink-0"
                                aria-hidden="true"
                            />
                            <FileCode2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        </>
                    )}
                    <span className="text-card-foreground truncate">
                        {node.name}
                    </span>
                </button>
                {isFolder &&
                    isExpanded &&
                    node.children &&
                    node.children.map((child: any) =>
                        renderFolderStructure(child, depth + 1, nodeKey),
                    )}
            </div>
        );
    };

    // Dummy technical features
    const technicalFeatures = [
        "React 18 with TypeScript for type-safe development",
        "Tailwind CSS for responsive, modern UI design",
        "Component-based architecture for maintainability",
        "Built-in state management using React hooks",
        "Comprehensive error handling and validation",
    ];

    const isEnhanced = true;

    // ── State A: empty state (no code linked) ──
    if (isEmpty) {
        return <EmptyCodeState useCase={useCase} />;
    }

    if (isEnhanced) {
        return (
            <div className="tab-content p-6 space-y-5">
                {/* ── Source Code (full width) + Generator stacked below ── */}
                <div className="space-y-5">
                    {/* Source Code — full width */}
                    <div className="w-full">
                        <div className="bg-card rounded-xl border border-card-border overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <Folder className="w-4.5 h-4.5 text-primary" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-card-foreground">
                                        Source Code
                                    </h2>
                                    {isGitHub && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                                            <Github className="w-3 h-3" />{" "}
                                            GitHub
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Version Dropdown */}
                                    <div className="relative" ref={versionRef}>
                                        <button
                                            onClick={() =>
                                                setShowVersionDropdown(
                                                    !showVersionDropdown,
                                                )
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs font-mono text-card-foreground hover:bg-muted transition-colors"
                                        >
                                            <GitBranch className="w-3 h-3 text-primary" />
                                            {selectedVersion ||
                                                (isGitHub ? "main" : "v1.0")}
                                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                        </button>
                                        {showVersionDropdown && (
                                            <div className="absolute top-full right-0 mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                                                <div className="p-2 border-b border-border flex items-center justify-between">
                                                    <p className="text-xs font-medium text-muted-foreground">
                                                        {isGitHub
                                                            ? "Releases"
                                                            : "Version History"}
                                                    </p>
                                                    {!isGitHub && (
                                                        <button
                                                            onClick={() => {
                                                                setShowUploadModal(
                                                                    true,
                                                                );
                                                                setShowVersionDropdown(
                                                                    false,
                                                                );
                                                            }}
                                                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                                        >
                                                            <Upload className="w-3 h-3" />
                                                            Upload {nextVersion}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="max-h-48 overflow-y-auto">
                                                    {isGitHub ? (
                                                        ghReleases.length >
                                                        0 ? (
                                                            ghReleases.map(
                                                                (r) => (
                                                                    <div
                                                                        key={
                                                                            r.tag
                                                                        }
                                                                        onClick={() => {
                                                                            setSelectedVersion(
                                                                                r.tag,
                                                                            );
                                                                            setShowVersionDropdown(
                                                                                false,
                                                                            );
                                                                        }}
                                                                        className={`px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-start gap-2 cursor-pointer ${selectedVersion === r.tag ? "bg-primary/5" : ""}`}
                                                                    >
                                                                        <GitBranch
                                                                            className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${selectedVersion === r.tag ? "text-primary" : "text-muted-foreground"}`}
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2">
                                                                                <span
                                                                                    className={`font-mono text-xs font-medium ${selectedVersion === r.tag ? "text-primary" : "text-card-foreground"}`}
                                                                                >
                                                                                    {
                                                                                        r.tag
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground truncate">
                                                                                {
                                                                                    r.name
                                                                                }
                                                                            </p>
                                                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                                {
                                                                                    r.contributor_name ||
                                                                                    r.author
                                                                                }{" "}
                                                                                ·{" "}
                                                                                {r.date
                                                                                    ? new Date(
                                                                                          r.date,
                                                                                      ).toLocaleDateString(
                                                                                          "en-US",
                                                                                          {
                                                                                              month: "short",
                                                                                              day: "numeric",
                                                                                          },
                                                                                      )
                                                                                    : ""}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )
                                                        ) : (
                                                            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                                                No releases
                                                                found. Versions
                                                                are managed on
                                                                GitHub.
                                                            </div>
                                                        )
                                                    ) : versions.length > 0 ? (
                                                        versions.map((v) => (
                                                            <div
                                                                key={v.version}
                                                                className={`px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-start gap-2 ${selectedVersion === v.version ? "bg-primary/5" : ""}`}
                                                            >
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedVersion(
                                                                            v.version,
                                                                        );
                                                                        setShowVersionDropdown(
                                                                            false,
                                                                        );
                                                                    }}
                                                                    className="flex items-start gap-2 flex-1 min-w-0 text-left"
                                                                >
                                                                    <GitBranch
                                                                        className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${selectedVersion === v.version ? "text-primary" : "text-muted-foreground"}`}
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span
                                                                                className={`font-mono text-xs font-medium ${selectedVersion === v.version ? "text-primary" : "text-card-foreground"}`}
                                                                            >
                                                                                {
                                                                                    v.version
                                                                                }
                                                                            </span>
                                                                            {v.version ===
                                                                                currentVersion && (
                                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                                                                    current
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground truncate">
                                                                            {
                                                                                v.changelog
                                                                            }
                                                                        </p>
                                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                            {
                                                                                v
                                                                                    .uploaded_by
                                                                                    .name
                                                                            }{" "}
                                                                            ·{" "}
                                                                            {new Date(
                                                                                v.date,
                                                                            ).toLocaleDateString(
                                                                                "en-US",
                                                                                {
                                                                                    month: "short",
                                                                                    day: "numeric",
                                                                                },
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </button>
                                                                {v.version !==
                                                                    currentVersion && (
                                                                    <button
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            setShowDiff(
                                                                                {
                                                                                    from: v.version,
                                                                                    to: currentVersion,
                                                                                },
                                                                            );
                                                                            setShowVersionDropdown(
                                                                                false,
                                                                            );
                                                                        }}
                                                                        className="shrink-0 mt-0.5 text-[10px] px-1.5 py-0.5 rounded border border-violet-300 text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/20 transition-colors"
                                                                        title={`Compare ${v.version} → ${currentVersion}`}
                                                                    >
                                                                        Diff
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                                            No versions uploaded
                                                            yet.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleDownload}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-8 px-3 disabled:pointer-events-none disabled:opacity-50 shadow-sm whitespace-nowrap"
                                        disabled={!downloadUrl && !isGitHub}
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                                        Download
                                    </button>
                                    {isGitHub && (
                                        <button
                                            onClick={() => {
                                                setZipError("");
                                                setZipResult(null);
                                                setZipFile(null);
                                                setZipMessage("");
                                                setShowZipModal(true);
                                            }}
                                            title="Download the code, edit multiple files locally, then upload the whole zip back"
                                            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-muted/30 h-8 px-3 text-sm font-medium text-card-foreground hover:bg-muted transition-colors whitespace-nowrap"
                                        >
                                            <FileArchive className="w-3.5 h-3.5 shrink-0" />
                                            Contribute
                                        </button>
                                    )}
                                    {isGitHub && userEmail && (
                                        <button
                                            onClick={async () => {
                                                setShowMyContributions(true);
                                                setMyContributionsError("");
                                                setMyContributionsLoading(
                                                    true,
                                                );
                                                try {
                                                    const list =
                                                        await getMyContributions(
                                                            resolvedRepoUrl,
                                                            userEmail,
                                                        );
                                                    setMyContributions(
                                                        list || [],
                                                    );
                                                } catch (err) {
                                                    setMyContributionsError(
                                                        err instanceof Error
                                                            ? err.message
                                                            : "Failed to load your contributions.",
                                                    );
                                                } finally {
                                                    setMyContributionsLoading(
                                                        false,
                                                    );
                                                }
                                            }}
                                            title="Check the status (open/merged/rejected) of your submitted contributions"
                                            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-muted/30 h-8 px-3 text-sm font-medium text-card-foreground hover:bg-muted transition-colors whitespace-nowrap"
                                        >
                                            <ListChecks className="w-3.5 h-3.5 shrink-0" />
                                            My Contributions
                                        </button>
                                    )}
                                </div>
                            </div>
                            {/* Code viewer */}
                            <div
                                id="code-viewer-container"
                                className="flex flex-col"
                                style={{ height: "calc(100vh - 20rem)" }}
                            >
                                <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
                                    <div
                                        className="border-r border-border flex flex-col bg-muted/20 shrink-0"
                                        style={{ width: `${sidebarWidth}px` }}
                                    >
                                        <div className="p-3 border-b border-border flex-shrink-0">
                                            <h3 className="text-xs font-semibold text-card-foreground flex items-center gap-2">
                                                <Folder className="w-3.5 h-3.5" />{" "}
                                                Project Files
                                            </h3>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2">
                                            {loading ? (
                                                <FolderStructureSkeleton />
                                            ) : error ? (
                                                <div className="flex items-center justify-center h-32">
                                                    <div className="text-sm text-red-500">
                                                        {error}
                                                    </div>
                                                </div>
                                            ) : folderStructure ? (
                                                renderFolderStructure(
                                                    folderStructure,
                                                )
                                            ) : (
                                                <div className="flex items-center justify-center h-32">
                                                    <div className="text-sm text-muted-foreground">
                                                        No files available
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div
                                        onMouseDown={() => setIsResizing(true)}
                                        className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors relative group"
                                    >
                                        <div className="absolute inset-y-0 -left-1 -right-1"></div>
                                    </div>
                                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 min-w-0">
                                        {selectedFile ? (
                                            <div className="flex-1 flex flex-col bg-slate-900 text-white overflow-hidden m-2 rounded-lg shadow-lg">
                                                <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                        <span className="text-xs text-slate-300 ml-2 font-mono">
                                                            {selectedFile}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                        {
                                                            fileContent.split(
                                                                "\n",
                                                            ).length
                                                        }{" "}
                                                        lines
                                                    </div>
                                                </div>
                                                <div className="flex-1 overflow-auto">
                                                    <pre className="p-3 text-sm font-mono leading-relaxed">
                                                        <code className="text-slate-100">
                                                            {fileContent}
                                                        </code>
                                                    </pre>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center text-muted-foreground m-2">
                                                <div className="text-center space-y-2">
                                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                                                        <Folder className="w-6 h-6 text-primary opacity-50" />
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Select a file to view
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Generator — full width, below the code viewer */}
                    {!minimal && (
                        <div className="w-full">
                            <div className="bg-card rounded-xl border border-card-border overflow-hidden flex flex-col">
                                <div className="flex items-center gap-3 p-4 border-b border-border">
                                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <Sparkles className="w-4.5 h-4.5 text-primary" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-card-foreground">
                                        Generate Starter Project
                                    </h2>
                                </div>
                                <div className="p-4">
                                    <StarterProjectGenerator
                                        useCase={useCase}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Diff Viewer Modal */}
                {showDiff && (
                    <VersionDiffViewer
                        useCaseId={useCase.id}
                        fromVersion={showDiff.from}
                        toVersion={showDiff.to}
                        onClose={() => setShowDiff(null)}
                    />
                )}

                {/* Upload Modal */}
                {showUploadModal && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        onClick={() => setShowUploadModal(false)}
                    >
                        <div
                            className="bg-card rounded-xl border border-card-border shadow-2xl w-full max-w-md mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-5 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                                        <Upload className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-card-foreground">
                                            Upload New Version
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            This will create{" "}
                                            <span className="font-mono font-medium text-primary">
                                                {nextVersion}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    className="text-muted-foreground hover:text-card-foreground transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                                        {userName
                                            .split(" ")
                                            .map((n: string) => n[0])
                                            .join("")}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-card-foreground">
                                            {userName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {userEmail || "local@dev"}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                                        Changelog *
                                    </label>
                                    <textarea
                                        value={uploadChangelog}
                                        onChange={(e) =>
                                            setUploadChangelog(e.target.value)
                                        }
                                        rows={3}
                                        placeholder="Describe what changed in this version..."
                                        className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                                        Code Archive (.zip) *
                                    </label>
                                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                                        <input
                                            type="file"
                                            accept=".zip"
                                            className="hidden"
                                            onChange={(e) =>
                                                setUploadFile(
                                                    e.target.files?.[0] ?? null,
                                                )
                                            }
                                        />
                                        {uploadFile ? (
                                            <div className="flex items-center gap-2 text-sm text-card-foreground">
                                                <FileCode2 className="w-4 h-4 text-primary" />
                                                <span className="font-medium">
                                                    {uploadFile.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    (
                                                    {(
                                                        uploadFile.size / 1024
                                                    ).toFixed(0)}{" "}
                                                    KB)
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="text-center text-sm text-muted-foreground">
                                                <Upload className="w-5 h-5 mx-auto mb-1" />
                                                Click to select .zip file
                                            </div>
                                        )}
                                    </label>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Uploaded to: Azure Blob Storage ·
                                    Auto-versioned as{" "}
                                    <span className="font-mono text-primary">
                                        {nextVersion}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-card-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUploadSubmit}
                                    disabled={
                                        !uploadFile ||
                                        !uploadChangelog.trim() ||
                                        uploading
                                    }
                                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {uploading ? (
                                        <>Uploading...</>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />{" "}
                                            Upload {nextVersion}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Contribute Modal — download, edit locally, re-zip, upload the whole thing back */}
                {showZipModal && createPortal(
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() =>
                            !zipSubmitting && setShowZipModal(false)
                        }
                    >
                        <div
                            className="bg-card rounded-xl border border-card-border shadow-2xl w-full max-w-lg max-h-[88dvh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                                        <FileArchive className="w-5 h-5 text-violet-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-card-foreground">
                                            Contribute
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Edit as many files as you want,
                                            all at once
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() =>
                                        !zipSubmitting &&
                                        setShowZipModal(false)
                                    }
                                    className="text-muted-foreground hover:text-card-foreground transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {zipResult ? (
                                <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
                                    <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
                                        <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-card-foreground">
                                                Pull Request #
                                                {zipResult.pr_number} opened
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Your changes are pending
                                                review on GitHub. They'll only
                                                appear here once a maintainer
                                                merges the PR and publishes a
                                                new release.
                                            </p>
                                        </div>
                                    </div>
                                    {zipResult.sharepoint_error && (
                                        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg px-3 py-2">
                                            Not logged to the SharePoint contributions list: {zipResult.sharepoint_error}
                                        </p>
                                    )}
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {zipResult.files_applied.map((f) => (
                                            <div
                                                key={f.path}
                                                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50"
                                            >
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                                                        f.action === "delete"
                                                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                                            : f.action ===
                                                                "add"
                                                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                                    }`}
                                                >
                                                    {f.action === "delete"
                                                        ? "Removed"
                                                        : f.action === "add"
                                                          ? "Added"
                                                          : "Modified"}
                                                </span>
                                                <span className="text-xs font-mono text-card-foreground truncate flex-1">
                                                    {f.path}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {zipResult.files_skipped.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Left untouched (too large,
                                                binary, or ignored — not
                                                deleted):
                                            </p>
                                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                                {zipResult.files_skipped.map(
                                                    (path) => (
                                                        <div
                                                            key={path}
                                                            className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/30"
                                                        >
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 bg-muted text-muted-foreground">
                                                                Skipped
                                                            </span>
                                                            <span className="text-xs font-mono text-muted-foreground truncate flex-1">
                                                                {path}
                                                            </span>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-end gap-3">
                                        <button
                                            onClick={() => {
                                                setShowZipModal(false);
                                                setZipFile(null);
                                                setZipMessage("");
                                                setZipResult(null);
                                            }}
                                            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
                                        <ol className="text-sm text-card-foreground space-y-2 list-decimal list-inside">
                                            <li>
                                                <button
                                                    onClick={handleDownload}
                                                    className="text-primary hover:underline font-medium"
                                                >
                                                    Download the current code
                                                </button>{" "}
                                                as a zip.
                                            </li>
                                            <li>
                                                Edit, add, or remove any files
                                                you like in the extracted
                                                folder, using your own
                                                editor/tools.
                                            </li>
                                            <li>
                                                Re-zip the{" "}
                                                <span className="font-medium">
                                                    entire folder
                                                </span>{" "}
                                                (not just the changed files)
                                                and upload it below.
                                            </li>
                                        </ol>
                                        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                                            We compare your zip against the
                                            current repository and
                                            automatically detect additions,
                                            edits, and removals — you don't
                                            need to tell us what changed.
                                        </p>

                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                                                {userName
                                                    .split(" ")
                                                    .map((n: string) => n[0])
                                                    .join("")}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-card-foreground">
                                                    {userName}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {userEmail || "local@dev"}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                                                Zip file *
                                            </label>
                                            <input
                                                type="file"
                                                accept=".zip"
                                                onChange={(e) =>
                                                    setZipFile(
                                                        e.target.files?.[0] ??
                                                            null,
                                                    )
                                                }
                                                className="w-full text-sm text-card-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-violet-100 file:text-violet-700 dark:file:bg-violet-950/40 dark:file:text-violet-400 hover:file:bg-violet-200 dark:hover:file:bg-violet-950/60 transition-colors"
                                            />
                                            {zipFile && (
                                                <p className="text-xs text-muted-foreground mt-1.5">
                                                    Selected:{" "}
                                                    <span className="font-mono">
                                                        {zipFile.name}
                                                    </span>{" "}
                                                    (
                                                    {(
                                                        zipFile.size /
                                                        1024
                                                    ).toFixed(1)}{" "}
                                                    KB)
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                                                Commit message / changelog *
                                            </label>
                                            <textarea
                                                value={zipMessage}
                                                onChange={(e) =>
                                                    setZipMessage(
                                                        e.target.value,
                                                    )
                                                }
                                                rows={2}
                                                placeholder="Describe what changed and why..."
                                                className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                                            />
                                        </div>
                                        {zipError && (
                                            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg px-4 py-2">
                                                {zipError}
                                            </p>
                                        )}
                                        {!spLinked && (
                                            <div className="flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 bg-violet-50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30">
                                                <p className="text-xs text-muted-foreground">
                                                    Connect your SharePoint
                                                    account so this
                                                    submission is also logged
                                                    for maintainer email
                                                    alerts (optional).
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={
                                                        handleConnectSharePoint
                                                    }
                                                    disabled={spLinking}
                                                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
                                                >
                                                    {spLinking
                                                        ? "Connecting..."
                                                        : "Connect SharePoint"}
                                                </button>
                                            </div>
                                        )}
                                        {spLinkError && (
                                            <p className="text-xs text-red-500">
                                                {spLinkError}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            This opens ONE Pull Request on
                                            GitHub covering every detected
                                            change — it will not change{" "}
                                            <span className="font-mono">
                                                {selectedVersion || "main"}
                                            </span>{" "}
                                            until a maintainer reviews and
                                            merges it.
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-end gap-3 p-4 border-t border-border flex-shrink-0">
                                        <button
                                            onClick={() =>
                                                setShowZipModal(false)
                                            }
                                            disabled={zipSubmitting}
                                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-card-foreground transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (
                                                    !zipFile ||
                                                    !zipMessage.trim()
                                                )
                                                    return;
                                                setZipSubmitting(true);
                                                setZipError("");
                                                try {
                                                    // Best-effort, silent-only: never opens a popup
                                                    // here (a popup this deep into the click handler
                                                    // arrives too late for browsers to treat it as a
                                                    // direct user gesture and gets silently blocked).
                                                    // Use the "Connect SharePoint" button instead to
                                                    // link an account via an immediate popup.
                                                    const graphToken =
                                                        await tryGetGraphTokenSilently();
                                                    const result =
                                                        await submitContributionZip(
                                                            {
                                                                repo_url:
                                                                    resolvedRepoUrl,
                                                                message:
                                                                    zipMessage,
                                                                contributor_name:
                                                                    userName,
                                                                contributor_email:
                                                                    userEmail,
                                                                file: zipFile,
                                                                agent_name:
                                                                    useCase.title,
                                                            },
                                                            graphToken,
                                                        );
                                                    setZipResult({
                                                        pr_number:
                                                            result.pr_number,
                                                        pr_url: result.pr_url,
                                                        files_applied:
                                                            result.files_applied,
                                                        files_skipped:
                                                            result.files_skipped,
                                                        sharepoint_logged:
                                                            result.sharepoint_logged,
                                                        sharepoint_error:
                                                            result.sharepoint_error,
                                                    });
                                                } catch (err) {
                                                    setZipError(
                                                        err instanceof Error
                                                            ? err.message
                                                            : "Failed to submit contribution.",
                                                    );
                                                } finally {
                                                    setZipSubmitting(false);
                                                }
                                            }}
                                            disabled={
                                                !zipFile ||
                                                !zipMessage.trim() ||
                                                zipSubmitting
                                            }
                                            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            {zipSubmitting ? (
                                                <>Uploading...</>
                                            ) : (
                                                <>
                                                    <GitPullRequest className="w-4 h-4" />
                                                    Submit Pull Request
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>,
                    document.body,
                )}

                {/* My Contributions Panel — lets a contributor check the live status
                    (open/merged/rejected) of everything they've submitted, since
                    GitHub's own PR notifications go to the shared bot account. */}
                {showMyContributions && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        onClick={() => setShowMyContributions(false)}
                    >
                        <div
                            className="bg-card rounded-xl border border-card-border shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                                        <ListChecks className="w-5 h-5 text-violet-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-card-foreground">
                                            My Contributions
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {userEmail || "local@dev"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() =>
                                        setShowMyContributions(false)
                                    }
                                    className="text-muted-foreground hover:text-card-foreground transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-5 space-y-2 overflow-y-auto">
                                {myContributionsLoading ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">
                                        Loading...
                                    </p>
                                ) : myContributionsError ? (
                                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg px-4 py-2">
                                        {myContributionsError}
                                    </p>
                                ) : myContributions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">
                                        No contributions found for this email
                                        yet.
                                    </p>
                                ) : (
                                    myContributions.map((c) => (
                                        <div
                                            key={c.pr_number}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                                        >
                                            <span
                                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                                                    c.status === "merged"
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                        : c.status ===
                                                            "rejected"
                                                          ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                                }`}
                                            >
                                                {c.status === "merged"
                                                    ? "Merged"
                                                    : c.status === "rejected"
                                                      ? "Rejected"
                                                      : "Pending review"}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-card-foreground truncate">
                                                    {c.title}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    #{c.pr_number} ·{" "}
                                                    {new Date(
                                                        c.updated_at,
                                                    ).toLocaleDateString(
                                                        "en-US",
                                                        {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        },
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="tab-content p-6 space-y-5">
            {/* ── Source Code Pill — collapsible ── */}
            <div className="bg-card rounded-xl border border-card-border overflow-hidden">
                <button
                    onClick={() => setSourceExpanded(!sourceExpanded)}
                    className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Folder className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold text-card-foreground">
                            Source Code
                        </h2>
                    </div>
                    {sourceExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                </button>
                {sourceExpanded && (
                    <div
                        id="code-viewer-container"
                        className="flex flex-col"
                        style={{ height: "calc(100vh - 18rem)" }}
                    >
                        {/* Header bar with version + action buttons */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-b border-border flex-shrink-0 bg-muted/10">
                            <div className="flex items-center gap-2">
                                {/* Version Dropdown — always shown for Upload access */}
                                <div className="relative" ref={versionRef}>
                                    <button
                                        onClick={() =>
                                            setShowVersionDropdown(
                                                !showVersionDropdown,
                                            )
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs font-mono text-card-foreground hover:bg-muted transition-colors"
                                    >
                                        <GitBranch className="w-3 h-3 text-primary" />
                                        {selectedVersion || "v1.0"}
                                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                    {showVersionDropdown && (
                                        <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                                            <div className="p-2 border-b border-border flex items-center justify-between">
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    Version History
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setShowUploadModal(
                                                            true,
                                                        );
                                                        setShowVersionDropdown(
                                                            false,
                                                        );
                                                    }}
                                                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                                >
                                                    <Upload className="w-3 h-3" />
                                                    Upload {nextVersion}
                                                </button>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                                {versions.length > 0 ? (
                                                    versions.map((v) => (
                                                        <div
                                                            key={v.version}
                                                            className={`px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-start gap-2 ${selectedVersion === v.version ? "bg-primary/5" : ""}`}
                                                        >
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedVersion(
                                                                        v.version,
                                                                    );
                                                                    setShowVersionDropdown(
                                                                        false,
                                                                    );
                                                                }}
                                                                className="flex items-start gap-2 flex-1 min-w-0 text-left"
                                                            >
                                                                <GitBranch
                                                                    className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${selectedVersion === v.version ? "text-primary" : "text-muted-foreground"}`}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span
                                                                            className={`font-mono text-xs font-medium ${selectedVersion === v.version ? "text-primary" : "text-card-foreground"}`}
                                                                        >
                                                                            {
                                                                                v.version
                                                                            }
                                                                        </span>
                                                                        {v.version ===
                                                                            currentVersion && (
                                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                                                                current
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground truncate">
                                                                        {
                                                                            v.changelog
                                                                        }
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                        {
                                                                            v
                                                                                .uploaded_by
                                                                                .name
                                                                        }{" "}
                                                                        ·{" "}
                                                                        {new Date(
                                                                            v.date,
                                                                        ).toLocaleDateString(
                                                                            "en-US",
                                                                            {
                                                                                month: "short",
                                                                                day: "numeric",
                                                                            },
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </button>
                                                            {v.version !==
                                                                currentVersion && (
                                                                <button
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        setShowDiff(
                                                                            {
                                                                                from: v.version,
                                                                                to: currentVersion,
                                                                            },
                                                                        );
                                                                        setShowVersionDropdown(
                                                                            false,
                                                                        );
                                                                    }}
                                                                    className="shrink-0 mt-0.5 text-[10px] px-1.5 py-0.5 rounded border border-violet-300 text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/20 transition-colors"
                                                                    title={`Compare ${v.version} → ${currentVersion}`}
                                                                >
                                                                    Diff
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                                        No versions uploaded
                                                        yet. Use the Upload
                                                        button above to add the
                                                        first version.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setGeneratorExpanded(true);
                                        setTimeout(() => {
                                            document
                                                .getElementById(
                                                    "generator-pill",
                                                )
                                                ?.scrollIntoView({
                                                    behavior: "smooth",
                                                });
                                        }, 100);
                                    }}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 border border-primary/30 text-primary hover:bg-primary/10"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Scaffold
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 disabled:pointer-events-none disabled:opacity-50 shadow-md"
                                    disabled={!downloadUrl}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Code
                                </button>
                            </div>
                        </div>

                        {/* Split View: Folder Structure and Code */}
                        <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
                            {/* Folder Structure Sidebar */}
                            <div
                                className="border-r border-border flex flex-col bg-muted/20"
                                style={{ width: `${sidebarWidth}px` }}
                            >
                                <div className="p-4 border-b border-border flex-shrink-0">
                                    <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                                        <Folder className="w-4 h-4" />
                                        Project Files
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3">
                                    {loading ? (
                                        <FolderStructureSkeleton />
                                    ) : error ? (
                                        <div className="flex items-center justify-center h-32">
                                            <div className="text-center space-y-2">
                                                <div className="text-sm text-red-500">
                                                    {error}
                                                </div>
                                            </div>
                                        </div>
                                    ) : folderStructure ? (
                                        renderFolderStructure(folderStructure)
                                    ) : (
                                        <div className="flex items-center justify-center h-32">
                                            <div className="text-sm text-muted-foreground">
                                                No files available
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Resize Handle */}
                            <div
                                onMouseDown={() => setIsResizing(true)}
                                className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors relative group"
                            >
                                <div className="absolute inset-y-0 -left-1 -right-1"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-primary/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>

                            {/* Code Display */}
                            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 min-w-0">
                                {selectedFile ? (
                                    <div className="flex-1 flex flex-col bg-slate-900 text-white overflow-hidden m-3 rounded-lg shadow-lg">
                                        <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                <span className="text-sm text-slate-300 ml-3 font-mono">
                                                    {selectedFile}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400 font-mono">
                                                {fileContent.split("\n").length}{" "}
                                                lines
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-auto">
                                            <pre className="p-4 text-sm font-mono leading-relaxed">
                                                <code className="text-slate-100">
                                                    {fileContent}
                                                </code>
                                            </pre>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-muted-foreground m-3">
                                        <div className="text-center space-y-3">
                                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                                                <Folder className="w-8 h-8 text-primary opacity-50" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-card-foreground">
                                                    No file selected
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Click on a file from the
                                                    sidebar to view its contents
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Generate Starter Project Pill — collapsible ── */}
            <div
                id="generator-pill"
                className="bg-card rounded-xl border border-card-border overflow-hidden"
            >
                <button
                    onClick={() => setGeneratorExpanded(!generatorExpanded)}
                    className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold text-card-foreground">
                            Generate Starter Project
                        </h2>
                    </div>
                    {generatorExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                </button>
                {generatorExpanded && (
                    <div className="px-5 pb-5">
                        <StarterProjectGenerator useCase={useCase} />
                    </div>
                )}
            </div>

            {/* ── Collapsible Pills: Architecture & Technical Stack ── */}
            {/* System Architecture */}
            <div className="bg-card rounded-xl border border-card-border overflow-hidden">
                <button
                    onClick={() => setArchExpanded(!archExpanded)}
                    className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Layers className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold text-card-foreground">
                            System Architecture
                        </h2>
                    </div>
                    {archExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                </button>
                {archExpanded && (
                    <div className="px-5 pb-5">
                        <div className="aspect-video max-h-72 rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border">
                            <div className="text-center space-y-4 p-8">
                                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                                    <Layers className="w-8 h-8 text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <p className="font-medium text-card-foreground">
                                        Architecture Diagram
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        System flow and component structure
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Technical Stack */}
            <div className="bg-card rounded-xl border border-card-border overflow-hidden">
                <button
                    onClick={() => setTechExpanded(!techExpanded)}
                    className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Zap className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold text-card-foreground">
                            Technical Stack
                        </h2>
                    </div>
                    {techExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                </button>
                {techExpanded && (
                    <div className="px-5 pb-5">
                        <div className="grid sm:grid-cols-2 gap-3">
                            {technicalFeatures.map((feature, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors"
                                >
                                    <div className="mt-0.5">
                                        <Check className="feature-icon" />
                                    </div>
                                    <span className="text-card-foreground text-sm">
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Diff Viewer Modal */}
            {showDiff && (
                <VersionDiffViewer
                    useCaseId={useCase.id}
                    fromVersion={showDiff.from}
                    toVersion={showDiff.to}
                    onClose={() => setShowDiff(null)}
                />
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={() => setShowUploadModal(false)}
                >
                    <div
                        className="bg-card rounded-xl border border-card-border shadow-2xl w-full max-w-md mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                                    <Upload className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-card-foreground">
                                        Upload New Version
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        This will create{" "}
                                        <span className="font-mono font-medium text-primary">
                                            {nextVersion}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="text-muted-foreground hover:text-card-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Uploader info (from MSAL) */}
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                                    {userName
                                        .split(" ")
                                        .map((n: string) => n[0])
                                        .join("")}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-card-foreground">
                                        {userName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {userEmail || "local@dev"}
                                    </p>
                                </div>
                            </div>

                            {/* Changelog */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                                    Changelog *
                                </label>
                                <textarea
                                    value={uploadChangelog}
                                    onChange={(e) =>
                                        setUploadChangelog(e.target.value)
                                    }
                                    rows={3}
                                    placeholder="Describe what changed in this version..."
                                    className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                                />
                            </div>

                            {/* File upload */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                                    Code Archive (.zip) *
                                </label>
                                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                                    <input
                                        type="file"
                                        accept=".zip"
                                        className="hidden"
                                        onChange={(e) =>
                                            setUploadFile(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    {uploadFile ? (
                                        <div className="flex items-center gap-2 text-sm text-card-foreground">
                                            <FileCode2 className="w-4 h-4 text-primary" />
                                            <span className="font-medium">
                                                {uploadFile.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                (
                                                {(
                                                    uploadFile.size / 1024
                                                ).toFixed(0)}{" "}
                                                KB)
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="text-center text-sm text-muted-foreground">
                                            <Upload className="w-5 h-5 mx-auto mb-1" />
                                            Click to select .zip file
                                        </div>
                                    )}
                                </label>
                            </div>

                            {/* Storage target info */}
                            <div className="text-xs text-muted-foreground">
                                Uploaded to: Azure Blob Storage · Auto-versioned
                                as{" "}
                                <span className="font-mono text-primary">
                                    {nextVersion}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-card-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUploadSubmit}
                                disabled={
                                    !uploadFile ||
                                    !uploadChangelog.trim() ||
                                    uploading
                                }
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {uploading ? (
                                    <>Uploading...</>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" /> Upload{" "}
                                        {nextVersion}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodebaseTab;
