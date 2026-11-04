CIP Backend — .NET POC

Lightweight ASP.NET Core proof-of-concept for a simple Producer → Reviewer → Publish workflow.

Why this repo
- Fast local dev: static users, in-memory tokens, minimal services.
- Extendable: `IMarketplaceService` abstracts publishing (GitHub implementation included).

Quick start
1. Prereqs: .NET SDK (matching target `net10.0`).
2. Start server (Development environment recommended):

```powershell
cd cip-backend-dotnet
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run
```

3. Open health page: `http://localhost:5000/` — `gitHubConfigured` shows whether publish is wired.

Sample users (POC only)
- Consumer: consumer@test.com / Consumer@123
- Producer: producer@test.com / Producer@123
- Reviewer: reviewer@test.com / Reviewer@123

Typical flow (one-liner)
- Producer logs in → submits change → Reviewer lists pending → Reviewer approves → backend publishes via GitHub (if configured).

## Manual Testing: Backend + CLI

### Prerequisites
- .NET SDK 10.0.11+
- Two PowerShell terminals: one for backend, one for CLI testing

### Step 1: Start the Backend Server
```powershell
cd cip-backend-dotnet
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run
```
Expected output: Server runs on `http://localhost:5000`

### Step 2: Test Backend Health
Open a second PowerShell terminal and verify the API is running:
```powershell
Invoke-RestMethod -Uri http://localhost:5000/ | ConvertTo-Json
```
Expected: `{ "status": "healthy", "gitHubConfigured": false }`

### Step 3: CLI Login Test
Log in as a consumer using the CLI:
```powershell
cd EngineeringCommonsCli
dotnet run -- login consumer@test.com Consumer@123
```
Expected: `✓ Login successful. Token saved.`

### Step 4: Backend Producer Workflow (PowerShell)
In the second terminal, test producer submission:
```powershell
# Login as producer and get token
$login = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/login `
  -Body (@{ email='producer@test.com'; password='Producer@123' } | ConvertTo-Json) `
  -ContentType 'application/json'
$token = $login.token

# Producer submits a change
$headers = @{ Authorization = "Bearer $token" }
$body = @{ Content = "Test update from manual testing $(Get-Date)" } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri http://localhost:5000/api/artifacts/placeholder/changes `
  -Headers $headers -Body $body -ContentType 'application/json' | ConvertTo-Json
```
Expected: Change is submitted with success status.

### Step 5: Backend Reviewer Workflow (PowerShell)
Test reviewer listing and approving:
```powershell
# Login as reviewer
$reviewLogin = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/login `
  -Body (@{ email='reviewer@test.com'; password='Reviewer@123' } | ConvertTo-Json) `
  -ContentType 'application/json'
$reviewToken = $reviewLogin.token

# List pending reviews
$headersR = @{ Authorization = "Bearer $reviewToken" }
$pending = Invoke-RestMethod -Method Get -Uri http://localhost:5000/api/reviews/pending `
  -Headers $headersR
$pending | ConvertTo-Json -Depth 4

# Get the first review ID from the response and approve it
$reviewId = $pending[0].id
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:5000/api/reviews/$reviewId/approve" `
  -Headers $headersR | ConvertTo-Json -Depth 4
```
Expected: Pending reviews shown and approval succeeds.

### Step 6: Full CLI Workflow (Optional)
Back in the CLI terminal, test additional CLI commands:
```powershell
# List available artifacts
dotnet run -- list

# Install an artifact (if available)
dotnet run -- install <artifact-id>
```

### Troubleshooting Manual Tests
| Issue | Solution |
|-------|----------|
| "Connection refused" | Ensure backend is running in first terminal |
| 401 Unauthorized | Verify credentials match sample users (above) |
| CLI token not working | Run `login` command again to refresh token |
| No pending reviews | Run producer submit step first, then check reviews |

Common commands (PowerShell)

Login and save token:
```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/login -Body (@{ email='producer@test.com'; password='Producer@123' } | ConvertTo-Json) -ContentType 'application/json'
$token = $login.token
```

Producer: submit a change
```powershell
$headers = @{ Authorization = "Bearer $token" }
$body = @{ Content = "POC update from producer $(Get-Date)" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/artifacts/placeholder/changes -Headers $headers -Body $body -ContentType 'application/json'
```

Reviewer: list pending and approve
```powershell
$reviewLogin = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/login -Body (@{ email='reviewer@test.com'; password='Reviewer@123' } | ConvertTo-Json) -ContentType 'application/json'
$headersR = @{ Authorization = "Bearer $($reviewLogin.token)" }
Invoke-RestMethod -Method Get -Uri http://localhost:5000/api/reviews/pending -Headers $headersR | ConvertTo-Json -Depth 4
Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/reviews/<reviewId>/approve" -Headers $headersR | ConvertTo-Json -Depth 6
```

Verify GitHub publish (optional)
- Set your GitHub PAT and repo before `dotnet run` (environment or `dotnet user-secrets`).

```powershell
#$env:GITHUB_TOKEN = "<YOUR_PAT>"
#$env:GITHUB_OWNER = "your-org-or-user"
#$env:GITHUB_REPOSITORY = "your-repo"
```

Then `GET /` should show `"gitHubConfigured": true` and approvals will attempt to publish.

APIs (short)
- `POST /api/auth/login` { email, password } → `{ token }`
- `POST /api/artifacts/{artifactId}/changes` (Producer)
- `GET /api/artifacts/my/changes` (Producer)
- `GET /api/reviews/pending` (Reviewer)
- `GET /api/reviews/{reviewId}`
- `POST /api/reviews/{reviewId}/approve` (Reviewer)
- `POST /api/reviews/{reviewId}/reject` (Reviewer)

Notes & safety
- This is a POC — do not store real secrets in `appsettings.Development.json`.
- Use `dotnet user-secrets` or environment variables for the GitHub PAT and other secrets.
- Replace in-memory services with real storage and secure auth before production.

Want it simpler?
- I can add a tiny HTML dashboard (single page) for Producer/Reviewer actions, or create cURL/PowerShell scripts that run the full happy-path. Tell me which and I will scaffold it.
