$ErrorActionPreference = 'Stop'
Set-Location -Path (Join-Path $PSScriptRoot '..\engineering-commons-vscode')
& npm.cmd run compile
& npx.cmd -y @vscode/vsce package --no-dependencies --allow-star-activation --allow-missing-repository
Write-Host "VSIX_PACKAGED_SUCCESSFULLY"
