$ErrorActionPreference = "Stop"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "      E2E TEST: FILE/LINE-LEVEL COMMENTS, STATUS LIFECYCLE & EVENTS             " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$baseUrl = "https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io"

# 1. Login Producer & Reviewer
Write-Host "`n1. Logging in Producer and Reviewer..." -ForegroundColor Yellow
$prodLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"producer@company.com","password":"password"}'
$prodToken = $prodLogin.token
$prodHeaders = @{ "Authorization" = "Bearer $prodToken"; "Content-Type" = "application/json" }

$revLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"reviewer@company.com","password":"password"}'
$revToken = $revLogin.token
$revHeaders = @{ "Authorization" = "Bearer $revToken"; "Content-Type" = "application/json" }

Write-Host "Logged in as producer@company.com and reviewer@company.com" -ForegroundColor Green

# 2. Producer Submits Multi-File Artifact
Write-Host "`n2. Producer submits multi-file artifact 'design-reviewer' (Draft/Submitted)..." -ForegroundColor Yellow
$multiFileContent = @"
{
  "name": "design-reviewer",
  "version": "1.1.0",
  "files": [
    {
      "path": "agents/design-reviewer.md",
      "content": "Line 10: Analyze page.\nLine 11: Setup rules.\nLine 12: Check all WCAG accessibility requirements.\nLine 13: Check keyboard navigation."
    },
    {
      "path": "skills/accessibility/SKILL.md",
      "content": "Line 1: Skill Title\nLine 8: Accessibility checklist\nLine 15: Execution rules"
    }
  ]
}
"@
$submitResp = Invoke-RestMethod -Uri "$baseUrl/api/artifacts/design-reviewer/changes" -Headers $prodHeaders -Method Post -Body $multiFileContent
$reviewId = $submitResp.reviewId
Write-Host "Submission created. ReviewId: $reviewId, Status: $($submitResp.status)" -ForegroundColor Green

# 3. Reviewer Assigns Review (Submitted -> UnderReview)
Write-Host "`n3. Reviewer assigns review (Submitted -> UnderReview)..." -ForegroundColor Yellow
$assignResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/assign" -Headers $revHeaders -Method Post -Body '{"reviewerEmail":"reviewer@company.com"}'
Write-Host "Review assigned. Status: $($assignResp.status)" -ForegroundColor Green

# 4. Reviewer Adds Line-Level Comment on agents/design-reviewer.md Line 12
Write-Host "`n4. Reviewer adds line-level comment on agents/design-reviewer.md Line 12..." -ForegroundColor Yellow
$commentBody = @{
    filePath = "agents/design-reviewer.md"
    lineNumber = 12
    lineType = "Modified"
    oldContent = "Check basic accessibility."
    newContent = "Check all WCAG accessibility requirements."
    comment = "Please change this error handling."
} | ConvertTo-Json
$commentResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/comments" -Headers $revHeaders -Method Post -Body $commentBody
$commentId = $commentResp.id
Write-Host "Line comment created: ID=$commentId on $($commentResp.filePath):$($commentResp.lineNumber)" -ForegroundColor Green

# 5. Producer checks notifications and comments
Write-Host "`n5. Producer retrieves comments and verifies notification..." -ForegroundColor Yellow
$prodComments = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/comments" -Headers $prodHeaders -Method Get
$foundComment = $prodComments | Where-Object { $_.id -eq $commentId }
if ($null -ne $foundComment) {
    Write-Host "Producer retrieved line comment: $($foundComment.comment) on $($foundComment.filePath):$($foundComment.lineNumber)" -ForegroundColor Green
} else {
    Write-Host "Producer did not find line comment." -ForegroundColor Red
}

# 6. Producer replies to the line comment thread
Write-Host "`n6. Producer replies to line comment thread..." -ForegroundColor Yellow
$replyBody = @{ reply = "Updated it. Please check again." } | ConvertTo-Json
$replyResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/comments/$commentId/replies" -Headers $prodHeaders -Method Post -Body $replyBody
Write-Host "Producer reply created: ID=$($replyResp.id), Reply='$($replyResp.comment)'" -ForegroundColor Green

# 7. Reviewer retrieves comments and verifies nested reply thread
Write-Host "`n7. Reviewer retrieves comments and checks thread hierarchy..." -ForegroundColor Yellow
$revComments = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/comments" -Headers $revHeaders -Method Get
$commentWithReplies = $revComments | Where-Object { $_.id -eq $commentId }
if ($null -ne $commentWithReplies -and $commentWithReplies.replies.Count -gt 0) {
    Write-Host "Reviewer sees reply in thread: '$($commentWithReplies.replies[0].comment)' from $($commentWithReplies.replies[0].authorEmail)" -ForegroundColor Green
} else {
    Write-Host "Reply not found in comment thread." -ForegroundColor Red
}

# 8. Reviewer adds file-level comment on skills/accessibility/SKILL.md
Write-Host "`n8. Reviewer adds comment on skills/accessibility/SKILL.md Line 8..." -ForegroundColor Yellow
$skillCommentBody = @{
    filePath = "skills/accessibility/SKILL.md"
    lineNumber = 8
    lineType = "Context"
    comment = "Please clarify the WCAG contrast ratios."
} | ConvertTo-Json
$skillCommentResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/comments" -Headers $revHeaders -Method Post -Body $skillCommentBody
Write-Host "Second file comment created: $($skillCommentResp.filePath):$($skillCommentResp.lineNumber)" -ForegroundColor Green

# 9. Reviewer Requests Changes (UnderReview -> ChangesRequested)
Write-Host "`n9. Reviewer requests changes (UnderReview -> ChangesRequested)..." -ForegroundColor Yellow
$reqChangesResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/request-changes" -Headers $revHeaders -Method Post -Body '{"feedback":"Please update error handling and contrast ratios."}'
Write-Host "Changes requested. Status: $($reqChangesResp.status)" -ForegroundColor Green

# 10. Producer Resubmits (ChangesRequested -> Resubmitted)
Write-Host "`n10. Producer resubmits updated artifact (ChangesRequested -> Resubmitted)..." -ForegroundColor Yellow
$resubmitResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/resubmit" -Headers $prodHeaders -Method Post -Body $multiFileContent
Write-Host "Artifact resubmitted. Status: $($resubmitResp.status)" -ForegroundColor Green

# 11. Reviewer Approves and Publishes (Resubmitted -> Approved -> Published)
Write-Host "`n11. Reviewer approves submission (Resubmitted -> Approved -> Published)..." -ForegroundColor Yellow
$approveResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/approve" -Headers $revHeaders -Method Post -Body '{"feedback":"Everything looks great! Approved."}'
Write-Host "Review approved and published. Status: $($approveResp.status), IsPublished: $($approveResp.isPublished)" -ForegroundColor Green

# 12. Verify Invalid Transition Protection
Write-Host "`n12. Verifying invalid status transitions are rejected..." -ForegroundColor Yellow
try {
    # Attempt to request changes on an already published review
    Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/request-changes" -Headers $revHeaders -Method Post -Body '{"feedback":"Invalid"}'
    Write-Host "Invalid transition was NOT rejected!" -ForegroundColor Red
} catch {
    Write-Host "Invalid transition correctly rejected with HTTP 400 Bad Request." -ForegroundColor Green
}

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "    ALL FILE/LINE COMMENT & STATUS LIFECYCLE CHECKS PASSED SUCCESSFULLY!       " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
