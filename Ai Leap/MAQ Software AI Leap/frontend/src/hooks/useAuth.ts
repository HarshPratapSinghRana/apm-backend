import { useCallback } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";

/**
 * Thin wrapper around `useMsal()` that exposes the pieces the rest of the app
 * actually needs (`accounts`, `instance`, `isAuthenticated`) plus a single
 * `signOut()` helper. Sign-out uses `logoutRedirect` because popup logout is
 * unreliable under modern third-party-cookie restrictions.
 */
export function useAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const signOut = useCallback(async () => {
    try {
      instance.setActiveAccount(null);
    } catch {
      // best-effort; logoutRedirect below is the real cleanup
    }
    await instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  }, [instance]);

  return { instance, accounts, inProgress, isAuthenticated, signOut };
}
