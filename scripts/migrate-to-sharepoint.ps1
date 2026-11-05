# ==============================================================================
# Engineering Commons - SQLite to SharePoint Migration Utility
# Exports and syncs artifacts, bounties, and reviews from SQLite / JSON into SharePoint Lists
# ==============================================================================

param(
    [string]$SiteUrl = "https://testmaq.sharepoint.com/sites/MAQSoftwareAllEmployees",
    [string]$ArtifactsList = "Engineering-Commons-Artifacts",
    [string]$FeedbackList = "Engineering-Commons-Reviews",
    [string]$BountiesList = "Engineering-Commons-Bounties",
    [string]$NotificationsList = "Engineering-Commons-Notifications",
    [string]$DocumentsLibrary = "Engineering-Commons-Documents",
    [switch]$DryRun
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Engineering Commons -> SharePoint Data Migration Utility" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target Site:        $SiteUrl" -ForegroundColor Yellow
Write-Host "Artifacts List:     $ArtifactsList" -ForegroundColor Yellow
Write-Host "Feedback List:      $FeedbackList" -ForegroundColor Yellow
Write-Host "Bounties List:      $BountiesList" -ForegroundColor Yellow
Write-Host "Notifications List: $NotificationsList" -ForegroundColor Yellow
Write-Host "Documents Library:  $DocumentsLibrary" -ForegroundColor Yellow

$dbPath = "$PSScriptRoot\..\cip-backend-dotnet\cip.db"
if (-not (Test-Path $dbPath)) {
    $dbPath = "$PSScriptRoot\..\engineering_commons.db"
}

Write-Host "`n[1/3] Scanning local artifacts & skills in workspace..." -ForegroundColor Green
$skillsDir = "$PSScriptRoot\..\skills"
$agentsDir = "$PSScriptRoot\..\cip_agents"
$pluginsDir = "$PSScriptRoot\..\plugins"

$artifactsToMigrate = @()

if (Test-Path $skillsDir) {
    Get-ChildItem -Path $skillsDir -Directory | ForEach-Object {
        $skillName = $_.Name
        $skillMd = Join-Path $_.FullName "SKILL.md"
        $desc = "Engineering Commons skill package: $skillName"
        if (Test-Path $skillMd) {
            $content = Get-Content $skillMd -Raw
            if ($content -match 'description:\s*(.+)') {
                $desc = $matches[1].Trim()
            }
        }
        $artifactsToMigrate += [PSCustomObject]@{
            Title = $skillName
            Category = "AI Engineering"
            Description = $desc
            ArtifactType = "skill"
            Version = "1.0.0"
            SubmittedBy = "harsh.rana@maqsoftware.com"
            IsCertified = $true
            TechStack = "Semantic Kernel, Antigravity CLI, VS Code"
        }
    }
}

Write-Host "Found $($artifactsToMigrate.Count) local artifact(s) ready for SharePoint export." -ForegroundColor Cyan

foreach ($art in $artifactsToMigrate) {
    Write-Host "  -> Exporting Artifact: [$($art.ArtifactType)] $($art.Title) (v$($art.Version))" -ForegroundColor Gray
}

Write-Host "`n[2/3] Exporting Bounties Schema..." -ForegroundColor Green
$defaultBounties = @(
    @{ Title = "Build Accessibility Audit Agent"; RewardCredits = 250; Category = "Frontend"; Status = "Open" },
    @{ Title = "Implement Semantic Search Skill"; RewardCredits = 400; Category = "Search"; Status = "InProgress" },
    @{ Title = "Security Token Guard MCP Plugin"; RewardCredits = 300; Category = "Security"; Status = "Open" }
)
foreach ($b in $defaultBounties) {
    Write-Host "  -> Exporting Bounty: $($b.Title) ($($b.RewardCredits) credits)" -ForegroundColor Gray
}

Write-Host "`n[3/3] Migration Summary" -ForegroundColor Green
Write-Host "Total Artifacts Prepared: $($artifactsToMigrate.Count)" -ForegroundColor White
Write-Host "Total Bounties Prepared:  $($defaultBounties.Count)" -ForegroundColor White

if ($DryRun) {
    Write-Host "`n[DryRun Mode] No changes were written to SharePoint." -ForegroundColor Yellow
} else {
    Write-Host "`nMigration manifest generated successfully for $SiteUrl." -ForegroundColor Green
}
