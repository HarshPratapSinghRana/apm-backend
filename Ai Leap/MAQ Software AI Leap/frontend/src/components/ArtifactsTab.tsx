import { FC, useEffect, useRef, useState } from "react";
import {
    Presentation,
    Loader2,
    AlertCircle,
    Maximize2,
    ExternalLink,
} from "lucide-react";
import {
    InteractionRequiredAuthError,
    type AccountInfo,
} from "@azure/msal-browser";
import { getArtifactPreview } from "@/api/api";
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

interface ArtifactsTabProps {
    useCase: { id: string; title: string };
}

/**
 * Artifacts tab — renders a solution's slide deck (PPTX/PDF) from SharePoint via
 * a short-lived Microsoft Graph preview URL. Shown in place of the Code tab for
 * solutions that ship a deck instead of a repo (e.g. CertyFAST).
 */
const ArtifactsTab: FC<ArtifactsTabProps> = ({ useCase }) => {
    const { accounts } = useAuth();
    const [previewUrl, setPreviewUrl] = useState("");
    const [fileName, setFileName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const frameRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(null);
            setPreviewUrl("");
            try {
                const account = accounts?.[0];
                if (!account)
                    throw new Error(
                        "You must be signed in to view this artifact.",
                    );

                const graphToken = await acquireGraphToken(account);
                const data = await getArtifactPreview(useCase.id, graphToken);
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
    }, [accounts, useCase.id]);

    const openFullscreen = () => {
        frameRef.current?.requestFullscreen?.();
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="bg-card rounded-xl border border-card-border flex h-96 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-card rounded-xl border border-card-border p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                Could not load the presentation
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {error}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                                Make sure you are signed in and have access to
                                the SharePoint library where the deck is stored.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!previewUrl) {
        return (
            <div className="p-6">
                <div className="bg-card rounded-xl border border-card-border flex flex-col items-center justify-center gap-2 py-20 text-center text-sm text-muted-foreground">
                    <Presentation className="h-8 w-8 opacity-50" />
                    <span>No artifact available yet.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="bg-card rounded-xl border border-card-border overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <Presentation className="h-4 w-4 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold text-card-foreground truncate">
                            {fileName || `${useCase.title} — Presentation`}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={openFullscreen}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Fullscreen"
                        >
                            <Maximize2 className="h-3.5 w-3.5" />
                            Fullscreen
                        </button>
                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Open in new tab"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open
                        </a>
                    </div>
                </div>
                <div className="aspect-video w-full bg-muted">
                    <iframe
                        ref={frameRef}
                        src={previewUrl}
                        title={fileName || `${useCase.title} presentation`}
                        className="h-full w-full border-0"
                        allowFullScreen
                    />
                </div>
            </div>
        </div>
    );
};

export default ArtifactsTab;
