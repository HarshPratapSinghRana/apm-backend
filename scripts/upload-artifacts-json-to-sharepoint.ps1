<#
.SYNOPSIS
    Uploads all generated AI artifact JSON files to SharePoint Online.
.DESCRIPTION
    Iterates through all JSON packages in 'artifacts-json/' and attaches them
    directly to list items in 'Engineering-Commons-Artifacts' and Document Library.
#>
param(
    [string]$Hostname = "testmaq.sharepoint.com",
    [string]$SitePath = "sites/AITeam2",
    [string]$ListName = "Engineering-Commons-Artifacts",
    [string]$Token = $null
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Engineering Commons - Push Artifact JSONs to SharePoint" -ForegroundColor Cyan
Write-Host "  Site: https://$Hostname/$SitePath" -ForegroundColor Cyan
Write-Host "  List: $ListName" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Step 1: Ensure all JSON files are generated
if (-not (Test-Path "artifacts-json")) {
    Write-Host "`n[1/3] Generating artifact JSON files..." -ForegroundColor Yellow
    python scripts/build_all_artifact_jsons.py
}

$jsonFiles = Get-ChildItem -Path "artifacts-json" -Filter "*.json" | Where-Object { $_.Name -notlike "all-artifacts*" }
if ($jsonFiles.Count -eq 0) {
    Write-Host "`n[1/3] Generating artifact JSON files..." -ForegroundColor Yellow
    python scripts/build_all_artifact_jsons.py
    $jsonFiles = Get-ChildItem -Path "artifacts-json" -Filter "*.json" | Where-Object { $_.Name -notlike "all-artifacts*" }
}

Write-Host "`n[1/3] Found $($jsonFiles.Count) artifact JSON packages in 'artifacts-json/'" -ForegroundColor Green

# 2. Step 2: Run upload via Python engine
Write-Host "`n[2/3] Uploading packages to SharePoint Online..." -ForegroundColor Cyan

$pyScript = "scripts/push_artifacts_json_to_sharepoint.py"
if ($Token) {
    python $pyScript --hostname $Hostname --site-path $SitePath --list-name $ListName --token $Token
} else {
    python $pyScript --hostname $Hostname --site-path $SitePath --list-name $ListName
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[3/3] [SUCCESS] All AI artifact JSON packages are now live on SharePoint!" -ForegroundColor Green
} else {
    Write-Host "`n[NOTICE] If authentication failed, please log in with:" -ForegroundColor Yellow
    Write-Host "  engineering-commons login" -ForegroundColor White
    Write-Host "And re-run this script." -ForegroundColor Yellow
}
