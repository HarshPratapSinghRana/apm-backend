const fs = require('fs');
const path = require('path');

console.log('Adding section explanatory comments to codebase without changing executable code...');

// =========================================================================
// 1. Update engineering-commons-vscode/src/extension.ts
// =========================================================================
const extFile = path.join(__dirname, '..', 'engineering-commons-vscode', 'src', 'extension.ts');
if (fs.existsSync(extFile)) {
    let content = fs.readFileSync(extFile, 'utf8');

    // 1.1 File Header
    if (!content.includes('CIP #1067 – Engineering Commons VS Code Extension')) {
        const target = "import { AdvisorHookProvisioner, ADVISOR_SKILL_NAME } from './services/advisorHookProvisioner';\r\n\r\nexport function activate(context: vscode.ExtensionContext) {";
        const altTarget = "import { AdvisorHookProvisioner, ADVISOR_SKILL_NAME } from './services/advisorHookProvisioner';\n\nexport function activate(context: vscode.ExtensionContext) {";
        const replacement = `import { AdvisorHookProvisioner, ADVISOR_SKILL_NAME } from './services/advisorHookProvisioner';

/**
 * =========================================================================================
 * CIP #1067 – Engineering Commons VS Code Extension Main Entry Point
 * =========================================================================================
 * 
 * High-Level Responsibilities:
 * 1. CLI Lifecycle Management: Verifies and auto-provisions the global 'engineering-commons' CLI.
 * 2. Copilot AI Advisor Integration: Auto-provisions workspace skills, prompts, and Copilot hooks.
 * 3. Service Layer Architecture: Instantiates telemetry collectors, SharePoint client, review engine, and notifications.
 * 4. UI View Providers: Coordinates Explorer sidebar, tree view, multi-file diff view, and analytics dashboard.
 * 5. Commands Layer: Exposes 30+ VS Code commands for authentication, artifacts, code reviews, and RBAC governance.
 */

export function activate(context: vscode.ExtensionContext) {`;
        
        if (content.includes(target)) {
            content = content.replace(target, replacement.replace(/\n/g, '\r\n'));
        } else if (content.includes(altTarget)) {
            content = content.replace(altTarget, replacement);
        }
    }

    // 1.2 Section 0: CLI & Copilot Provisioning
    const sec0Old = "// 0. Silently auto-provision / verify global CIP CLI in background";
    const sec0New = `// =========================================================================\r\n    // SECTION 0: Background CLI & GitHub Copilot Advisor Auto-Provisioning\r\n    // =========================================================================\r\n    // 0a. Verify or unpack bundled CLI executable into user path without blocking activation`;
    if (content.includes(sec0Old) && !content.includes('SECTION 0: Background CLI')) {
        content = content.replace(sec0Old, sec0New);
    }

    // 1.3 Section 1: Service Layer
    const sec1Old = "    // 1. Initialize Service Layer";
    const sec1New = `    // =========================================================================\r\n    // SECTION 1: Service Layer & Dependency Injection Instantiation\r\n    // =========================================================================\r\n    // Instantiates CLI executor, authentication provider, SharePoint sync, usage trackers, and review engines`;
    if (content.includes(sec1Old) && !content.includes('SECTION 1: Service Layer')) {
        content = content.replace(sec1Old, sec1New);
    }

    // 1.4 Section 2: Views Initialization
    const sec2Old = "    // 2. Initialize Views";
    const sec2New = `    // =========================================================================\r\n    // SECTION 2: Views & Webview Providers Initialization\r\n    // =========================================================================\r\n    // Binds Sidebar webview, Activity Bar tree data provider, details panel, and PR diff viewer`;
    if (content.includes(sec2Old) && !content.includes('SECTION 2: Views')) {
        content = content.replace(sec2Old, sec2New);
    }

    // 1.5 Section 3: FileSystem Watchers
    const sec3Old = "    if (vscode.workspace && vscode.workspace.createFileSystemWatcher) {";
    const sec3New = `    // =========================================================================\r\n    // SECTION 3: Workspace File Watchers & Reactive Debounced Auto-Refresh\r\n    // =========================================================================\r\n    // Watches .cip, .github, skills, agents, prompts, and cip.yml for changes with debouncing to update UI automatically\r\n    if (vscode.workspace && vscode.workspace.createFileSystemWatcher) {`;
    if (content.includes(sec3Old) && !content.includes('SECTION 3: Workspace File Watchers')) {
        content = content.replace(sec3Old, sec3New);
    }

    // 1.6 Section 4: Config Change Listener
    const sec4Old = "    // Configuration change listener: dynamically update all live services";
    const sec4New = `    // =========================================================================\r\n    // SECTION 4: Live Configuration Change Listener\r\n    // =========================================================================\r\n    // Dynamically propagates backendUrl changes to all active services without requiring VS Code reload`;
    if (content.includes(sec4Old) && !content.includes('SECTION 4: Live Configuration')) {
        content = content.replace(sec4Old, sec4New);
    }

    // 1.7 Section 5: Commands Registration
    const sec5Old = "    // 3. Register Commands";
    const sec5New = `    // =========================================================================\r\n    // SECTION 5: VS Code Commands Registration\r\n    // =========================================================================\r\n    // Registers all command palette actions, button click handlers, and context menu triggers`;
    if (content.includes(sec5Old) && !content.includes('SECTION 5: VS Code Commands')) {
        content = content.replace(sec5Old, sec5New);
    }

    // 1.8 Section 5 Sub-headers
    const loginMarker = "    const loginDisposable = vscode.commands.registerCommand('engineeringCommons.login'";
    const loginHeader = `    // --- 5.1 Authentication Commands (SSO, Credentials, Logout) ---\r\n    const loginDisposable = vscode.commands.registerCommand('engineeringCommons.login'`;
    if (content.includes(loginMarker) && !content.includes('5.1 Authentication Commands')) {
        content = content.replace(loginMarker, loginHeader);
    }

    const artifactMarker = "    const listDisposable = vscode.commands.registerCommand('engineeringCommons.list'";
    const artifactHeader = `    // --- 5.2 Artifact Lifecycle Commands (List, Install, Update, Contribute) ---\r\n    const listDisposable = vscode.commands.registerCommand('engineeringCommons.list'`;
    if (content.includes(artifactMarker) && !content.includes('5.2 Artifact Lifecycle Commands')) {
        content = content.replace(artifactMarker, artifactHeader);
    }

    const reviewMarker = "    const reviewDisposable = vscode.commands.registerCommand('engineeringCommons.review'";
    const reviewHeader = `    // --- 5.3 Code Review & Discussion Thread Commands ---\r\n    const reviewDisposable = vscode.commands.registerCommand('engineeringCommons.review'`;
    if (content.includes(reviewMarker) && !content.includes('5.3 Code Review')) {
        content = content.replace(reviewMarker, reviewHeader);
    }

    const notifMarker = "    const openNotificationDisposable = vscode.commands.registerCommand('engineeringCommons.openNotification'";
    const notifHeader = `    // --- 5.4 Notification Center & Alert Handling Commands ---\r\n    const openNotificationDisposable = vscode.commands.registerCommand('engineeringCommons.openNotification'`;
    if (content.includes(notifMarker) && !content.includes('5.4 Notification Center')) {
        content = content.replace(notifMarker, notifHeader);
    }

    const certMarker = "    const checkCertificationDisposable = vscode.commands.registerCommand('engineeringCommons.checkCertification'";
    const certHeader = `    // --- 5.5 Artifact Certification & Quality Governance Commands ---\r\n    const checkCertificationDisposable = vscode.commands.registerCommand('engineeringCommons.checkCertification'`;
    if (content.includes(certMarker) && !content.includes('5.5 Artifact Certification')) {
        content = content.replace(certMarker, certHeader);
    }

    const rbacMarker = "    const requestAccessDisposable = vscode.commands.registerCommand('engineeringCommons.requestAccess'";
    const rbacHeader = `    // --- 5.6 Role-Based Access Control (RBAC) & Governance Commands ---\r\n    const requestAccessDisposable = vscode.commands.registerCommand('engineeringCommons.requestAccess'`;
    if (content.includes(rbacMarker) && !content.includes('5.6 Role-Based Access Control')) {
        content = content.replace(rbacMarker, rbacHeader);
    }

    const copilotMarker = "    // Command to find and match artifacts from Copilot or user palette\r\n    const findArtifactDisposable = vscode.commands.registerCommand('engineeringCommons.findArtifact'";
    const copilotHeader = `    // --- 5.7 Copilot AI Artifact Advisor Discovery & Matching Command ---\r\n    // Command to find and match artifacts from Copilot or user palette\r\n    const findArtifactDisposable = vscode.commands.registerCommand('engineeringCommons.findArtifact'`;
    if (content.includes(copilotMarker) && !content.includes('5.7 Copilot AI Artifact Advisor')) {
        content = content.replace(copilotMarker, copilotHeader);
    }

    // 1.9 Section 6: Cleanup & Teardown
    const sec6Old = "    context.subscriptions.push(\r\n        findArtifactDisposable,";
    const sec6New = `    // =========================================================================\r\n    // SECTION 6: Subscriptions Cleanup & Extension Teardown\r\n    // =========================================================================\r\n    // Registers disposables so all watchers, services, and event listeners clean up safely on deactivation\r\n    context.subscriptions.push(\r\n        findArtifactDisposable,`;
    if (content.includes(sec6Old) && !content.includes('SECTION 6: Subscriptions Cleanup')) {
        content = content.replace(sec6Old, sec6New);
    }

    fs.writeFileSync(extFile, content, 'utf8');
    console.log('✓ Updated engineering-commons-vscode/src/extension.ts with section comments.');
}

// =========================================================================
// 2. Update EngineeringCommonsCli/Program.cs
// =========================================================================
const cliFile = path.join(__dirname, '..', 'EngineeringCommonsCli', 'Program.cs');
if (fs.existsSync(cliFile)) {
    let content = fs.readFileSync(cliFile, 'utf8');

    if (!content.includes('CIP #1067 – Engineering Commons CLI Console Entry Point')) {
        const header = `// =========================================================================================
// CIP #1067 – Engineering Commons CLI Console Entry Point (C# / .NET 10)
// =========================================================================================
//
// Key Responsibilities:
// 1. Dependency Injection: Registers authentication stores, SharePoint Graph clients, backend clients,
//    and artifact lifecycle managers (classifiers, metadata, placement, diff renderers).
// 2. Command Dispatch: Parses command-line verbs (login, sso, list, install, contribute, review, etc.)
//    and routes execution to dedicated command handler classes.
// 3. User Session Management: Persists authentication tokens and custom backend URLs into ~/.engineering-commons.
// =========================================================================================

`;
        content = header.replace(/\n/g, '\r\n') + content;
    }

    const sec1Old = "        // Services registrations";
    const sec1New = "        // =========================================================================\r\n        // SECTION 1: Service Layer & Dependency Injection Setup\r\n        // =========================================================================";
    if (content.includes(sec1Old) && !content.includes('SECTION 1: Service Layer')) {
        content = content.replace(sec1Old, sec1New);
    }

    const sec2Old = "        // Command handlers";
    const sec2New = "        // =========================================================================\r\n        // SECTION 2: Command Handler Registrations\r\n        // =========================================================================";
    if (content.includes(sec2Old) && !content.includes('SECTION 2: Command Handler')) {
        content = content.replace(sec2Old, sec2New);
    }

    const sec3Old = "var cmd = args[0].ToLowerInvariant();";
    const sec3New = "// =========================================================================\r\n// SECTION 3: Command Routing & Execution Switch Dispatcher\r\n// =========================================================================\r\nvar cmd = args[0].ToLowerInvariant();";
    if (content.includes(sec3Old) && !content.includes('SECTION 3: Command Routing')) {
        content = content.replace(sec3Old, sec3New);
    }

    const sec4Old = "int HandleSetUrl(string[] args)";
    const sec4New = "// =========================================================================\r\n// SECTION 4: Auxiliary Command Helpers (Backend URL, Logout, Help Guide)\r\n// =========================================================================\r\nint HandleSetUrl(string[] args)";
    if (content.includes(sec4Old) && !content.includes('SECTION 4: Auxiliary Command Helpers')) {
        content = content.replace(sec4Old, sec4New);
    }

    fs.writeFileSync(cliFile, content, 'utf8');
    console.log('✓ Updated EngineeringCommonsCli/Program.cs with section comments.');
}

// =========================================================================
// 3. Update cip-backend-dotnet/Program.cs
// =========================================================================
const backendFile = path.join(__dirname, '..', 'cip-backend-dotnet', 'Program.cs');
if (fs.existsSync(backendFile)) {
    let content = fs.readFileSync(backendFile, 'utf8');

    if (!content.includes('CIP #1067 – Engineering Commons ASP.NET Core REST API Entry Point')) {
        const header = `// =========================================================================================
// CIP #1067 – Engineering Commons ASP.NET Core REST API Entry Point (.NET 10)
// =========================================================================================
//
// Key Responsibilities:
// 1. Environment & Secrets: Ingests configuration from .env and maps Azure DevOps / GitHub secrets.
// 2. Data Persistence: Dual-mode support (SQLite database via EF Core or decoupled In-Memory mode).
// 3. Domain Events: Dispatches asynchronous events for reviews, line comments, and approvals.
// 4. Governance & Marketplace: Connects to Azure DevOps Git repositories and SharePoint Lists.
// 5. Enterprise Security: Enforces strict HTTP security headers, CORS, and Token Authentication.
// =========================================================================================

`;
        content = header.replace(/\n/g, '\r\n') + content;
    }

    const envMarker = "// Load .env (if present) into environment variables so Configuration can pick them up.";
    const envHeader = `// =========================================================================\r\n// SECTION 1: Local Environment & Azure DevOps Secret Mapping\r\n// =========================================================================\r\n// Load .env (if present) into environment variables so Configuration can pick them up.`;
    if (content.includes(envMarker) && !content.includes('SECTION 1: Local Environment')) {
        content = content.replace(envMarker, envHeader);
    }

    const appBuilderMarker = "var builder = WebApplication.CreateBuilder(args);";
    const appBuilderHeader = `// =========================================================================\r\n// SECTION 2: WebApplication Builder, JSON Converters & CORS Configuration\r\n// =========================================================================\r\nvar builder = WebApplication.CreateBuilder(args);`;
    if (content.includes(appBuilderMarker) && !content.includes('SECTION 2: WebApplication Builder')) {
        content = content.replace(appBuilderMarker, appBuilderHeader);
    }

    const dbMarker = "// Determine Database Persistence Mode (Zero-Cost In-Memory or SQLite)";
    const dbHeader = `// =========================================================================\r\n// SECTION 3: Database & Persistence Layer (SQLite / In-Memory Mode)\r\n// =========================================================================\r\n// Determine Database Persistence Mode (Zero-Cost In-Memory or SQLite)`;
    if (content.includes(dbMarker) && !content.includes('SECTION 3: Database & Persistence Layer')) {
        content = content.replace(dbMarker, dbHeader);
    }

    const diMarker = "// Add DI for core interfaces";
    const diHeader = `// =========================================================================\r\n// SECTION 4: Service Layer Dependency Injection & Background Services\r\n// =========================================================================\r\n// Add DI for core interfaces`;
    if (content.includes(diMarker) && !content.includes('SECTION 4: Service Layer Dependency')) {
        content = content.replace(diMarker, diHeader);
    }

    const dbInitMarker = "// Ensure SQLite schema created on startup (when not in decoupled in-memory mode)";
    const dbInitHeader = `// =========================================================================\r\n// SECTION 5: Database Schema Verification, Migrations & Role Seeding\r\n// =========================================================================\r\n// Ensure SQLite schema created on startup (when not in decoupled in-memory mode)`;
    if (content.includes(dbInitMarker) && !content.includes('SECTION 5: Database Schema Verification')) {
        content = content.replace(dbInitMarker, dbInitHeader);
    }

    const middlewareMarker = "// Centralized enterprise exception handler: catch unhandled errors and return structured JSON";
    const middlewareHeader = `// =========================================================================\r\n// SECTION 6: HTTP Middleware Pipeline, Security Headers & Endpoint Mapping\r\n// =========================================================================\r\n// Centralized enterprise exception handler: catch unhandled errors and return structured JSON`;
    if (content.includes(middlewareMarker) && !content.includes('SECTION 6: HTTP Middleware Pipeline')) {
        content = content.replace(middlewareMarker, middlewareHeader);
    }

    fs.writeFileSync(backendFile, content, 'utf8');
    console.log('✓ Updated cip-backend-dotnet/Program.cs with section comments.');
}

console.log('All comments added successfully.');

// =========================================================================
// 4. Update engineering-commons-vscode/src/views/engineeringCommonsSidebarWebviewProvider.ts
// =========================================================================
const sidebarFile = path.join(__dirname, '..', 'engineering-commons-vscode', 'src', 'views', 'engineeringCommonsSidebarWebviewProvider.ts');
if (fs.existsSync(sidebarFile)) {
    let content = fs.readFileSync(sidebarFile, 'utf8');

    if (!content.includes('CIP #1067 – Engineering Commons Primary Explorer Sidebar Webview Provider')) {
        const header = `/**
 * =========================================================================================
 * CIP #1067 – Engineering Commons Primary Explorer Sidebar Webview Provider
 * =========================================================================================
 *
 * Architecture & UI Layout:
 * 1. Top Header: Displays user online/offline status, authenticated email, role badge (ADMIN, REVIEWER,
 *    PRODUCER, CONSUMER), Login/Switch button, Logout button, Theme toggle, and Analytics shortcut.
 * 2. Tab 1 - Market: Searchable catalog of 200+ AI artifacts (Agents, Skills, MCP Servers, Prompts, Plugins).
 *    Includes category pills, 1-click Install to workspace, ZIP download, and Details modal preview.
 * 3. Tab 2 - Bounties: Gamified task marketplace for community contributions with credit rewards.
 * 4. Tab 3 - My Work: Personal dashboard showing Claimed Bounties, Assigned Code Reviews, and RBAC Access Requests.
 * 5. Tab 4 - Notifications: Real-time notification center for review approvals, changes requested, and feedback.
 * 6. Responsive Design: Fluid breakpoints for narrow VS Code sidebars down to 200px width.
 * =========================================================================================
 */\r\n\r\n`;
        content = header + content;
    }

    const sec1Old = 'export function isPlaybookArtifact(a: any): boolean {';
    const sec1New = `// =========================================================================\r\n// SECTION 1: Artifact Classification & Usability Utility Functions\r\n// =========================================================================\r\nexport function isPlaybookArtifact(a: any): boolean {`;
    if (content.includes(sec1Old) && !content.includes('SECTION 1: Artifact Classification')) {
        content = content.replace(sec1Old, sec1New);
    }

    const sec2Old = 'export class EngineeringCommonsSidebarWebviewProvider implements vscode.WebviewViewProvider {';
    const sec2New = `// =========================================================================\r\n// SECTION 2: Provider Class, In-Memory Cache & Service Dependencies\r\n// =========================================================================\r\nexport class EngineeringCommonsSidebarWebviewProvider implements vscode.WebviewViewProvider {`;
    if (content.includes(sec2Old) && !content.includes('SECTION 2: Provider Class')) {
        content = content.replace(sec2Old, sec2New);
    }

    const sec3Old = '    private async handleMessage(message: any): Promise<void> {';
    const sec3New = `    // =========================================================================\r\n    // SECTION 3: Webview Message Dispatcher (RPC from Client Script to VS Code)\r\n    // =========================================================================\r\n    private async handleMessage(message: any): Promise<void> {`;
    if (content.includes(sec3Old) && !content.includes('SECTION 3: Webview Message Dispatcher')) {
        content = content.replace(sec3Old, sec3New);
    }

    const sec4Old = '    private async renderHtml(force = false): Promise<string> {';
    const sec4New = `    // =========================================================================\r\n    // SECTION 4: HTML Template Rendering & Dynamic View Generation\r\n    // =========================================================================\r\n    private async renderHtml(force = false): Promise<string> {`;
    if (content.includes(sec4Old) && !content.includes('SECTION 4: HTML Template Rendering')) {
        content = content.replace(sec4Old, sec4New);
    }

    const sec5Old = '    <script>\r\n        const vscode = acquireVsCodeApi();';
    const sec5New = `    <!-- ===================================================================== -->\r\n    <!-- SECTION 5: Client-Side Webview JavaScript (Search, Filters & RPC)      -->\r\n    <!-- ===================================================================== -->\r\n    <script>\r\n        const vscode = acquireVsCodeApi();`;
    if (content.includes(sec5Old) && !content.includes('SECTION 5: Client-Side Webview JavaScript')) {
        content = content.replace(sec5Old, sec5New);
    }

    fs.writeFileSync(sidebarFile, content, 'utf8');
    console.log('✓ Updated engineeringCommonsSidebarWebviewProvider.ts with section comments.');
}
