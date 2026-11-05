import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import {
    getSharepointMsalInstance,
    graphUploadRequest,
} from "@/auth/authConfig";
import { getFeedbackSummary, type FeedbackSummary } from "@/api/api";

/**
 * Acquire a Microsoft Graph token silently for the signed-in user.
 * Returns null if it can't be obtained without interaction (so callers can
 * fall back gracefully instead of triggering a popup).
 */
async function acquireGraphTokenSilent(
    username: string,
): Promise<string | null> {
    try {
        const spInstance = await getSharepointMsalInstance();
        let spAccount =
            spInstance
                .getAllAccounts()
                .find(
                    (a) =>
                        a.username?.toLowerCase() === username.toLowerCase(),
                ) ?? null;

        if (!spAccount) {
            try {
                const sso = await spInstance.ssoSilent({ loginHint: username });
                spAccount = sso.account;
            } catch {
                return null; // needs interaction — skip silently
            }
        }

        spInstance.setActiveAccount(spAccount);
        const res = await spInstance.acquireTokenSilent({
            ...graphUploadRequest,
            account: spAccount!,
        });
        return res.accessToken;
    } catch (err) {
        if (err instanceof InteractionRequiredAuthError) return null;
        return null;
    }
}

/**
 * Fetches the aggregated Like/Dislike counts per agent from the backend.
 * Only fetches when `enabled` is true (e.g. when the "Most Liked" sort is on),
 * and only ever acquires the Graph token silently so it never interrupts the
 * user with a consent popup. Falls back to an empty summary on any failure.
 */
export function useFeedbackSummary(enabled: boolean) {
    const { accounts } = useMsal();
    const username = accounts?.[0]?.username || "";
    const [summary, setSummary] = useState<FeedbackSummary>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled || !username) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const token = await acquireGraphTokenSilent(username);
                if (!token) return;
                const data = await getFeedbackSummary(token);
                if (!cancelled) setSummary(data);
            } catch {
                // Leave summary empty on failure — sort just falls back.
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [enabled, username]);

    return { summary, loading };
}
