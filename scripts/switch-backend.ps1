[CmdletBinding()]
param(
    [string]$Url = "https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io"
)

$targetUrl = $Url.Trim().TrimEnd('/')
Write-Host "[Backend] Selected Hosting: Azure Container Apps ($targetUrl)" -ForegroundColor Cyan

# 1. Test Health of Target Backend
Write-Host "[Health] Testing endpoint: $targetUrl/api/health ..." -NoNewline
try {
    $healthCheck = Invoke-RestMethod -Uri "$targetUrl/api/health" -Method Get -TimeoutSec 8 -ErrorAction Stop
    Write-Host " [200 OK]" -ForegroundColor Green
    Write-Host "         Service: $($healthCheck.service) | Status: $($healthCheck.status)" -ForegroundColor DarkGray
} catch {
    Write-Host " [WARNING]" -ForegroundColor Yellow
    Write-Host "Note: Target endpoint $targetUrl /api/health returned: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 2. Persist to Global CLI / Extension Config (~/.engineering-commons/config.json)
$homeDir = [Environment]::GetFolderPath("UserProfile")
$cfgDir = Join-Path $homeDir ".engineering-commons"
if (-not (Test-Path $cfgDir)) {
    New-Item -ItemType Directory -Path $cfgDir -Force | Out-Null
}

$cfgPath = Join-Path $cfgDir "config.json"
$config = @{
    backendUrl = $targetUrl
    provider = "azure"
    updatedAt = (Get-Date).ToString("o")
}
$config | ConvertTo-Json -Depth 5 | Set-Content -Path $cfgPath -Encoding UTF8

# 3. Synchronize with VS Code User Settings if present
$vscodeSettingsPath = Join-Path $env:APPDATA "Code\User\settings.json"
if (Test-Path $vscodeSettingsPath) {
    try {
        $settingsRaw = Get-Content $vscodeSettingsPath -Raw
        $settingsObj = $settingsRaw | ConvertFrom-Json
        $settingsObj | Add-Member -MemberType NoteProperty -Name "engineeringCommons.backendUrl" -Value $targetUrl -Force
        $settingsObj | ConvertTo-Json -Depth 10 | Set-Content -Path $vscodeSettingsPath -Encoding UTF8
        Write-Host "[VS Code] Synchronized engineeringCommons.backendUrl in User settings.json" -ForegroundColor DarkGray
    } catch {
        Write-Host "[VS Code] Note: Could not update VS Code settings.json automatically: $($_.Exception.Message)" -ForegroundColor DarkGray
    }
}

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  Successfully Configured Active Azure Backend!            " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Active Backend  : $targetUrl" -ForegroundColor Cyan
Write-Host "  Provider Mode   : AZURE CONTAINER APPS" -ForegroundColor Cyan
Write-Host "  Config Saved To : $cfgPath" -ForegroundColor DarkGray
Write-Host "============================================================`n" -ForegroundColor Green
Write-Host "Tip: In VS Code, run 'Reload Window' to reload the active backend connection." -ForegroundColor Yellow

