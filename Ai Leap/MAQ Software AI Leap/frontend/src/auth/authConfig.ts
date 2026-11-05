import {
  PublicClientApplication,
  type AccountInfo,
  type Configuration,
} from '@azure/msal-browser';

// ── Configuration values ──────────────────────────────────────────────────────
// All values are sourced from Vite environment variables, which are inlined at
// BUILD TIME (not runtime). The deployment pipeline must export these before
// running `vite build`, otherwise the resulting bundle will refuse to boot.
//
// Required:
//   VITE_MSAL_CLIENT_ID         — Entra ID Application (client) ID
//   VITE_MSAL_TENANT_ID         — Directory (tenant) ID
//   VITE_ALLOWED_EMAIL_DOMAIN   — Email domain users must belong to
// Optional:
//   VITE_MSAL_REDIRECT_URI      — Defaults to `window.location.origin`
//
// We intentionally do NOT throw from module top-level. Throwing at import time
// would prevent `main.tsx` from rendering any UI at all, so the end user would
// just see a blank white screen with a raw stack trace in DevTools — unacceptable
// for an enterprise app. Instead we collect every missing variable and surface
// the list through `configErrors`, letting `main.tsx` render a clean branded
// "Configuration error" page and letting ops engineers see all gaps at once.

const REQUIRED_VARS = [
  'VITE_MSAL_CLIENT_ID',
  'VITE_MSAL_TENANT_ID',
  'VITE_ALLOWED_EMAIL_DOMAIN',
] as const;

const readEnv = (name: string): string => {
  const raw = (import.meta.env[name] as string | undefined) ?? '';
  return raw.trim();
};

/**
 * Names of required environment variables that are missing or empty.
 * `main.tsx` checks this before bootstrapping MSAL.
 */
export const configErrors: string[] = REQUIRED_VARS.filter((name) => !readEnv(name));

const clientId = readEnv('VITE_MSAL_CLIENT_ID');
const tenantId = readEnv('VITE_MSAL_TENANT_ID');
const redirectUri = readEnv('VITE_MSAL_REDIRECT_URI') || window.location.origin;

/**
 * Only accounts whose UPN ends with this domain are allowed into the app.
 * Case-insensitive exact suffix match against `@` + domain.
 * Empty string when the variable is unset — `configErrors` will already
 * flag that case so the app never gets far enough to use this value.
 */
export const ALLOWED_EMAIL_DOMAIN = readEnv('VITE_ALLOWED_EMAIL_DOMAIN').toLowerCase();

// ── MSAL configuration ────────────────────────────────────────────────────────
// `cacheLocation: 'localStorage'` makes the session survive across tabs and
// browser restarts until the refresh token expires — better enterprise UX.
// `storeAuthStateInCookie` was a legacy IE11 workaround that modern browsers
// no longer need.
const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    // IMPORTANT: Must be false. When true, MSAL navigates the page after
    // extracting the auth code but BEFORE the token exchange POST completes,
    // which corrupts the PKCE state and causes 400 errors on /oauth2/v2.0/token.
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage',
    // Store auth state in cookies as a fallback — prevents PKCE code_verifier
    // loss when the browser's tracking prevention partitions localStorage
    // across the redirect boundary.
    storeAuthStateInCookie: true,
  },
};

/** Default scopes requested at sign-in. */
export const loginRequest = {
  scopes: ['User.Read'],
};

/**
 * SharePoint host that backs the "Submit Solution" upload.
 * Sourced from `VITE_SHAREPOINT_HOSTNAME` and defaults to the POC tenant host.
 */
export const SHAREPOINT_HOSTNAME =
  readEnv('VITE_SHAREPOINT_HOSTNAME') || 'testmaq.sharepoint.com';

/**
 * Dedicated Entra ID Application (client) ID used ONLY for the "Submit Solution"
 * upload flow. This is the single app registration that has been granted
 * SharePoint access, so all upload-time token acquisition must run against it.
 * The website sign-in identity (`clientId` above) must never be used here.
 */
export const SHAREPOINT_CLIENT_ID = 'a5f3ba81-4c95-4c74-afd9-38b72cf39156';

// Separate MSAL configuration for the SharePoint upload app. It shares the
// tenant, redirect URI and cache strategy with the sign-in app but swaps in the
// SharePoint-only client id so that upload tokens are issued for that app alone.
const sharepointMsalConfig: Configuration = {
  auth: {
    clientId: SHAREPOINT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true,
  },
};

let sharepointMsalInstance: PublicClientApplication | null = null;

/**
 * Lazily creates and initializes the SharePoint-only MSAL instance used by the
 * solution upload flow. Kept separate from the sign-in instance so the
 * SharePoint client id is never used for website authentication and vice versa.
 */
export const getSharepointMsalInstance = async (): Promise<PublicClientApplication> => {
  if (!sharepointMsalInstance) {
    const created = new PublicClientApplication(sharepointMsalConfig);
    await created.initialize();
    sharepointMsalInstance = created;
  }
  return sharepointMsalInstance;
};

/**
 * Scopes used to upload a solution to SharePoint.
 * - Microsoft Graph (`Sites.ReadWrite.All`): create the list item.
 * - SharePoint REST (`<host>/.default`): attach the ZIP file to the item.
 * The SharePoint REST token uses `/.default` so it is issued for whatever
 * SharePoint permissions are already consented on the upload app
 * (`SHAREPOINT_CLIENT_ID`) — matching the working POC and avoiding a runtime
 * consent prompt for a scope the app does not statically expose.
 * Each token must be requested for a single resource, so they are split.
 */
export const graphUploadRequest = {
  scopes: ['https://graph.microsoft.com/Sites.ReadWrite.All'],
};

export const sharepointUploadRequest = {
  scopes: [`https://${SHAREPOINT_HOSTNAME}/.default`],
};

/**
 * Factory used by `main.tsx` after it has verified `configErrors` is empty.
 * Keeping this as a function (rather than a top-level `new PublicClientApplication`)
 * avoids constructing an MSAL instance with empty config when env vars are missing.
 */
export const createMsalInstance = (): PublicClientApplication =>
  new PublicClientApplication(msalConfig);

/**
 * Returns true when the supplied account is allowed to use the app.
 * Allowed iff the UPN (username) ends with `@{ALLOWED_EMAIL_DOMAIN}`.
 */
export const isAllowedAccount = (account: AccountInfo | null | undefined): boolean => {
  if (!ALLOWED_EMAIL_DOMAIN) return false;
  const upn = account?.username?.toLowerCase().trim();
  if (!upn) return false;
  return upn.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
};
