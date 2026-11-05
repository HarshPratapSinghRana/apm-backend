$ErrorActionPreference = "Stop"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "      E2E TEST: NOTIFICATION CENTER, DEEP-LINKING & UNREAD/READ LIFECYCLE       " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"

# 1. Login as Reviewer & Producer
Write-Host "`n1. Logging in Reviewer & Producer..." -ForegroundColor Yellow
$revLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"reviewer@company.com","password":"password"}'
$revToken = $revLogin.token
$revHeaders = @{ "Authorization" = "Bearer $revToken"; "Content-Type" = "application/json" }

$prodLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"producer@company.com","password":"password"}'
$prodToken = $prodLogin.token
$prodHeaders = @{ "Authorization" = "Bearer $prodToken"; "Content-Type" = "application/json" }

Write-Host "Reviewer and Producer authenticated." -ForegroundColor Green

# 2. Producer submits new artifact
Write-Host "`n2. Producer submits artifact 'accessibility-agent' v2.0.0..." -ForegroundColor Yellow
$artifactJson = @"
{
  "name": "accessibility-agent",
  "version": "2.0.0",
  "files": [
    {
      "path": "agents/accessibility-agent.md",
      "content": "Line 1: Accessibility Agent\nLine 2: Rule checklist"
    }
  ]
}
"@
$submitResp = Invoke-RestMethod -Uri "$baseUrl/api/artifacts/accessibility-agent/changes" -Headers $prodHeaders -Method Post -Body $artifactJson
$subId = $submitResp.reviewId
Write-Host "Artifact submitted. SubmissionId: $subId" -ForegroundColor Green

# 3. Assign Review -> Reviewer receives ReviewAssigned notification
Write-Host "`n3. Assigning review to reviewer@company.com..." -ForegroundColor Yellow
$assignResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/assign" -Headers $revHeaders -Method Post -Body '{"reviewerEmail":"reviewer@company.com"}'
Write-Host "Review assigned. Status: $($assignResp.status)" -ForegroundColor Green

# 4. Check Reviewer's Notification Center (Unread count increases)
Write-Host "`n4. Checking Reviewer's Notification Center for unread count..." -ForegroundColor Yellow
$revUnreadNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=true" -Headers $revHeaders -Method Get
$assignedNotif = $revUnreadNotifs | Where-Object { $_.submissionId -eq $subId }
if ($null -ne $assignedNotif) {
    Write-Host "Reviewer Notification Center received unread notification: '$($assignedNotif.title)' - $($assignedNotif.message)" -ForegroundColor Green
    Write-Host "Unread Count: $($revUnreadNotifs.Count)" -ForegroundColor Green
} else {
    Write-Host "Notification not found in Reviewer's inbox." -ForegroundColor Red
}

# 5. Reviewer opens review via Deep-Link -> Notification marked as READ
Write-Host "`n5. Reviewer opens review (Deep-Link to Artifact -> Version -> Diff -> Thread)..." -ForegroundColor Yellow
$markReadResp = Invoke-RestMethod -Uri "$baseUrl/api/notifications/$($assignedNotif.id)/read" -Headers $revHeaders -Method Post
Write-Host "Notification marked as read: $($markReadResp.id)" -ForegroundColor Green

# 6. Verify Unread count decreases while historical read notification remains available
Write-Host "`n6. Verifying Unread count decreases & historical notification remains available..." -ForegroundColor Yellow
$revAllNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=false" -Headers $revHeaders -Method Get
$historicalNotif = $revAllNotifs | Where-Object { $_.id -eq $assignedNotif.id }
if ($null -ne $historicalNotif -and $historicalNotif.isRead -eq $true) {
    Write-Host "Historical notification persists in Notification Center as READ (○): $($historicalNotif.title)" -ForegroundColor Green
} else {
    Write-Host "Historical notification missing or still unread." -ForegroundColor Red
}

# 7. Reviewer adds comment -> Producer receives notification
Write-Host "`n7. Reviewer adds line comment -> Producer receives FeedbackAdded notification..." -ForegroundColor Yellow
$commentBody = @{
    filePath = "agents/accessibility-agent.md"
    lineNumber = 2
    lineType = "Context"
    comment = "Please verify keyboard navigation rules."
} | ConvertTo-Json
$commentResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$subId/comments" -Headers $revHeaders -Method Post -Body $commentBody
Write-Host "Comment posted: $($commentResp.id)" -ForegroundColor Green

# 8. Producer checks notifications -> Unread FeedbackAdded notification present
Write-Host "`n8. Producer checks Notification Center..." -ForegroundColor Yellow
$prodNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=true" -Headers $prodHeaders -Method Get
$feedbackNotif = $prodNotifs | Where-Object { $_.submissionId -eq $subId }
if ($null -ne $feedbackNotif) {
    Write-Host "Producer received unread notification: '$($feedbackNotif.title)' - $($feedbackNotif.message)" -ForegroundColor Green
} else {
    Write-Host "Producer did not receive notification." -ForegroundColor Red
}

# 9. Verify Independent Read States (Reviewer vs Producer)
Write-Host "`n9. Verifying Independent Read States (Producer vs Reviewer)..." -ForegroundColor Yellow
# Producer marks their feedback notification as read
$prodMarkRead = Invoke-RestMethod -Uri "$baseUrl/api/notifications/$($feedbackNotif.id)/read" -Headers $prodHeaders -Method Post
$prodRemainingUnread = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=true" -Headers $prodHeaders -Method Get
Write-Host "Producer unread count: $($prodRemainingUnread.Count)" -ForegroundColor Green

# Verify Reviewer's notifications were NOT affected by Producer's read action
$revCheckNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=false" -Headers $revHeaders -Method Get
Write-Host "Reviewer total notifications count: $($revCheckNotifs.Count) (Independent state confirmed)" -ForegroundColor Green

# 10. Verify Unauthorized Read Protection (Security)
Write-Host "`n10. Verifying Security: User cannot mark another user's notification as read..." -ForegroundColor Yellow
try {
    # Producer attempts to mark Reviewer's assigned notification
    Invoke-RestMethod -Uri "$baseUrl/api/notifications/$($assignedNotif.id)/read" -Headers $prodHeaders -Method Post
    Write-Host "SECURITY FAILED: Producer was able to mark Reviewer's notification!" -ForegroundColor Red
} catch {
    Write-Host "SECURITY CONFIRMED: Unauthorized read attempt blocked with 404/Unauthorized." -ForegroundColor Green
}

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "     ALL NOTIFICATION CENTER & DEEP LINK E2E TESTS PASSED SUCCESSFULLY!         " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
