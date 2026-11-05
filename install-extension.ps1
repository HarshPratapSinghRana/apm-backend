$ErrorActionPreference = "Stop"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "       BUILDING & INSTALLING ENGINEERING COMMONS VS CODE EXTENSION + GLOBAL CLI         " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# 1. Build and bundle Engineering Commons CLI into extension resources/bin (Self-Contained win-x64)
$resourcesBin = Join-Path $PSScriptRoot "engineering-commons-vscode\resources\bin"
Write-Host "`n1. Building & Bundling Self-Contained Engineering Commons CLI into extension package..." -ForegroundColor Cyan
if (Test-Path $resourcesBin) {
    Remove-Item -Path $resourcesBin -Recurse -Force
}
New-Item -ItemType Directory -Path $resourcesBin -Force | Out-Null

$cliProj = Join-Path $PSScriptRoot "EngineeringCommonsCli\EngineeringCommonsCli.csproj"
dotnet publish "$cliProj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o "$resourcesBin" --nologo -v q
Copy-Item -Path (Join-Path $resourcesBin "EngineeringCommonsCli.exe") -Destination (Join-Path $resourcesBin "engineering-commons.exe") -Force
Write-Host "[OK] Self-contained CLI compiled and bundled into extension resources/bin successfully." -ForegroundColor Green

# 2. Compile and Package VS Code Extension
Write-Host "`n2. Compiling & Packaging Engineering Commons VS Code Extension..." -ForegroundColor Cyan
Set-Location -Path (Join-Path $PSScriptRoot "engineering-commons-vscode")
Get-ChildItem -Path . -Filter "*.vsix" -ErrorAction SilentlyContinue | Remove-Item -Force
cmd.exe /c "npm run compile"
cmd.exe /c "npx -y @vscode/vsce package --no-dependencies --skip-license"
Write-Host "[OK] Extension compiled & packaged successfully." -ForegroundColor Green

# 3. Deploy extension into VS Code extensions directory
$homeDir = [System.Environment]::GetFolderPath('UserProfile')
$extBaseDir = Join-Path $homeDir ".vscode\extensions"

# Install from latest VSIX
$vsixFile = Get-ChildItem -Path (Join-Path $PSScriptRoot "engineering-commons-vscode") -Filter "*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($vsixFile) {
    Copy-Item -Path $vsixFile.FullName -Destination (Join-Path $PSScriptRoot $vsixFile.Name) -Force
    try {
        $codeCmd = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\bin\code.cmd"
        Write-Host "Reinstalling extension in VS Code via CLI: code --install-extension $($vsixFile.Name)..." -ForegroundColor Cyan
        if (Test-Path $codeCmd) {
            cmd.exe /c call "`"$codeCmd`"" --uninstall-extension company.engineering-commons-vscode 2>&1 | Out-Null
            cmd.exe /c call "`"$codeCmd`"" --install-extension "`"$($vsixFile.FullName)`"" --force
        } else {
            code --uninstall-extension company.engineering-commons-vscode 2>&1 | Out-Null
            code --install-extension "$($vsixFile.FullName)" --force
        }
        Write-Host "[OK] Extension registered in VS Code successfully from $($vsixFile.Name)." -ForegroundColor Green
    } catch {
        Write-Host "[Notice] Could not run code --install-extension: $_" -ForegroundColor Yellow
    }

    # Extract directly into ~/.vscode/extensions to guarantee immediate availability
    try {
        $tempExtract = Join-Path ([System.IO.Path]::GetTempPath()) ("cip_ext_" + [Guid]::NewGuid().ToString("N"))
        $tempZip = $tempExtract + ".zip"
        Copy-Item -Path $vsixFile.FullName -Destination $tempZip -Force
        Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force
        $versionTag = $vsixFile.BaseName.Replace("engineering-commons-vscode-", "")
        $extTarget = Join-Path $extBaseDir "company.engineering-commons-vscode-$versionTag"
        if (Test-Path (Join-Path $tempExtract "extension")) {
            if (!(Test-Path $extTarget)) { New-Item -ItemType Directory -Path $extTarget -Force | Out-Null }
            Copy-Item -Path (Join-Path $tempExtract "extension\*") -Destination $extTarget -Recurse -Force
            Write-Host "[OK] Deployed directly into extensions folder: $extTarget" -ForegroundColor Green
        }
        Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "[Notice] Direct extraction fallback: $_" -ForegroundColor Yellow
    }
}

# 4. Auto-provision global CLI into ~/.cip/bin and persistent User PATH
Write-Host "`n4. Configuring Global CLI in User PATH (~/.cip/bin)..." -ForegroundColor Cyan
$globalCipBin = Join-Path $homeDir ".cip\bin"
if (!(Test-Path $globalCipBin)) {
    New-Item -ItemType Directory -Path $globalCipBin -Force | Out-Null
}

Copy-Item -Path "$resourcesBin\*" -Destination $globalCipBin -Recurse -Force

# Remove legacy engineering-commons.ps1 to prevent ExecutionPolicy errors
$ps1File = Join-Path $globalCipBin "engineering-commons.ps1"
if (Test-Path $ps1File) { Remove-Item -Path $ps1File -Force }

# Create native engineering-commons.exe binary and engineering-commons.cmd fallback
Copy-Item -Path (Join-Path $resourcesBin "EngineeringCommonsCli.exe") -Destination (Join-Path $globalCipBin "engineering-commons.exe") -Force
$cmdContent = "@echo off`r`n`"%~dp0EngineeringCommonsCli.exe`" %*`r`n"
Set-Content -Path (Join-Path $globalCipBin "engineering-commons.cmd") -Value $cmdContent -Force

# Ensure User PATH contains ~/.cip/bin
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$pathParts = $userPath -split ';' | Where-Object { $_ -ne '' }
if ($pathParts -notcontains $globalCipBin) {
    $newUserPath = if ($userPath) { "$userPath;$globalCipBin" } else { $globalCipBin }
    [Environment]::SetEnvironmentVariable('Path', $newUserPath, 'User')
    Write-Host "[OK] Added $globalCipBin to persistent User PATH." -ForegroundColor Green
} else {
    Write-Host "[OK] $globalCipBin is already in User PATH." -ForegroundColor Green
}

Set-Location -Path $PSScriptRoot

Write-Host "`n================================================================================" -ForegroundColor Green
Write-Host " SUCCESS: Engineering Commons Extension and Global CLI are both installed & configured!  " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "* Global CLI location : $globalCipBin\engineering-commons" -ForegroundColor Cyan
Write-Host "* Extension location  : $targetDir" -ForegroundColor Cyan
Write-Host "* To use in VS Code   : Reload VS Code (Ctrl+Shift+P -> Developer: Reload Window)" -ForegroundColor Yellow
