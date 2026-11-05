$ErrorActionPreference = "Continue"

$vsix = Get-ChildItem -Path "engineering-commons-vscode" -Filter "engineering-commons-vscode-1.2.0.vsix" | Select-Object -First 1
if (-not $vsix) {
    Write-Error "VSIX file not found."
    exit 1
}

$homeDir = [System.Environment]::GetFolderPath('UserProfile')
$extBaseDir = Join-Path $homeDir ".vscode\extensions"

# 1. Install via VS Code CLI if available
$codeCmd = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\bin\code.cmd"
if (Test-Path $codeCmd) {
    Write-Host "Installing via code.cmd..." -ForegroundColor Cyan
    & $codeCmd --install-extension $vsix.FullName --force
} else {
    Write-Host "Installing via code CLI..." -ForegroundColor Cyan
    code --install-extension $vsix.FullName --force
}

# 2. Extract directly to extensions directory
$tempExtract = Join-Path ([System.IO.Path]::GetTempPath()) ("cip_ext_" + [Guid]::NewGuid().ToString("N"))
$tempZip = $tempExtract + ".zip"
Copy-Item -Path $vsix.FullName -Destination $tempZip -Force
Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force
$extTarget = Join-Path $extBaseDir "company.engineering-commons-vscode-1.2.0"
if (-not (Test-Path $extTarget)) {
    New-Item -ItemType Directory -Path $extTarget -Force | Out-Null
}
Copy-Item -Path (Join-Path $tempExtract "extension\*") -Destination $extTarget -Recurse -Force
Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "EXTENSION_INSTALLED_SUCCESSFULLY" -ForegroundColor Green
