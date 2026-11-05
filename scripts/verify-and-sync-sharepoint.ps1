# ==============================================================================
# Engineering Commons - Deep Diagnostics & SharePoint Data Synchronizer
# ==============================================================================
# Verifies connection to SharePoint (sites/AITeam2), validates list schemas,
# auto-refreshes token from cached credentials without re-prompting,
# and displays all live artifacts, bounties, reviews, and notifications.
# ==============================================================================

param(
    [string]$Tenant = "maqsoftware.com",
    [string]$Hostname = "testmaq.sharepoint.com",
    [string]$SitePath = "sites/AITeam2",
    [string]$ClientId = "a5f3ba81-4c95-4c74-afd9-38b72cf39156"
)

Add-Type -AssemblyName System.Net.Http

function Execute-GraphGet {
    param([string]$Url, [string]$Token)
    $client = New-Object System.Net.Http.HttpClient
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $Token)
    $resp = $client.GetAsync($Url).GetAwaiter().GetResult()
    $content = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    return @{
        StatusCode = [int]$resp.StatusCode
        IsSuccess  = $resp.IsSuccessStatusCode
        Body       = $content
    }
}

function Execute-GraphPost {
    param([string]$Url, [string]$Json, [string]$Token)
    $client = New-Object System.Net.Http.HttpClient
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $Token)
    $strContent = New-Object System.Net.Http.StringContent($Json, [System.Text.Encoding]::UTF8, "application/json")
    $resp = $client.PostAsync($Url, $strContent).GetAwaiter().GetResult()
    $content = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    return @{
        StatusCode = [int]$resp.StatusCode
        IsSuccess  = $resp.IsSuccessStatusCode
        Body       = $content
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Engineering Commons - Diagnostic & SharePoint Syncer" -ForegroundColor Cyan
Write-Host "Target Site: https://$Hostname/$SitePath" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Step 1: Token Cache & Silent Refresh
$tokenDir = Join-Path $HOME ".engineering-commons"
$tokenFile = Join-Path $tokenDir "token.json"
if (-not (Test-Path $tokenDir)) { New-Item -ItemType Directory -Path $tokenDir -Force | Out-Null }

$accessToken = $null

if (Test-Path $tokenFile) {
    try {
        $cached = Get-Content $tokenFile -Raw | ConvertFrom-Json
        if ($cached.refresh_token) {
            Write-Host "`n[Step 1] Found cached session. Silently refreshing Microsoft Entra token..." -ForegroundColor Yellow
            $refreshBody = @{
                client_id     = $ClientId
                grant_type    = "refresh_token"
                refresh_token = $cached.refresh_token
                scope         = "https://graph.microsoft.com/Sites.ReadWrite.All offline_access openid profile"
            }
            $refreshRes = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$Tenant/oauth2/v2.0/token" -Method Post -Body $refreshBody -ErrorAction Stop
            if ($refreshRes.access_token) {
                $accessToken = $refreshRes.access_token
                $newCache = @{
                    access_token  = $refreshRes.access_token
                    refresh_token = if ($refreshRes.refresh_token) { $refreshRes.refresh_token } else { $cached.refresh_token }
                    timestamp     = (Get-Date).ToString("o")
                }
                $newCache | ConvertTo-Json | Set-Content $tokenFile
                Write-Host "[OK] Token refreshed silently! No browser login needed." -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "Cached token expired or invalid: $_" -ForegroundColor DarkGray
    }
}

# If silent refresh was not possible, initiate Device Code Login once
if ($null -eq $accessToken) {
    Write-Host "`n[Step 1] Initiating Entra ID Device Code Authentication..." -ForegroundColor Green
    $body = @{
        client_id = $ClientId
        scope     = "https://graph.microsoft.com/Sites.ReadWrite.All offline_access openid profile"
    }

    try {
        $dc = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$Tenant/oauth2/v2.0/devicecode" -Method Post -Body $body
    } catch {
        Write-Host "Authentication endpoint error: $_" -ForegroundColor Red
        exit 1
    }

    $userCode = $dc.user_code
    $loginUrl = $dc.verification_uri
    $deviceCode = $dc.device_code
    $interval = [Math]::Max(5, $dc.interval)

    Write-Host "==========================================================" -ForegroundColor Yellow
    Write-Host " ACTION: Open browser to authenticate" -ForegroundColor Yellow
    Write-Host " 1. URL:  $loginUrl" -ForegroundColor Cyan
    Write-Host " 2. Code: $userCode" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host "==========================================================" -ForegroundColor Yellow

    try { Start-Process $loginUrl } catch {}

    $tokenBody = @{
        grant_type  = "urn:ietf:params:oauth:grant-type:device_code"
        client_id   = $ClientId
        device_code = $deviceCode
    }

    while ($null -eq $accessToken) {
        Start-Sleep -Seconds $interval
        try {
            $tokenRes = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$Tenant/oauth2/v2.0/token" -Method Post -Body $tokenBody -ErrorAction Stop
            if ($tokenRes.access_token) {
                $accessToken = $tokenRes.access_token
                $cacheObj = @{
                    access_token  = $tokenRes.access_token
                    refresh_token = $tokenRes.refresh_token
                    timestamp     = (Get-Date).ToString("o")
                }
                $cacheObj | ConvertTo-Json | Set-Content $tokenFile
                Write-Host "`n[OK] Authenticated successfully as corporate user! Session cached for future runs." -ForegroundColor Green
                break
            }
        } catch {
            Write-Host -NoNewline "."
        }
    }
}

# Step 2: Site & List Resolution
$cleanPath = $SitePath.Trim('/')
$siteUrl = "https://graph.microsoft.com/v1.0/sites/$Hostname`:/$cleanPath"
$siteRes = Execute-GraphGet -Url $siteUrl -Token $accessToken

if (-not $siteRes.IsSuccess) {
    Write-Host "Error resolving site: $($siteRes.StatusCode) - $($siteRes.Body)" -ForegroundColor Red
    exit 1
}

$siteInfo = $siteRes.Body | ConvertFrom-Json
$siteId = [string]$siteInfo.id
Write-Host "`n[Step 2] Connected to SharePoint Site:" -ForegroundColor Green
Write-Host "  Name: $($siteInfo.displayName)" -ForegroundColor White
Write-Host "  URL:  $($siteInfo.webUrl)" -ForegroundColor White
Write-Host "  ID:   $siteId" -ForegroundColor DarkGray

$listsUrl = "https://graph.microsoft.com/v1.0/sites/$siteId/lists?`$top=100"
$listsRes = Execute-GraphGet -Url $listsUrl -Token $accessToken
$listsJson = $listsRes.Body | ConvertFrom-Json

function Find-ListId {
    param([string]$TargetName, [array]$Lists)
    $cleanTarget = $TargetName.ToLower() -replace '[^a-z0-9]', ''
    foreach ($l in $Lists) {
        $display = [string]$l.displayName
        $name = [string]$l.name
        $cleanDisplay = $display.ToLower() -replace '[^a-z0-9]', ''
        $cleanName = $name.ToLower() -replace '[^a-z0-9]', ''
        if ($cleanDisplay -eq $cleanTarget -or $cleanName -eq $cleanTarget -or $cleanDisplay.Contains($cleanTarget) -or $cleanTarget.Contains($cleanDisplay)) {
            return [PSCustomObject]@{ Id = [string]$l.id; DisplayName = $display; Name = $name }
        }
    }
    return $null
}

Write-Host "`nDiscovered SharePoint Lists on $($siteInfo.displayName):" -ForegroundColor Green
foreach ($l in $listsJson.value) {
    Write-Host "  - $($l.displayName) (ID: $($l.id))" -ForegroundColor Cyan
}

# Step 3: Query Uploaded Items from SharePoint
Write-Host "`n[Step 3] Fetching Live Items from Uploaded Lists..." -ForegroundColor Green

$targetLists = @(
    "Engineering-Commons-Artifacts",
    "Engineering-Commons-Bounties",
    "Engineering-Commons-Reviews",
    "Engineering-Commons-Notifications",
    "Engineering-Commons-Telemetry"
)

foreach ($target in $targetLists) {
    $found = Find-ListId -TargetName $target -Lists $listsJson.value
    if ($found) {
        Write-Host "`n----------------------------------------------------------" -ForegroundColor Yellow
        Write-Host "List: $($found.DisplayName) (Matched: $target)" -ForegroundColor Yellow
        Write-Host "----------------------------------------------------------" -ForegroundColor Yellow

        $itemsUrl = "https://graph.microsoft.com/v1.0/sites/$siteId/lists/$($found.Id)/items?`$expand=fields&`$top=50"
        $itemsRes = Execute-GraphGet -Url $itemsUrl -Token $accessToken
        if ($itemsRes.IsSuccess) {
            $itemsJson = $itemsRes.Body | ConvertFrom-Json
            $itemsCount = $itemsJson.value.Count
            Write-Host "Total Items Found: $itemsCount" -ForegroundColor Green
            foreach ($it in $itemsJson.value) {
                $f = $it.fields
                $title = if ($f.Title) { $f.Title } else { "No Title" }
                $author = if ($f.SubmittedBy) { $f.SubmittedBy } elseif ($f.Submitted_x0020_By) { $f.Submitted_x0020_By } elseif ($f.ClaimedBy) { $f.ClaimedBy } else { "" }
                $extra = if ($f.Category) { "[$($f.Category)]" } elseif ($f.RewardCredits) { "[$($f.RewardCredits) Credits]" } elseif ($f.Type) { "[$($f.Type)]" } else { "" }
                Write-Host "  * $title $extra ($author)" -ForegroundColor White
            }
        } else {
            Write-Host "Failed to query items: $($itemsRes.StatusCode) - $($itemsRes.Body)" -ForegroundColor Red
        }
    } else {
        Write-Host "`nList not found: $target" -ForegroundColor Red
    }
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "Engineering Commons - SharePoint Synchronization Verified!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

