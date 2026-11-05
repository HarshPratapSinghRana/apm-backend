# ==============================================================================
# Engineering Commons - Live SharePoint Telemetry & Usage Log Viewer
# ==============================================================================
# Queries live audit & telemetry logs directly from Microsoft 365 SharePoint List:
# https://testmaq.sharepoint.com/sites/AITeam2
# ==============================================================================

param(
    [string]$Tenant = "maqsoftware.com",
    [string]$Hostname = "testmaq.sharepoint.com",
    [string]$SitePath = "sites/AITeam2",
    [string]$ClientId = "a5f3ba81-4c95-4c74-afd9-38b72cf39156",
    [int]$Top = 50
)

Add-Type -AssemblyName System.Net.Http

# 1. Retrieve or refresh cached Microsoft Entra ID token
$tokenFile = Join-Path $HOME ".engineering-commons\token.json"
$accessToken = $null

if (Test-Path $tokenFile) {
    try {
        $cached = Get-Content $tokenFile -Raw | ConvertFrom-Json
        if ($cached.refresh_token) {
            $refreshBody = @{
                client_id     = $ClientId
                grant_type    = "refresh_token"
                refresh_token = $cached.refresh_token
                scope         = "https://graph.microsoft.com/Sites.ReadWrite.All offline_access openid profile"
            }
            $refreshRes = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$Tenant/oauth2/v2.0/token" -Method Post -Body $refreshBody -ErrorAction Stop
            if ($refreshRes.access_token) {
                $accessToken = $refreshRes.access_token
            }
        } elseif ($cached.access_token) {
            $accessToken = $cached.access_token
        }
    } catch {}
}

if (-not $accessToken) {
    $fallbackSession = Join-Path $HOME ".engineering-commons\session.json"
    if (Test-Path $fallbackSession) {
        try {
            $sess = Get-Content $fallbackSession -Raw | ConvertFrom-Json
            if ($sess.ssoToken) { $accessToken = $sess.ssoToken } else { $accessToken = $sess.token }
        } catch {}
    }
}

if (-not $accessToken) {
    Write-Host "No active session found. Please run 'powershell .\scripts\verify-and-sync-sharepoint.ps1' to login." -ForegroundColor Yellow
    exit 1
}

# 2. Query SharePoint Graph API
$http = New-Object System.Net.Http.HttpClient
$http.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $accessToken)

$cleanPath = $SitePath.Trim('/')
$siteRes = $http.GetAsync("https://graph.microsoft.com/v1.0/sites/$Hostname`:/$cleanPath").GetAwaiter().GetResult()
if (-not $siteRes.IsSuccessStatusCode) {
    Write-Host "Failed to connect to SharePoint site: $($siteRes.StatusCode)" -ForegroundColor Red
    exit 1
}

$siteInfo = $siteRes.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
$siteId = $siteInfo.id

$listsRes = $http.GetAsync("https://graph.microsoft.com/v1.0/sites/$siteId/lists?`$top=100").GetAwaiter().GetResult()
$listsJson = $listsRes.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json

$telemetryList = $null
foreach ($l in $listsJson.value) {
    $clean = [string]$l.displayName.ToLower() -replace '[^a-z0-9]', ''
    if ($clean -eq "engineeringcommonstelemetry" -or $clean -like "*telemetry*") {
        $telemetryList = $l
        break
    }
}

if (-not $telemetryList) {
    Write-Host "SharePoint list 'Engineering-Commons-Telemetry' not found on site." -ForegroundColor Yellow
    Write-Host "Please create it using sharepoint-import-sheets\Engineering-Commons-Telemetry.csv via '+ New -> List -> From CSV'." -ForegroundColor Cyan
    exit 0
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Engineering Commons - Live SharePoint Usage & Audit Logs" -ForegroundColor Cyan
Write-Host "Target: $($telemetryList.displayName) ($($siteInfo.displayName))" -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Cyan

$itemsUrl = "https://graph.microsoft.com/v1.0/sites/$siteId/lists/$($telemetryList.id)/items?`$expand=fields&`$top=$Top"
$itemsRes = $http.GetAsync($itemsUrl).GetAwaiter().GetResult()
if (-not $itemsRes.IsSuccessStatusCode) {
    Write-Host "Failed to query telemetry items: $($itemsRes.StatusCode)" -ForegroundColor Red
    exit 1
}

$itemsJson = $itemsRes.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
$records = @()

foreach ($it in $itemsJson.value) {
    $f = $it.fields
    $records += [PSCustomObject]@{
        Action       = $f.Title
        Artifact     = if ($f.ArtifactName) { $f.ArtifactName } else { $f.ArtifactId }
        Type         = $f.ArtifactType
        Version      = $f.ArtifactVersion
        User         = $f.UserEmail
        Source       = $f.Source
        Platform     = $f.Platform
        Workspace    = $f.Workspace
        Timestamp    = $f.Timestamp
        Metadata     = $f.Metadata
    }
}

if ($records.Count -eq 0) {
    Write-Host "`nNo telemetry logs recorded yet in SharePoint." -ForegroundColor Yellow
} else {
    Write-Host "`nFound $($records.Count) telemetry records in SharePoint:`n" -ForegroundColor Green
    $records | Format-Table Action, Artifact, Type, Version, User, Source, Platform, Workspace, Timestamp -AutoSize
}
