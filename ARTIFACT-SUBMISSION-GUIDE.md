# 🚀 How to Submit AI Artifacts to Marketplace

## Quick Start: Submit Single .md Artifact

### Method 1: Interactive (Simplest)
```powershell
cd c:\Users\HarshPratapSinghRana\Desktop\EMPN_HarshPratapSinghRana\ecommerce-app
.\submit-artifact.ps1
# Then enter file path when prompted
```

### Method 2: With File Path
```powershell
.\submit-artifact.ps1 ".\.github\agents\design-reviewer.agent.md"
```

### Method 3: With Auto-Approval (Full Workflow)
```powershell
.\submit-artifact.ps1 ".\.github\agents\design-reviewer.agent.md" -AutoApprove
```

### Method 4: Custom Artifact ID
```powershell
.\submit-artifact.ps1 ".\.github\agents\design-reviewer.agent.md" -ArtifactId "my-custom-id"
```

---

## Option 1: Submit Individual AI Artifacts via Backend

### Example: AI Chatbot Agent

```powershell
# Start in project root
cd c:\Users\HarshPratapSinghRana\Desktop\EMPN_HarshPratapSinghRana\ecommerce-app

# Submit with auto-approval
.\submit-artifact.ps1 ".\.github\agents\design-reviewer.agent.md" `
  -ArtifactId "ai-chatbot-agent" `
  -AutoApprove
```

### Example: Accessibility Audit Prompt

```powershell
.\submit-artifact.ps1 ".\.github\prompts\accessibility-audit.prompt.md" `
  -ArtifactId "accessibility-auditor" `
  -AutoApprove
```

### Example: Design Review Prompt

```powershell
.\submit-artifact.ps1 ".\.github\prompts\design-review.prompt.md" `
  -ArtifactId "design-reviewer-prompt" `
  -AutoApprove
```

---

## Option 2: Package & Submit AI Artifact via CIP

### Step 1: Create AI Artifact Package Structure

```powershell
# Create directory for your AI artifact
mkdir my-ai-chatbot
cd my-ai-chatbot

# Copy cip.yml template and customize
Copy-Item ..\CIP-ARTIFACT-TEMPLATE.yml .\cip.yml

# Create artifact files
@"
# AI Chatbot Agent

Your AI artifact description and configuration goes here.
Include:
- Agent instructions
- Model configuration
- Capabilities/tools
- Usage examples
"@ | Out-File -Encoding UTF8 .\agent.md

# Create manifest if needed
@"
name: ai-chatbot
version: 1.0.0
type: agent
"@ | Out-File -Encoding UTF8 .\manifest.yml
```

### Step 2: Build CIP Package

```powershell
cd my-ai-chatbot

# Pack for Claude marketplace
cip pack --marketplace=claude --json

# Output shows where the package is built
```

### Step 3: Test Locally (Optional)

```powershell
# Install the package locally to test
cip install ./
```

### Step 4: Publish to Marketplace

```powershell
# Ensure all changes are committed
git add .
git commit -m "Add ai-chatbot artifact"
git tag -a v1.0.0 -m "Release AI Chatbot Agent"

# Push to GitHub
git push
git push --tags

# Publish to CIP marketplace
cip publish
```

---

## Option 3: Batch Submit Multiple Artifacts

### Create: `submit-all-artifacts.ps1`

```powershell
param(
    [switch]$AutoApprove = $false
)

$artifacts = @(
    @{
        Path = ".\.github\agents\design-reviewer.agent.md"
        Id = "design-reviewer"
    },
    @{
        Path = ".\.github\prompts\design-review.prompt.md"
        Id = "design-review-prompt"
    },
    @{
        Path = ".\.github\prompts\accessibility-audit.prompt.md"
        Id = "accessibility-auditor"
    }
)

Write-Host "🚀 Submitting $($artifacts.Count) artifacts..." -ForegroundColor Cyan
Write-Host ""

$submitted = @()
$failed = @()

foreach ($artifact in $artifacts) {
    Write-Host "📤 Submitting: $($artifact.Id)" -ForegroundColor Yellow
    
    $args = @($artifact.Path, $artifact.Id)
    if ($AutoApprove) {
        $args += "-AutoApprove"
    }
    
    $result = & .\submit-artifact.ps1 @args
    
    if ($LASTEXITCODE -eq 0) {
        $submitted += $artifact.Id
    } else {
        $failed += $artifact.Id
    }
    Write-Host ""
}

Write-Host "📊 Results:" -ForegroundColor Cyan
Write-Host "✓ Submitted: $($submitted -join ', ')"
if ($failed.Count -gt 0) {
    Write-Host "❌ Failed: $($failed -join ', ')"
}
```

### Run it:
```powershell
.\submit-all-artifacts.ps1 -AutoApprove
```

---

## Backend API Endpoints Reference

| Endpoint | Method | Role | Purpose |
|----------|--------|------|---------|
| `/api/auth/login` | POST | Any | Login: `{ email, password }` |
| `/api/artifacts/{id}/changes` | POST | Producer | Submit artifact |
| `/api/artifacts/my/changes` | GET | Producer | View my submissions |
| `/api/reviews/pending` | GET | Reviewer | List pending approvals |
| `/api/reviews/{reviewId}/approve` | POST | Reviewer | Approve & publish |
| `/api/reviews/{reviewId}/reject` | POST | Reviewer | Reject submission |

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Producer | producer@test.com | Producer@123 |
| Reviewer | reviewer@test.com | Reviewer@123 |
| Consumer | consumer@test.com | Consumer@123 |

---

## GitHub Publication Flow

```
┌─────────────────────────────────────────────────────────┐
│ Producer: Submit .md file via Backend                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Backend: Store in Review Queue (In-Memory)             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Reviewer: Approve via /api/reviews/{id}/approve        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ GitHubMarketplaceService: Publish to                   │
│ harshpratapsinghrana1/design-reviewer                  │
│ File: artifacts/{artifactId}.md                        │
│ Auth: PAT from .env (GITHUB__TOKEN)                    │
└─────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Issue: "Connection refused"
```
❌ Backend not running at http://localhost:5000

✅ Solution: Start backend in another terminal
cd cip-backend-dotnet
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run
```

### Issue: 401 Unauthorized
```
❌ Credentials invalid

✅ Check: Email and password match test users above
```

### Issue: "File not found"
```
❌ Could not resolve path

✅ Use relative path from project root
.\submit-artifact.ps1 ".\.github\agents\design-reviewer.agent.md"
```

### Issue: GitHub publish fails
```
❌ GitHub API error

✅ Check .env file has valid PAT:
GITHUB__TOKEN=github_pat_11C...
GITHUB__OWNER=harshpratapsinghrana1
GITHUB__REPOSITORY=design-reviewer
```

---

## Next: Build CIP CLI Integration

To make the CLI also support publishing artifacts, add to `EngineeringCommonsCli`:

```csharp
// In Program.cs, add:
"publish" => svc.GetRequiredService<PublishCommand>().Invoke(remaining)

// Create PublishCommand.cs to accept .md files and POST to backend
```

Would you like me to implement this?
