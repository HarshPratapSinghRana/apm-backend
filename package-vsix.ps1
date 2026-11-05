$ErrorActionPreference = "Stop"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "             PACKAGING ENGINEERING COMMONS VS CODE EXTENSION (.VSIX)                    " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$extensionDir = Join-Path $PSScriptRoot "engineering-commons-vscode"
$resourcesBin = Join-Path $extensionDir "resources\bin"
$cliProject = Join-Path $PSScriptRoot "EngineeringCommonsCli\EngineeringCommonsCli.csproj"

# 1. Publish latest self-contained CLI binaries into extension resources/bin
Write-Host ""
Write-Host "1. Publishing Engineering Commons CLI (Self-Contained win-x64) into extension resources/bin..." -ForegroundColor Cyan
if (Test-Path $resourcesBin) {
    Remove-Item -Path $resourcesBin -Recurse -Force
}
New-Item -ItemType Directory -Path $resourcesBin -Force | Out-Null
dotnet publish "$cliProject" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o "$resourcesBin" --nologo -v q
Copy-Item -Path (Join-Path $resourcesBin "EngineeringCommonsCli.exe") -Destination (Join-Path $resourcesBin "engineering-commons.exe") -Force
Copy-Item -Path (Join-Path $resourcesBin "EngineeringCommonsCli.exe") -Destination (Join-Path $resourcesBin "engineering-commons.exe") -Force
Write-Host "[OK] Self-contained CLI compiled and bundled successfully into resources/bin (Zero .NET runtime prerequisites for teammates)." -ForegroundColor Green

# 2. Compile TypeScript and package VSIX inside engineering-commons-vscode directory
Push-Location $extensionDir
try {
    Write-Host ""
    Write-Host "2. Compiling VS Code Extension TypeScript..." -ForegroundColor Cyan
    Get-ChildItem -Path . -Filter "*.vsix" -ErrorAction SilentlyContinue | Remove-Item -Force
    cmd.exe /c "npm run compile"
    Write-Host "[OK] TypeScript compiled successfully." -ForegroundColor Green

    Write-Host ""
    Write-Host "3. Creating .vsix package with vsce..." -ForegroundColor Cyan
    cmd.exe /c "npx -y @vscode/vsce package --no-dependencies --skip-license"
}
finally {
    Pop-Location
}

$vsixFile = Get-ChildItem -Path $extensionDir -Filter "*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($vsixFile) {
    Copy-Item -Path $vsixFile.FullName -Destination (Join-Path $PSScriptRoot $vsixFile.Name) -Force
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host " SUCCESS: VS Code Extension and CLI successfully packaged into .VSIX!            " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "Package file : $($vsixFile.FullName)" -ForegroundColor Cyan
Write-Host "Root copy    : $(Join-Path $PSScriptRoot $vsixFile.Name)" -ForegroundColor Cyan
Write-Host "Package size : $([math]::Round($vsixFile.Length / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Share this single .vsix file with your teammates." -ForegroundColor Yellow
Write-Host "When they install it in VS Code, the CLI is auto-extracted and added to their PATH!" -ForegroundColor Yellow
