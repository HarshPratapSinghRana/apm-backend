$ErrorActionPreference = 'Stop'
$vsixPath = Resolve-Path (Join-Path $PSScriptRoot '..\engineering-commons-vscode\engineering-commons-vscode-1.2.0.vsix')
Write-Host "Installing VSIX from $vsixPath..."

$homeDir = [System.Environment]::GetFolderPath('UserProfile')
$extBaseDir = Join-Path $homeDir '.vscode\extensions'
$codeCmd = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'

if (Test-Path $codeCmd) {
    & $codeCmd --install-extension $vsixPath --force
} else {
    code --install-extension $vsixPath --force
}

$tempExtract = Join-Path ([System.IO.Path]::GetTempPath()) ('cip_ext_' + [Guid]::NewGuid().ToString('N'))
$tempZip = $tempExtract + '.zip'
Copy-Item -Path $vsixPath -Destination $tempZip -Force
Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force

$extTarget = Join-Path $extBaseDir 'company.engineering-commons-vscode-1.2.0'
if (!(Test-Path $extTarget)) {
    New-Item -ItemType Directory -Path $extTarget -Force | Out-Null
}
Copy-Item -Path (Join-Path $tempExtract 'extension\*') -Destination $extTarget -Recurse -Force
Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "VSIX EXTENSION INSTALLED SUCCESSFULLY TO: $extTarget"
