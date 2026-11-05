# Set Vercel backend URL in CLI and VS Code global configuration
$homeDir = [Environment]::GetFolderPath("UserProfile")
$cfgDir = Join-Path $homeDir ".engineering-commons"
if (-not (Test-Path $cfgDir)) {
    New-Item -ItemType Directory -Path $cfgDir -Force | Out-Null
}

$cfgPath = Join-Path $cfgDir "config.json"
$config = @{
    backendUrl = "https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io"
}
$config | ConvertTo-Json | Set-Content -Path $cfgPath -Encoding UTF8

Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Successfully linked Extension and CLI to Vercel Backend!  " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Config File : $cfgPath" -ForegroundColor Cyan
Write-Host "  Backend URL : https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
