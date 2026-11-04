Engineering Commons CLI (POC)

Consumer Quick Start

Prerequisite: Start the .NET backend (cip-backend-dotnet) locally on http://localhost:5000.

Login (stores session token locally):

	engineering-commons login

List available marketplace artifacts:

	engineering-commons list
	engineering-commons list --type agent

Install an artifact via the installed CIP CLI:

	engineering-commons install design-reviewer

Notes:
- This CLI talks to the local .NET backend for authentication and marketplace data.
- The CLI delegates installation to the `cip` executable on your PATH via `ICipService`.
- The CLI does NOT call GitHub directly and does NOT store any GitHub PAT.
- If `cip` is not installed, `engineering-commons install` will show an error and guidance.

Architecture (POC):

CLI
 ↓
.NET Backend (auth + marketplace)
 ↓
CIP (installed `cip` CLI)
 ↓
AI Artifact

Do not assume any marketplace or CIP behavior beyond what is implemented and tested here.
