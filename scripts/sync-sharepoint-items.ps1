# ==============================================================================
# Engineering Commons - Resilient SharePoint Data Syncer (.NET HttpClient)
# ==============================================================================
# Target: https://testmaq.sharepoint.com/sites/AITeam2
# Caches Microsoft Entra ID token in ~/.engineering-commons/token.json
# with silent auto-refresh so you NEVER need to log in repeatedly!
# ==============================================================================

param(
    [string]$Tenant = "maqsoftware.com",
    [string]$Hostname = "testmaq.sharepoint.com",
    [string]$SitePath = "sites/AITeam2",
    [string]$ClientId = "a5f3ba81-4c95-4c74-afd9-38b72cf39156"
)

Add-Type -AssemblyName System.Net.Http

function Send-GraphGet {
    param([string]$Url, [string]$Token)
    $http = New-Object System.Net.Http.HttpClient
    $http.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $Token)
    $response = $http.GetAsync($Url).GetAwaiter().GetResult()
    $responseString = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    return [PSCustomObject]@{
        StatusCode = [int]$response.StatusCode
        IsSuccess = $response.IsSuccessStatusCode
        Body = $responseString
    }
}

function Send-GraphPost {
    param([string]$Url, [string]$JsonBody, [string]$Token)
    $http = New-Object System.Net.Http.HttpClient
    $http.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $Token)
    $content = New-Object System.Net.Http.StringContent($JsonBody, [System.Text.Encoding]::UTF8, "application/json")
    $response = $http.PostAsync($Url, $content).GetAwaiter().GetResult()
    $responseString = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    return [PSCustomObject]@{
        StatusCode = [int]$response.StatusCode
        IsSuccess = $response.IsSuccessStatusCode
        Body = $responseString
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Engineering Commons - SharePoint Data Syncer" -ForegroundColor Cyan
Write-Host "Target Site: https://$Hostname/$SitePath" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# STEP 1: Cached Session & Silent Token Refresh
# -----------------------------------------------------------------------------
$tokenDir = Join-Path $HOME ".engineering-commons"
$tokenFile = Join-Path $tokenDir "token.json"
if (-not (Test-Path $tokenDir)) { New-Item -ItemType Directory -Path $tokenDir -Force | Out-Null }

$accessToken = $null

if (Test-Path $tokenFile) {
    try {
        $cached = Get-Content $tokenFile -Raw | ConvertFrom-Json
        if ($cached.refresh_token) {
            Write-Host "`n[1/3] Found cached login session. Silently refreshing token..." -ForegroundColor Yellow
            $refreshBody = @{
                client_id = $ClientId
                grant_type = "refresh_token"
                refresh_token = $cached.refresh_token
                scope = "https://graph.microsoft.com/Sites.ReadWrite.All offline_access openid profile"
            }
            $refreshRes = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$Tenant/oauth2/v2.0/token" -Method Post -Body $refreshBody -ErrorAction Stop
            if ($refreshRes.access_token) {
                $accessToken = $refreshRes.access_token
                $newCache = @{
                    access_token = $refreshRes.access_token
                    refresh_token = if ($refreshRes.refresh_token) { $refreshRes.refresh_token } else { $cached.refresh_token }
                    timestamp = (Get-Date).ToString("o")
                }
                $newCache | ConvertTo-Json | Set-Content $tokenFile
                Write-Host "[OK] Token refreshed silently! No browser login needed." -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "Cached session expired or invalid. Initiating new login..." -ForegroundColor DarkGray
    }
}

if ($null -eq $accessToken) {
    Write-Host "`n[1/3] Authenticating with Microsoft Entra ID..." -ForegroundColor Green
    $deviceCodeBody = @{
        client_id = $ClientId
        scope = "https://graph.microsoft.com/Sites.ReadWrite.All offline_access openid profile"
    }

    try {
        $deviceCodeRes = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$Tenant/oauth2/v2.0/devicecode" -Method Post -Body $deviceCodeBody
    } catch {
        Write-Host "Login error: $($_.ToString())" -ForegroundColor Red
        exit 1
    }

    $userCode = $deviceCodeRes.user_code
    $loginUrl = $deviceCodeRes.verification_uri
    $deviceCode = $deviceCodeRes.device_code
    $interval = [Math]::Max(5, $deviceCodeRes.interval)

    Write-Host "==========================================================" -ForegroundColor Yellow
    Write-Host " ACTION REQUIRED: Sign in to your corporate account" -ForegroundColor Yellow
    Write-Host " 1. Open URL:  $loginUrl" -ForegroundColor Cyan
    Write-Host " 2. Enter Code: $userCode" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host "==========================================================" -ForegroundColor Yellow

    try { Start-Process $loginUrl } catch {}

    $tokenBody = @{
        grant_type = "urn:ietf:params:oauth:grant-type:device_code"
        client_id = $ClientId
        device_code = $deviceCode
    }

    while ($null -eq $accessToken) {
        Start-Sleep -Seconds $interval
        try {
            $tokenRes = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$Tenant/oauth2/v2.0/token" -Method Post -Body $tokenBody -ErrorAction Stop
            if ($tokenRes.access_token) {
                $accessToken = $tokenRes.access_token
                $cacheObj = @{
                    access_token = $tokenRes.access_token
                    refresh_token = $tokenRes.refresh_token
                    timestamp = (Get-Date).ToString("o")
                }
                $cacheObj | ConvertTo-Json | Set-Content $tokenFile
                Write-Host "`nSuccessfully authenticated as corporate user! Session cached." -ForegroundColor Green
                break
            }
        } catch {
            Write-Host -NoNewline "."
        }
    }
}

# -----------------------------------------------------------------------------
# STEP 2: Resolve Site & Lists via .NET HttpClient
# -----------------------------------------------------------------------------
$cleanPath = $SitePath.Trim('/')
$siteInfoUrl = "https://graph.microsoft.com/v1.0/sites/$Hostname`:/$cleanPath"
$siteRes = Send-GraphGet -Url $siteInfoUrl -Token $accessToken

if (-not $siteRes.IsSuccess) {
    Write-Host "Failed to resolve site: $($siteRes.Body)" -ForegroundColor Red
    exit 1
}

$siteInfo = $siteRes.Body | ConvertFrom-Json
$siteId = [string]$siteInfo.id
Write-Host "`n[2/3] Connected to Site: $($siteInfo.displayName)" -ForegroundColor Cyan

$listsUrl = "https://graph.microsoft.com/v1.0/sites/$siteId/lists?`$top=100"
$listsRes = Send-GraphGet -Url $listsUrl -Token $accessToken
$listsJson = $listsRes.Body | ConvertFrom-Json

Write-Host "`nDiscovered Engineering Commons Lists on Site:" -ForegroundColor Green
foreach ($l in $listsJson.value) {
    Write-Host "  - $($l.displayName) (List ID: $($l.id))" -ForegroundColor Cyan
}

Write-Host "`n[3/3] SharePoint Connection Verified!" -ForegroundColor Green
