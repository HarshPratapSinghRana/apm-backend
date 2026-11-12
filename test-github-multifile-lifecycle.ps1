$ErrorActionPreference = "Stop"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "      MULTI-FILE .GITHUB LIFECYCLE: PRODUCER -> REVIEW -> UPDATE -> CONSUMER    " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$baseUrl = "https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io"
$rootDir = "c:\Users\HarshPratapSinghRana\Desktop\EMPN_HarshPratapSinghRana\ecommerce-app"

# -----------------------------------------------------------------------------
# STEP 1: PRODUCER LOGS IN & CONTRIBUTES MULTI-FILE ARTIFACT FROM .GITHUB
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host ">>> STEP 1: PRODUCER LOGS IN & CONTRIBUTES MULTI-FILE ARTIFACT <<<" -ForegroundColor Yellow

Write-Host ""
Write-Host "1.1. Producer login..." -ForegroundColor Cyan
$prodLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"producer@company.com","password":"password"}'
$prodHeaders = @{ "Authorization" = "Bearer $($prodLogin.token)"; "Content-Type" = "application/json" }
Write-Host "Login successful." -ForegroundColor Green

Write-Host ""
Write-Host "1.2. Producer submits enterprise-reviewer from .github/agents/enterprise-reviewer..." -ForegroundColor Cyan

$initialPayload = @"
{
  "name": "enterprise-reviewer",
  "type": "agent",
  "version": "1.0.0",
  "description": "Enterprise AI agent for code review, accessibility, and security compliance.",
  "cipPackage": "harshpratapsinghrana1/enterprise-reviewer#v1.0.0",
  "files": [
    {
      "path": ".github/agents/enterprise-reviewer/enterprise-reviewer.agent.md",
      "content": "---\nname: enterprise-reviewer\nversion: 1.0.0\ndescription: Enterprise code quality and security review agent\n---\n\n# Enterprise Reviewer Agent\n\nYou are an automated code quality and security auditor.\n\n## Capabilities\n1. Analyze pull requests for coding standard adherence.\n2. Verify security best practices.\n3. Generate actionable feedback reports with diff references.\n\n## Instructions\n- Consult instructions/code-quality.md for clean architecture principles.\n- Apply rules/security-rules.md to flag potential vulnerabilities.\n"
    },
    {
      "path": ".github/agents/enterprise-reviewer/instructions/code-quality.md",
      "content": "# Code Quality Guidelines\n\n1. **Separation of Concerns**: Keep controllers thin, delegate domain logic to services.\n2. **Error Handling**: Use structured try-catch and return descriptive problem details.\n3. **Immutability**: Avoid global mutable state.\n4. **Testing**: Ensure all business-critical paths have unit tests.\n"
    },
    {
      "path": ".github/agents/enterprise-reviewer/rules/security-rules.md",
      "content": "# Security Rules\n\n1. Check for hardcoded credentials, API keys, or PATs in source code.\n2. Ensure all external input is validated before processing.\n"
    },
    {
      "path": ".github/agents/enterprise-reviewer/cip.yml",
      "content": "name: enterprise-reviewer\nversion: 1.0.0\ntype: agent\ndescription: Enterprise AI agent for code review, accessibility, and security compliance.\nauthor: producer@company.com\nfiles:\n  - enterprise-reviewer.agent.md\n  - instructions/code-quality.md\n  - rules/security-rules.md\n"
    }
  ]
}
"@

$subResp = Invoke-RestMethod -Uri "$baseUrl/api/artifacts/enterprise-reviewer/changes" -Headers $prodHeaders -Method Post -Body $initialPayload
$subId = $subResp.reviewId
Write-Host "Submission created: ID=$subId, Status=$($subResp.status)" -ForegroundColor Green

# -----------------------------------------------------------------------------
# STEP 2: REVIEWER ASSIGNS REVIEW & GIVES FILE/LINE FEEDBACK IN THREAD
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host ">>> STEP 2: REVIEWER ASSIGNS & GIVES FILE/LINE FEEDBACK IN THREAD <<<" -ForegroundColor Yellow

$revLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"reviewer@company.com","password":"password"}'
$revHeaders = @{ "Authorization" = "Bearer $($revLogin.token)"; "Content-Type" = "application/json" }

Write-Host ""
Write-Host "2.1. Reviewer claims and assigns review (Submitted -> UnderReview)..." -ForegroundColor Cyan
$assignResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/assign" -Headers $revHeaders -Method Post -Body '{"reviewerEmail":"reviewer@company.com"}'
Write-Host "Review claimed. Status: $($assignResp.status)" -ForegroundColor Green

Write-Host ""
Write-Host "2.2. Reviewer inspects diff and adds line comment on security-rules.md Line 2..." -ForegroundColor Cyan
$commentBody = @{
    filePath = ".github/agents/enterprise-reviewer/rules/security-rules.md"
    lineNumber = 2
    lineType = "Context"
    comment = "Please add explicit rules for SQL injection, Cross-Site Scripting (XSS), and CSRF token protection."
} | ConvertTo-Json
$commentResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/comments" -Headers $revHeaders -Method Post -Body $commentBody
$commentId = $commentResp.id
Write-Host "Line comment added by reviewer: ID=$commentId" -ForegroundColor Green

Write-Host ""
Write-Host "2.3. Reviewer requests changes (UnderReview -> ChangesRequested)..." -ForegroundColor Cyan
$reqChangesResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/request-changes" -Headers $revHeaders -Method Post -Body '{"feedback":"Please update security-rules.md with SQLi, XSS, and CSRF guidelines."}'
Write-Host "Changes requested. Status: $($reqChangesResp.status)" -ForegroundColor Green

Write-Host ""
Write-Host "2.4. Producer checks Notification Center for feedback..." -ForegroundColor Cyan
$prodNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=true" -Headers $prodHeaders -Method Get
$feedbackNotif = $prodNotifs | Where-Object { $_.submissionId -eq $subId } | Select-Object -First 1
if ($null -ne $feedbackNotif) {
    Write-Host "Producer received notification: $($feedbackNotif.title) - $($feedbackNotif.message)" -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# STEP 3: PRODUCER REPLIES TO THREAD & RESUBMITS UPDATED FILES
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host ">>> STEP 3: PRODUCER REPLIES TO THREAD & RESUBMITS UPDATED FILES <<<" -ForegroundColor Yellow

Write-Host ""
Write-Host "3.1. Producer replies directly to the line comment thread..." -ForegroundColor Cyan
$replyBody = @{
    reply = "Updated security-rules.md with parameterized SQL queries, XSS HTML encoding, and AntiForgeryToken validation."
} | ConvertTo-Json
$replyResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/comments/$commentId/replies" -Headers $prodHeaders -Method Post -Body $replyBody
Write-Host "Producer reply posted in thread: ID=$($replyResp.id)" -ForegroundColor Green

Write-Host ""
Write-Host "3.2. Producer updates local file security-rules.md..." -ForegroundColor Cyan
$updatedRules = @"
# Security Rules (v1.0.0 Updated)

1. Check for hardcoded credentials, API keys, or PATs in source code.
2. Prevent SQL Injection: Strictly enforce parameterized queries / ORM mapping.
3. Prevent Cross-Site Scripting (XSS): Ensure HTML encoding and output sanitization.
4. Prevent CSRF: Require AntiForgeryToken on all mutating state endpoints (POST/PUT/DELETE).
"@
Set-Content -Path "$rootDir\.github\agents\enterprise-reviewer\rules\security-rules.md" -Value $updatedRules -Force
Write-Host "Local file updated with security guidelines." -ForegroundColor Green

Write-Host ""
Write-Host "3.3. Producer resubmits updated artifact package (ChangesRequested -> Resubmitted)..." -ForegroundColor Cyan
$resubmitPayload = @"
{
  "name": "enterprise-reviewer",
  "type": "agent",
  "version": "1.0.0",
  "description": "Enterprise AI agent for code review, accessibility, and security compliance.",
  "cipPackage": "harshpratapsinghrana1/enterprise-reviewer#v1.0.0",
  "files": [
    {
      "path": ".github/agents/enterprise-reviewer/enterprise-reviewer.agent.md",
      "content": "---\nname: enterprise-reviewer\nversion: 1.0.0\ndescription: Enterprise code quality and security review agent\n---\n\n# Enterprise Reviewer Agent\n\nYou are an automated code quality and security auditor.\n\n## Capabilities\n1. Analyze pull requests for coding standard adherence.\n2. Verify security best practices.\n3. Generate actionable feedback reports with diff references.\n\n## Instructions\n- Consult instructions/code-quality.md for clean architecture principles.\n- Apply rules/security-rules.md to flag potential vulnerabilities.\n"
    },
    {
      "path": ".github/agents/enterprise-reviewer/instructions/code-quality.md",
      "content": "# Code Quality Guidelines\n\n1. **Separation of Concerns**: Keep controllers thin, delegate domain logic to services.\n2. **Error Handling**: Use structured try-catch and return descriptive problem details.\n3. **Immutability**: Avoid global mutable state.\n4. **Testing**: Ensure all business-critical paths have unit tests.\n"
    },
    {
      "path": ".github/agents/enterprise-reviewer/rules/security-rules.md",
      "content": "# Security Rules (v1.0.0 Updated)\n\n1. Check for hardcoded credentials, API keys, or PATs in source code.\n2. Prevent SQL Injection: Strictly enforce parameterized queries / ORM mapping.\n3. Prevent Cross-Site Scripting (XSS): Ensure HTML encoding and output sanitization.\n4. Prevent CSRF: Require AntiForgeryToken on all mutating state endpoints (POST/PUT/DELETE).\n"
    },
    {
      "path": ".github/agents/enterprise-reviewer/cip.yml",
      "content": "name: enterprise-reviewer\nversion: 1.0.0\ntype: agent\ndescription: Enterprise AI agent for code review, accessibility, and security compliance.\nauthor: producer@company.com\nfiles:\n  - enterprise-reviewer.agent.md\n  - instructions/code-quality.md\n  - rules/security-rules.md\n"
    }
  ]
}
"@

$resubmitResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/resubmit" -Headers $prodHeaders -Method Post -Body $resubmitPayload
Write-Host "Artifact resubmitted successfully. Status: $($resubmitResp.status)" -ForegroundColor Green

# -----------------------------------------------------------------------------
# STEP 4: REVIEWER INSPECTS UPDATED DIFF, CLOSES FEEDBACK & APPROVES
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host ">>> STEP 4: REVIEWER APPROVES SUBMISSION & PUBLISHES TO MARKETPLACE <<<" -ForegroundColor Yellow

Write-Host ""
Write-Host "4.1. Reviewer replies to thread closing the feedback..." -ForegroundColor Cyan
$revClosingReply = @{
    reply = "Reviewed the updated security rules. All requirements met. Approving submission."
} | ConvertTo-Json
$revClosingResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/comments/$commentId/replies" -Headers $revHeaders -Method Post -Body $revClosingReply
Write-Host "Reviewer closure reply posted." -ForegroundColor Green

Write-Host ""
Write-Host "4.2. Reviewer approves submission (Resubmitted -> Approved -> Published)..." -ForegroundColor Cyan
$approveResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/approve" -Headers $revHeaders -Method Post -Body '{"feedback":"All security guidelines implemented. Approved and published!"}'
Write-Host "Review Approved & Published! Status: $($approveResp.status), IsPublished: $($approveResp.isPublished)" -ForegroundColor Green

# -----------------------------------------------------------------------------
# STEP 5: CONSUMER BROWSES & INSTALLS MULTI-FILE ARTIFACT
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host ">>> STEP 5: CONSUMER BROWSES & INSTALLS MULTI-FILE ARTIFACT <<<" -ForegroundColor Yellow

$consumerWorkspace = "$rootDir\test-consumer-workspace"
if (Test-Path $consumerWorkspace) {
    Remove-Item $consumerWorkspace -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $consumerWorkspace -Force | Out-Null

Write-Host ""
Write-Host "5.1. Consumer logs in..." -ForegroundColor Cyan
& dotnet run --project "$rootDir/EngineeringCommonsCli/EngineeringCommonsCli.csproj" -- login consumer@company.com password

Write-Host ""
Write-Host "5.2. Consumer checks available versions for enterprise-reviewer..." -ForegroundColor Cyan
& dotnet run --project "$rootDir/EngineeringCommonsCli/EngineeringCommonsCli.csproj" -- list-versions enterprise-reviewer

Write-Host ""
Write-Host "5.3. Consumer installs enterprise-reviewer v1.0.0 into workspace..." -ForegroundColor Cyan
Push-Location $consumerWorkspace
try {
    & dotnet run --project "$rootDir/EngineeringCommonsCli/EngineeringCommonsCli.csproj" -- install enterprise-reviewer --version 1.0.0
} finally {
    Pop-Location
}

# -----------------------------------------------------------------------------
# STEP 6: VERIFY MULTI-FILE SYSTEM PLACEMENT & CONTENT INTEGRITY
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host ">>> STEP 6: VERIFYING INSTALLED FILES & CONTENT INTEGRITY <<<" -ForegroundColor Yellow

$agentFile = "$consumerWorkspace\.github\agents\enterprise-reviewer\enterprise-reviewer.agent.md"
$instFile = "$consumerWorkspace\.github\agents\enterprise-reviewer\instructions\code-quality.md"
$rulesFile = "$consumerWorkspace\.github\agents\enterprise-reviewer\rules\security-rules.md"
$manifestFile = "$consumerWorkspace\.cip\installed\enterprise-reviewer.json"

Write-Host ""
Write-Host "Checking installed files exist:" -ForegroundColor Cyan
if (Test-Path $agentFile) { Write-Host "Agent file exists: $agentFile" -ForegroundColor Green } else { throw "Missing $agentFile" }
if (Test-Path $instFile) { Write-Host "Instructions file exists: $instFile" -ForegroundColor Green } else { throw "Missing $instFile" }
if (Test-Path $rulesFile) { Write-Host "Security rules file exists: $rulesFile" -ForegroundColor Green } else { throw "Missing $rulesFile" }
if (Test-Path $manifestFile) { Write-Host "Installation manifest exists: $manifestFile" -ForegroundColor Green } else { throw "Missing $manifestFile" }

Write-Host ""
Write-Host "Checking updated security rules content in consumer installation:" -ForegroundColor Cyan
$installedRulesContent = Get-Content -Path $rulesFile -Raw
if ($installedRulesContent.Contains("Prevent SQL Injection") -and $installedRulesContent.Contains("Prevent Cross-Site Scripting") -and $installedRulesContent.Contains("Prevent CSRF")) {
    Write-Host "Content integrity verified: Consumer has the updated security rules (SQLi, XSS, CSRF)!" -ForegroundColor Green
} else {
    throw "Security rules content does not contain the updated guidelines!"
}

# -----------------------------------------------------------------------------
# STEP 7: INSPECT SQLITE DATABASE TABLES
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host ">>> STEP 7: SQLITE DATABASE VERIFICATION <<<" -ForegroundColor Yellow
python "$rootDir\view_db.py" review_comments
python "$rootDir\view_db.py" reviews

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   MULTI-FILE .GITHUB LIFECYCLE COMPLETED AND VERIFIED 100% SUCCESSFULLY!       " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
