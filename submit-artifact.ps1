# ============================================
# Generic Artifact Submission Script
# Submits any .md file to CIP Marketplace
# ============================================

param(
    [Parameter(ValueFromPipeline=$true, Position=0)]
    [string]$FilePath = "",
    
    [Parameter(Position=1)]
    [string]$ArtifactId = "",
    
    [switch]$AutoApprove = $false,
    [string]$BackendUrl = "http://localhost:5000"
)

function Main {
    # Validate backend is running
    Write-Host "🔍 Checking backend health..." -ForegroundColor Cyan
    try {
        $health = Invoke-RestMethod -Uri "$BackendUrl/" -ErrorAction Stop
        Write-Host "✓ Backend is running`n" -ForegroundColor Green
    } catch {
        Write-Host "❌ Backend not running at $BackendUrl" -ForegroundColor Red
        Write-Host "   Start backend: cd cip-backend-dotnet && `$env:ASPNETCORE_ENVIRONMENT='Development'; dotnet run`n"
        return 1
    }

    # Get file path if not provided
    if ([string]::IsNullOrEmpty($FilePath)) {
        $FilePath = Read-Host "📄 Enter .md file path"
    }

    # Resolve full path
    $FilePath = Resolve-Path $FilePath -ErrorAction Stop

    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ File not found: $FilePath" -ForegroundColor Red
        return 1
    }

    # Generate artifact ID from filename if not provided
    if ([string]::IsNullOrEmpty($ArtifactId)) {
        $ArtifactId = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    }

    Write-Host "📋 Artifact Details:" -ForegroundColor Cyan
    Write-Host "  File: $FilePath"
    Write-Host "  Artifact ID: $ArtifactId"
    Write-Host "  File Size: $((Get-Item $FilePath).Length) bytes`n"

    # Read artifact content
    Write-Host "📖 Reading artifact content..." -ForegroundColor Yellow
    $artifactContent = Get-Content -Path $FilePath -Raw
    Write-Host "✓ Content loaded`n"

    # ===== PRODUCER: Login & Submit =====
    Write-Host "👤 PRODUCER: Logging in..." -ForegroundColor Magenta
    try {
        $login = Invoke-RestMethod -Method Post -Uri "$BackendUrl/api/auth/login" `
            -Body (@{ email='producer@test.com'; password='Producer@123' } | ConvertTo-Json) `
            -ContentType 'application/json' -ErrorAction Stop
        $token = $login.token
        $headers = @{ Authorization = "Bearer $token" }
        Write-Host "✓ Logged in as producer@test.com`n"
    } catch {
        Write-Host "❌ Login failed: $_" -ForegroundColor Red
        return 1
    }

    # Submit artifact
    Write-Host "📤 Submitting artifact..." -ForegroundColor Magenta
    try {
        $body = @{ Content = $artifactContent } | ConvertTo-Json
        $submitResp = Invoke-RestMethod -Method Post `
            -Uri "$BackendUrl/api/artifacts/$ArtifactId/changes" `
            -Headers $headers -Body $body -ContentType 'application/json' `
            -ErrorAction Stop
        $reviewId = $submitResp.id
        Write-Host "✓ Submitted!" -ForegroundColor Green
        Write-Host "  Review ID: $reviewId"
        Write-Host "  Status: $($submitResp.status)"
        Write-Host "  Artifact: $($submitResp.artifactId)`n"
    } catch {
        Write-Host "❌ Submission failed: $_" -ForegroundColor Red
        return 1
    }

    # Optional: Auto-approve
    if ($AutoApprove) {
        Write-Host "✅ REVIEWER: Auto-approving artifact..." -ForegroundColor Green
        try {
            $reviewLogin = Invoke-RestMethod -Method Post -Uri "$BackendUrl/api/auth/login" `
                -Body (@{ email='reviewer@test.com'; password='Reviewer@123' } | ConvertTo-Json) `
                -ContentType 'application/json' -ErrorAction Stop
            $reviewToken = $reviewLogin.token
            $headersR = @{ Authorization = "Bearer $reviewToken" }
            Write-Host "✓ Reviewer logged in`n"

            $approveResp = Invoke-RestMethod -Method Post `
                -Uri "$BackendUrl/api/reviews/$reviewId/approve" `
                -Headers $headersR -ErrorAction Stop
            Write-Host "✓ Artifact approved!" -ForegroundColor Green
            Write-Host "  Status: $($approveResp.status)"
            Write-Host "  Published to GitHub: artifacts/$ArtifactId.md`n"
        } catch {
            Write-Host "⚠️  Auto-approve failed: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "📋 NEXT STEPS (Manual Approval):" -ForegroundColor Yellow
        Write-Host "  1. Reviewer logs in as: reviewer@test.com / Reviewer@123"
        Write-Host "  2. Get pending reviews: GET /api/reviews/pending"
        Write-Host "  3. Approve: POST /api/reviews/$reviewId/approve`n"
    }

    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Artifact '$ArtifactId' submitted to marketplace`n"
    return 0
}

# Run main
Main
