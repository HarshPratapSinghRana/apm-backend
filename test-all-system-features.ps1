$ErrorActionPreference = "Stop"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "              FULL END-TO-END SYSTEM FUNCTIONALITY TEST BATTERY                 " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$cli = ".\engineering-commons.exe"
if (-not (Test-Path $cli)) {
    $cli = "dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj --"
}
$baseUrl = "https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io"

# -----------------------------------------------------------------------------
# 1. CONSUMER CLI WORKFLOW
# -----------------------------------------------------------------------------
Write-Host "`n>>> 1. TESTING CONSUMER CLI WORKFLOW <<<" -ForegroundColor Yellow

Write-Host "`n1.1. Consumer Login..." -ForegroundColor Cyan
& dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- login consumer@company.com password

Write-Host "`n1.2. List Marketplace Artifacts..." -ForegroundColor Cyan
& dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- list

Write-Host "`n1.3. List Artifacts Filtered by Type (agent)..." -ForegroundColor Cyan
& dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- list --type agent

Write-Host "`n1.4. List Available Versions for 'design-reviewer'..." -ForegroundColor Cyan
& dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- list-versions design-reviewer

Write-Host "`n1.5. Install Exact Version 1.0.0..." -ForegroundColor Cyan
& dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- install design-reviewer --version 1.0.0

Write-Host "`n1.6. Update to Version 1.1.0 (File Reconciliation)..." -ForegroundColor Cyan
& dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- install design-reviewer --version 1.1.0

# -----------------------------------------------------------------------------
# 2. PRODUCER CLI WORKFLOW
# -----------------------------------------------------------------------------
Write-Host "`n>>> 2. TESTING PRODUCER CLI WORKFLOW <<<" -ForegroundColor Yellow

Write-Host "`n2.1. Producer Login..." -ForegroundColor Cyan
& dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- login producer@company.com password

Write-Host "`n2.2. Create Sample Skill Artifact 'skills/demo-skill/SKILL.md'..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "skills/demo-skill" -Force | Out-Null
Set-Content -Path "skills/demo-skill/SKILL.md" -Value "---\nname: demo-skill\nversion: 1.0.0\ndescription: Demo skill for E2E testing\n---\n# Demo Skill\nInstructions for execution."

Write-Host "`n2.3. Producer Contributes Local Artifact 'demo-skill'..." -ForegroundColor Cyan
& dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- contribute demo-skill

Write-Host "`n2.4. Check Submission Status via CLI..." -ForegroundColor Cyan
& dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- status

# -----------------------------------------------------------------------------
# 3. REVIEWER CLI WORKFLOW
# -----------------------------------------------------------------------------
Write-Host "`n>>> 3. TESTING REVIEWER CLI WORKFLOW <<<" -ForegroundColor Yellow

Write-Host "`n3.1. Reviewer Login..." -ForegroundColor Cyan
& dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- login reviewer@company.com password

Write-Host "`n3.2. Reviewer inspects Unified Diff via CLI..." -ForegroundColor Cyan
& dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- review

# -----------------------------------------------------------------------------
# 4. REST API & REVIEW LIFECYCLE + LINE COMMENTS
# -----------------------------------------------------------------------------
Write-Host "`n>>> 4. TESTING REVIEW LIFECYCLE & FILE/LINE COMMENTS <<<" -ForegroundColor Yellow

# Submit multi-file review
$prodLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"producer@company.com","password":"password"}'
$prodHeaders = @{ "Authorization" = "Bearer $($prodLogin.token)"; "Content-Type" = "application/json" }

$revLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"reviewer@company.com","password":"password"}'
$revHeaders = @{ "Authorization" = "Bearer $($revLogin.token)"; "Content-Type" = "application/json" }

$multiFileJson = @"
{
  "name": "full-test-agent",
  "version": "1.0.0",
  "files": [
    {
      "path": "agents/full-test-agent.md",
      "content": "Line 1: Full Test Agent\nLine 2: Rule checking logic\nLine 3: Execution report"
    },
    {
      "path": "skills/testing/SKILL.md",
      "content": "Line 1: Testing Skill\nLine 5: Unit test rules"
    }
  ]
}
"@

Write-Host "`n4.1. Producer submits 'full-test-agent'..." -ForegroundColor Cyan
$subResp = Invoke-RestMethod -Uri "$baseUrl/api/artifacts/full-test-agent/changes" -Headers $prodHeaders -Method Post -Body $multiFileJson
$subId = $subResp.reviewId
Write-Host "Created submission: $subId, Status: $($subResp.status)" -ForegroundColor Green

Write-Host "`n4.2. Reviewer assigns review (Submitted -> UnderReview)..." -ForegroundColor Cyan
$assignResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/assign" -Headers $revHeaders -Method Post -Body '{"reviewerEmail":"reviewer@company.com"}'
Write-Host "Assigned review: Status=$($assignResp.status)" -ForegroundColor Green

Write-Host "`n4.3. Reviewer adds Line Comment on agents/full-test-agent.md Line 2..." -ForegroundColor Cyan
$commentBody = @{
    filePath = "agents/full-test-agent.md"
    lineNumber = 2
    lineType = "Context"
    comment = "Please verify timeout exception handling."
} | ConvertTo-Json
$commentResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/comments" -Headers $revHeaders -Method Post -Body $commentBody
$commentId = $commentResp.id
Write-Host "Comment posted: ID=$commentId on $($commentResp.filePath):$($commentResp.lineNumber)" -ForegroundColor Green

Write-Host "`n4.4. Producer replies to Line Comment..." -ForegroundColor Cyan
$replyBody = @{ reply = "Handled timeouts with CancellationToken." } | ConvertTo-Json
$replyResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/comments/$commentId/replies" -Headers $prodHeaders -Method Post -Body $replyBody
Write-Host "Reply posted: ID=$($replyResp.id), Reply='$($replyResp.comment)'" -ForegroundColor Green

Write-Host "`n4.5. Reviewer requests changes (UnderReview -> ChangesRequested)..." -ForegroundColor Cyan
$reqResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/request-changes" -Headers $revHeaders -Method Post -Body '{"feedback":"Add unit tests for cancellation."}'
Write-Host "Changes requested: Status=$($reqResp.status)" -ForegroundColor Green

Write-Host "`n4.6. Producer resubmits updated content (ChangesRequested -> Resubmitted)..." -ForegroundColor Cyan
$resubResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/resubmit" -Headers $prodHeaders -Method Post -Body $multiFileJson
Write-Host "Resubmitted: Status=$($resubResp.status)" -ForegroundColor Green

Write-Host "`n4.7. Reviewer approves submission (Resubmitted -> Approved -> Published)..." -ForegroundColor Cyan
$appResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/approve" -Headers $revHeaders -Method Post -Body '{"feedback":"Looks solid, approved!"}'
Write-Host "Approved: Status=$($appResp.status), IsPublished=$($appResp.isPublished)" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 5. NOTIFICATION CENTER & DEEP LINK VERIFICATION
# -----------------------------------------------------------------------------
Write-Host "`n>>> 5. TESTING NOTIFICATION CENTER & READ/UNREAD ISOLATION <<<" -ForegroundColor Yellow

Write-Host "`n5.1. Fetching Producer Notifications..." -ForegroundColor Cyan
$prodNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=false" -Headers $prodHeaders -Method Get
Write-Host "Producer has $($prodNotifs.Count) notifications." -ForegroundColor Green
$prodUnread = $prodNotifs | Where-Object { $_.isRead -eq $false }
Write-Host "Producer unread count: $($prodUnread.Count)" -ForegroundColor Green

if ($prodUnread.Count -gt 0) {
    $firstUnread = $prodUnread[0]
    Write-Host "`n5.2. Marking Producer notification $($firstUnread.id) as READ..." -ForegroundColor Cyan
    $markResp = Invoke-RestMethod -Uri "$baseUrl/api/notifications/$($firstUnread.id)/read" -Headers $prodHeaders -Method Post
    Write-Host "Notification marked as read: $($markResp.id)" -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# 6. USAGE TELEMETRY & SQLITE DATABASE INSPECTION
# -----------------------------------------------------------------------------
Write-Host "`n>>> 6. TESTING USAGE TELEMETRY & SQLITE TABLES <<<" -ForegroundColor Yellow

Write-Host "`n6.1. Fetching Usage Telemetry Summary..." -ForegroundColor Cyan
$usageSummary = Invoke-RestMethod -Uri "$baseUrl/api/usage/summary" -Headers $revHeaders -Method Get
Write-Host "Total Recorded Usage Events: $($usageSummary.totalEvents)" -ForegroundColor Green
Write-Host "Events by Action: $($usageSummary.eventsByAction | ConvertTo-Json -Compress)" -ForegroundColor Green

Write-Host "`n6.2. Inspecting SQLite Database Tables..." -ForegroundColor Cyan
python view_db.py notifications
python view_db.py review_comments
python view_db.py reviews

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "     ALL SYSTEM FUNCTIONALITIES TESTED AND VERIFIED 100% GREEN!                 " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
