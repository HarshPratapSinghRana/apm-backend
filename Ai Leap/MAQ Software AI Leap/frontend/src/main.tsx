import { createRoot } from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import { EventType, type AuthenticationResult, type EventMessage } from '@azure/msal-browser';
import App from './App.tsx';
import './index.css';
import { configErrors, createMsalInstance, isAllowedAccount } from './auth/authConfig.ts';

// ── Configuration-error fallback ──────────────────────────────────────────────
// Rendered when one or more required environment variables are missing from
// the build. We intentionally show a generic, branded message to end users —
// no internal variable names — while logging the precise list to the console
// for the on-call engineer.
function renderConfigError(missing: string[]): void {
  console.error(
    '[auth] Application is misconfigured. The following build-time environment ' +
    'variables are missing or empty: ' +
    missing.join(', ') +
    '. They must be set in the deployment pipeline before `vite build` runs.',
  );

  const root = document.getElementById('root');
  if (!root) return;

  // Plain DOM (no React) so we render even if React/MSAL imports fail later.
  root.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:1rem;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
            <div style="max-width:28rem;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:0.75rem;box-shadow:0 1px 2px rgba(0,0,0,0.04);padding:2rem;text-align:center;">
                <div style="width:3rem;height:3rem;margin:0 auto 1rem;border-radius:9999px;background:#fee2e2;display:flex;align-items:center;justify-content:center;color:#b91c1c;font-size:1.5rem;font-weight:700;">!</div>
                <h1 style="font-size:1.25rem;font-weight:600;color:#0f172a;margin:0 0 0.5rem;">Application unavailable</h1>
                <p style="font-size:0.875rem;color:#475569;margin:0 0 1.5rem;line-height:1.5;">
                    This application is not configured correctly. Please contact your administrator.
                </p>
                <p style="font-size:0.75rem;color:#94a3b8;margin:0;">Reference: missing build configuration</p>
            </div>
        </div>
    `;
}

async function bootstrap(): Promise<void> {
  if (configErrors.length > 0) {
    renderConfigError(configErrors);
    return;
  }

  const msalInstance = createMsalInstance();

  // MSAL Browser v4 requires `initialize()` and `handleRedirectPromise()` to
  // complete before the app renders, otherwise the post-login redirect can
  // land on a tree that has not yet observed the new account.
  await msalInstance.initialize();
  try {
    await msalInstance.handleRedirectPromise();
    // Redirect handled successfully — clear any stale error flag
    sessionStorage.removeItem('msal-redirect-error');
  } catch (e: any) {
    // Store the error so AuthGate can detect it and show an error screen
    // instead of triggering another loginRedirect (which would loop).
    const errorMsg =
      e?.errorMessage || e?.message || 'Token exchange failed (handleRedirectPromise)';
    console.error('MSAL handleRedirectPromise failed:', errorMsg, e);
    sessionStorage.setItem('msal-redirect-error', errorMsg);
  }

  // Promote the cached account (if any) to active so the rest of the app
  // can read it via `instance.getActiveAccount()`.
  //
  // SECURITY: a cached account may belong to a now-disallowed domain (e.g.
  // the allow-list was tightened, or the user was signed in to a guest tenant
  // before the policy was added). Verify the domain before promoting, and
  // purge the MSAL cache if it fails so stale tokens don't linger in
  // localStorage.
  const cached = msalInstance.getAllAccounts();
  if (cached.length > 0 && !msalInstance.getActiveAccount()) {
    const allowed = cached.find((a) => isAllowedAccount(a));
    if (allowed) {
      msalInstance.setActiveAccount(allowed);
    } else {
      try {
        await msalInstance.clearCache();
      } catch (e) {
        console.error('MSAL clearCache failed', e);
      }
    }
  }

  // Defence-in-depth: enforce the domain allow-list the moment a login
  // succeeds OR a silent token is acquired, so a disallowed account never
  // reaches the rendered app even if cache state changes mid-session.
  msalInstance.addEventCallback((event: EventMessage) => {
    const isLoginOrTokenSuccess =
      event.eventType === EventType.LOGIN_SUCCESS ||
      event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS;
    if (!isLoginOrTokenSuccess || !event.payload) return;
    const account = (event.payload as AuthenticationResult).account;
    if (!account) return;
    if (!isAllowedAccount(account)) {
      msalInstance.setActiveAccount(null);
      void msalInstance.clearCache().finally(() => {
        void msalInstance.logoutRedirect({
          postLogoutRedirectUri: window.location.origin,
        });
      });
      return;
    }
    if (event.eventType === EventType.LOGIN_SUCCESS) {
      msalInstance.setActiveAccount(account);
    }
  });

  createRoot(document.getElementById('root')!).render(
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>,
  );
}

void bootstrap();

