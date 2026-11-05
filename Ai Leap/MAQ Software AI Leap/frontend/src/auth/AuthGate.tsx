import type { ReactNode } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { ALLOWED_EMAIL_DOMAIN, isAllowedAccount, loginRequest } from './authConfig';

interface AuthGateProps {
    children: ReactNode;
}

/**
 * Minimal full-page panel used for the loading, sign-in-failed and access-denied states.
 * Intentionally framework-agnostic so it renders before the rest of the app mounts.
 */
const FullPagePanel = ({ children }: { children: ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-sm p-8 text-center space-y-4">
            {children}
        </div>
    </div>
);

/**
 * Gates every route behind:
 *   1. A successful Microsoft sign-in (via `loginRedirect`).
 *   2. A domain allow-list check — only `@{ALLOWED_EMAIL_DOMAIN}` UPNs are admitted.
 * Anything else gets an explicit "Access denied" panel with a sign-out action.
 *
 * Uses sessionStorage to track redirect attempts and prevent infinite loops when
 * the token exchange fails (e.g. 400 from /oauth2/v2.0/token).
 */
export const AuthGate = ({ children }: AuthGateProps) => {
    const { instance, accounts, inProgress } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const [loginError, setLoginError] = useState<string | null>(null);
    const loginAttempted = useRef(false);

    // On mount, check if the previous redirect attempt failed.
    // main.tsx stores the error in sessionStorage when handleRedirectPromise fails.
    useEffect(() => {
        const storedError = sessionStorage.getItem('msal-redirect-error');
        if (storedError) {
            setLoginError(storedError);
            sessionStorage.removeItem('msal-redirect-error');
        }
    }, []);

    // Trigger Microsoft redirect login safely ONLY when:
    //  - Not authenticated
    //  - No other MSAL interaction is currently in progress
    //  - No previous error detected (prevents infinite loop)
    //  - Haven't already attempted in this render cycle
    useEffect(() => {
        if (!isAuthenticated && inProgress === 'none' && !loginError && !loginAttempted.current) {
            loginAttempted.current = true;
            instance.loginRedirect(loginRequest).catch((err) => {
                console.error('[auth] Redirect login failed:', err);
                setLoginError(err?.errorMessage || err?.message || 'Sign-in failed. Please try again.');
            });
        }
        // Clear the flag when the user becomes authenticated
        if (isAuthenticated) {
            loginAttempted.current = false;
            setLoginError(null);
            sessionStorage.removeItem('msal-redirect-error');
        }
    }, [isAuthenticated, inProgress, instance, loginError]);

    // 0. Sign-in error — show error panel with retry button instead of looping
    if (loginError) {
        const handleRetry = () => {
            setLoginError(null);
            loginAttempted.current = false;
            sessionStorage.removeItem('msal-redirect-error');
            // Clear any stale MSAL state
            try {
                instance.clearCache();
            } catch { /* best effort */ }
            instance.loginRedirect(loginRequest).catch((err) => {
                console.error('[auth] Retry redirect login failed:', err);
                setLoginError(err?.errorMessage || err?.message || 'Sign-in failed. Please try again.');
            });
        };
        return (
            <FullPagePanel>
                <div style={{width:'3rem',height:'3rem',margin:'0 auto 0.5rem',borderRadius:'9999px',background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',color:'#b91c1c',fontSize:'1.5rem',fontWeight:700}}>!</div>
                <h2 className="text-xl font-semibold text-card-foreground">Sign-in failed</h2>
                <p className="text-sm text-muted-foreground">
                    Could not complete sign-in. This is usually caused by a browser session conflict.
                    Please clear your browser cache for this site, or try in an Incognito window.
                </p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                    {loginError}
                </p>
                <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium h-9 px-4"
                >
                    Try again
                </button>
            </FullPagePanel>
        );
    }

    // 1. If any MSAL interaction is active (handling redirect, logging in, etc.), show loading spinner
    if (inProgress !== 'none') {
        return (
            <FullPagePanel>
                <div className="mx-auto w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Signing you in…</p>
            </FullPagePanel>
        );
    }

    // 2. If the user is not authenticated, show redirect loader
    if (!isAuthenticated || accounts.length === 0) {
        return (
            <FullPagePanel>
                <div className="mx-auto w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Redirecting to Microsoft login…</p>
            </FullPagePanel>
        );
    }

    const active = instance.getActiveAccount() ?? accounts[0];

    // 3. Domain allowlist check
    if (!isAllowedAccount(active)) {
        const handleSignOut = async () => {
            try {
                instance.setActiveAccount(null);
            } catch {
                // setActiveAccount is best-effort; logoutRedirect below is the real cleanup.
            }
            await instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
        };
        return (
            <FullPagePanel>
                <h2 className="text-xl font-semibold text-card-foreground">Access denied</h2>
                <p className="text-sm text-muted-foreground">
                    This platform is restricted to{' '}
                    <span className="font-medium text-card-foreground">@{ALLOWED_EMAIL_DOMAIN}</span>{' '}
                    accounts. You are signed in as{' '}
                    <span className="font-medium text-card-foreground break-all">
                        {active?.username || 'an unrecognised account'}
                    </span>
                    .
                </p>
                <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium h-9 px-4"
                >
                    Sign out and try again
                </button>
            </FullPagePanel>
        );
    }

    return <>{children}</>;
};

export default AuthGate;
