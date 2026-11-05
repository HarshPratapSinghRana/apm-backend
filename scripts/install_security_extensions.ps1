$ErrorActionPreference = "Continue"

$codePath = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\bin\code.cmd"
if (Test-Path $codePath) {
    Write-Host "Installing VS Code Extensions..." -ForegroundColor Cyan
    & $codePath --install-extension SonarSource.sonarlint-vscode --force
    & $codePath --install-extension snyk-security.snyk-vulnerability-scanner --force
    Write-Host "[OK] VS Code Extensions installed." -ForegroundColor Green
} else {
    Write-Host "VS Code binary not found at $codePath" -ForegroundColor Yellow
}
