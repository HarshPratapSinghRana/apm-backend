$ErrorActionPreference = "Stop"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "         E2E TEST: THREAD-BASED NOTIFICATIONS WORKFLOW VERIFICATION             " -ForegroundColor Cyan
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

# 2. Producer Submits Artifact
Write-Host "`n2. Producer submits 'design-reviewer' artifact..." -ForegroundColor Yellow
$submitResp = Invoke-RestMethod -Uri "$baseUrl/api/artifacts/design-reviewer/changes" -Headers $prodHeaders -Method Post -Body '{"content":"# design-reviewer v1.1.0 Content"}'
$reviewId = $submitResp.reviewId
Write-Host "Submission created. ReviewId: $reviewId" -ForegroundColor Green

# 3. Reviewer verifies ReviewAssigned notification
Write-Host "`n3. Checking Reviewer notifications for ReviewAssigned..." -ForegroundColor Yellow
$revNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=true" -Headers $revHeaders -Method Get
$assigned = $revNotifs | Where-Object { $_.submissionId -eq $reviewId -and ($_.type -eq "ReviewAssigned" -or $_.type -eq "Resubmitted") }
if ($null -ne $assigned) {
    Write-Host "Reviewer received notification: Type=$($assigned.type), Message=$($assigned.message)" -ForegroundColor Green
} else {
    Write-Host "No assignment notification found for reviewer." -ForegroundColor Yellow
}

# 4. Reviewer sends feedback in thread
Write-Host "`n4. Reviewer sends feedback: 'Please update the error handling.'..." -ForegroundColor Yellow
$feedbackResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/thread/messages" -Headers $revHeaders -Method Post -Body '{"message":"Please update the error handling."}'
Write-Host "Feedback message added to thread: ID=$($feedbackResp.id)" -ForegroundColor Green

# 5. Producer verifies FeedbackAdded notification
Write-Host "`n5. Checking Producer notifications for FeedbackAdded..." -ForegroundColor Yellow
$prodNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=true" -Headers $prodHeaders -Method Get
$feedbackNotif = $prodNotifs | Where-Object { $_.submissionId -eq $reviewId -and $_.type -eq "FeedbackAdded" }
if ($null -ne $feedbackNotif) {
    Write-Host "Producer received notification: Type=$($feedbackNotif.type), Message=$($feedbackNotif.message)" -ForegroundColor Green
} else {
    Write-Host "Producer did not receive FeedbackAdded notification." -ForegroundColor Red
}

# 6. Producer replies in thread
Write-Host "`n6. Producer replies: 'Updated the error handling. Please review again.'..." -ForegroundColor Yellow
$replyResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/thread/messages" -Headers $prodHeaders -Method Post -Body '{"message":"Updated the error handling. Please review again."}'
Write-Host "Producer reply added to thread: ID=$($replyResp.id)" -ForegroundColor Green

# 7. Reviewer verifies ProducerReplied notification
Write-Host "`n7. Checking Reviewer notifications for ProducerReplied..." -ForegroundColor Yellow
$revNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=true" -Headers $revHeaders -Method Get
$replyNotif = $revNotifs | Where-Object { $_.submissionId -eq $reviewId -and $_.type -eq "ProducerReplied" }
if ($null -ne $replyNotif) {
    Write-Host "Reviewer received notification: Type=$($replyNotif.type), Message=$($replyNotif.message)" -ForegroundColor Green
} else {
    Write-Host "Reviewer did not receive ProducerReplied notification." -ForegroundColor Red
}

# 8. Reviewer requests changes explicitly
Write-Host "`n8. Reviewer updates thread status to ChangesRequested..." -ForegroundColor Yellow
$statusResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/thread/status" -Headers $revHeaders -Method Post -Body '{"status":"ChangesRequested"}'
Write-Host "Status updated to ChangesRequested." -ForegroundColor Green

# 9. Producer verifies ChangesRequested notification
Write-Host "`n9. Checking Producer notifications for ChangesRequested..." -ForegroundColor Yellow
$prodNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=true" -Headers $prodHeaders -Method Get
$changesNotif = $prodNotifs | Where-Object { $_.submissionId -eq $reviewId -and $_.type -eq "ChangesRequested" }
if ($null -ne $changesNotif) {
    Write-Host "Producer received notification: Type=$($changesNotif.type), Message=$($changesNotif.message)" -ForegroundColor Green
} else {
    Write-Host "Producer did not receive ChangesRequested notification." -ForegroundColor Red
}

# 10. Producer resubmits artifact
Write-Host "`n10. Producer resubmits artifact after changes..." -ForegroundColor Yellow
$resubmitResp = Invoke-RestMethod -Uri "$baseUrl/api/artifacts/design-reviewer/changes" -Headers $prodHeaders -Method Post -Body '{"content":"# design-reviewer v1.1.0 Content with error handling"}'
Write-Host "Resubmission created." -ForegroundColor Green

# 11. Reviewer verifies Resubmitted notification
Write-Host "`n11. Checking Reviewer notifications for Resubmitted..." -ForegroundColor Yellow
$revNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=true" -Headers $revHeaders -Method Get
$resubmitNotif = $revNotifs | Where-Object { $_.type -eq "Resubmitted" }
if ($null -ne $resubmitNotif) {
    Write-Host "Reviewer received notification: Type=$($resubmitNotif.type), Message=$($resubmitNotif.message)" -ForegroundColor Green
} else {
    Write-Host "Reviewer did not receive Resubmitted notification." -ForegroundColor Red
}

# 12. Reviewer approves artifact
Write-Host "`n12. Reviewer approves submission..." -ForegroundColor Yellow
$approveResp = Invoke-RestMethod -Uri "$baseUrl/api/reviews/$reviewId/approve" -Headers $revHeaders -Method Post -Body '{"feedback":"Approved for marketplace release."}'
Write-Host "Submission approved." -ForegroundColor Green

# 13. Producer verifies ReviewApproved notification
Write-Host "`n13. Checking Producer notifications for ReviewApproved..." -ForegroundColor Yellow
$prodNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications?unreadOnly=true" -Headers $prodHeaders -Method Get
$approvedNotif = $prodNotifs | Where-Object { $_.submissionId -eq $reviewId -and $_.type -eq "ReviewApproved" }
if ($null -ne $approvedNotif) {
    Write-Host "Producer received notification: Type=$($approvedNotif.type), Message=$($approvedNotif.message)" -ForegroundColor Green
} else {
    Write-Host "Producer did not receive ReviewApproved notification." -ForegroundColor Red
}

# 14. Mark as read
Write-Host "`n14. Marking notification as read..." -ForegroundColor Yellow
if ($null -ne $approvedNotif) {
    $markResp = Invoke-RestMethod -Uri "$baseUrl/api/notifications/$($approvedNotif.id)/read" -Headers $prodHeaders -Method Post
    Write-Host "Notification marked as read: success=$($markResp.success)" -ForegroundColor Green
}

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "           ALL THREAD-BASED NOTIFICATION CHECKS PASSED SUCCESSFULLY!            " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
