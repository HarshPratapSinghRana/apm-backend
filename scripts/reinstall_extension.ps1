$ErrorActionPreference = "Stop"

$vsixSource = Join-Path $PSScriptRoot "..\engineering-commons-vscode\engineering-commons-vscode-1.2.5.vsix"
$vsixRoot = Join-Path $PSScriptRoot "..\engineering-commons-vscode-1.2.5.vsix"

# 1. Copy to root directory
Copy-Item $vsixSource -Destination $vsixRoot -Force
Write-Host "[OK] VSIX copied to root: $vsixRoot" -ForegroundColor Green

# 2. Reinstall via VS Code CLI if available
$codeCmd = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\bin\code.cmd"
try {
    if (Test-Path $codeCmd) {
        Write-Host "Running code.cmd --install-extension..." -ForegroundColor Cyan
        cmd.exe /c "`"$codeCmd`" --uninstall-extension company.engineering-commons-vscode 2>&1" | Out-Null
        cmd.exe /c "`"$codeCmd`" --install-extension `"$vsixRoot`" --force"
        Write-Host "[OK] Installed via code.cmd successfully." -ForegroundColor Green
    } else {
        Write-Host "Running code --install-extension..." -ForegroundColor Cyan
        cmd.exe /c "code --uninstall-extension company.engineering-commons-vscode 2>&1" | Out-Null
        cmd.exe /c "code --install-extension `"$vsixRoot`" --force"
        Write-Host "[OK] Installed via code successfully." -ForegroundColor Green
    }
} catch {
    Write-Host "[Notice] Code CLI: $_" -ForegroundColor Yellow
}

# 3. Direct deployment to ~/.vscode/extensions/company.engineering-commons-vscode-1.2.5
$extBaseDir = Join-Path $env:USERPROFILE ".vscode\extensions"
$targetDir = Join-Path $extBaseDir "company.engineering-commons-vscode-1.2.5"

Write-Host "Deploying directly into VS Code extensions directory: $targetDir..." -ForegroundColor Cyan

# Remove old versions if present
Get-ChildItem -Path $extBaseDir -Filter "company.engineering-commons-vscode*" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.FullName -ne $targetDir) {
        try { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
    }
}

$tempZip = Join-Path ([System.IO.Path]::GetTempPath()) ("cip_ext_" + [Guid]::NewGuid().ToString("N") + ".zip")
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("cip_dir_" + [Guid]::NewGuid().ToString("N"))

Copy-Item $vsixRoot -Destination $tempZip -Force
Expand-Archive -Path $tempZip -DestinationPath $tempDir -Force

if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

Copy-Item -Path (Join-Path $tempDir "extension\*") -Destination $targetDir -Recurse -Force

Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "[OK] Direct deployment complete: $targetDir" -ForegroundColor Green

# 4. Update PATH and verify
$binDir = Join-Path $targetDir "resources\bin"
if (Test-Path $binDir) {
    Write-Host "[OK] Bundled CLI binaries verified at: $binDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host " SUCCESS: Engineering Commons VS Code Extension v1.2.5 Reinstalled!             " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
