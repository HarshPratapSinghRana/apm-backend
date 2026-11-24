Engineering Commons CLI

Consumer Quick Start

Prerequisite: Connected to Azure Container Apps hosted backend (https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io).

Login (stores session token locally):

	engineering-commons login

List available marketplace artifacts:

	engineering-commons list
	engineering-commons list --type agent

Install an artifact via the installed Engineering Commons CLI:

	engineering-commons install design-reviewer

Notes:
- This CLI communicates with the Azure Container Apps hosted backend for authentication and marketplace data.
- The CLI delegates installation to the `cip` executable on your PATH via `ICipService`.
- The CLI does NOT call GitHub directly and does NOT store any GitHub PAT.
- If `cip` is not installed, `engineering-commons install` will show an error and guidance.

Architecture:

CLI
 ↓
Azure Container Apps Backend (auth + marketplace)
 ↓
Engineering Commons (installed `cip` CLI)
 ↓
AI Artifact

Do not assume any marketplace or Engineering Commons behavior beyond what is implemented and tested here.
