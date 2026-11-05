$homeDir = [System.Environment]::GetFolderPath('UserProfile')
$extBaseDir = Join-Path $homeDir ".vscode\extensions"

$found = $false
Get-ChildItem -Path $extBaseDir -Directory -Filter "company.engineering-commons-vscode*" | ForEach-Object {
    $destOut = Join-Path $_.FullName "out"
    $destResources = Join-Path $_.FullName "resources"
    if (!(Test-Path $destOut)) { New-Item -ItemType Directory -Path $destOut -Force | Out-Null }
    if (!(Test-Path $destResources)) { New-Item -ItemType Directory -Path $destResources -Force | Out-Null }
    Copy-Item -Path "engineering-commons-vscode\out\*" -Destination $destOut -Recurse -Force
    Copy-Item -Path "engineering-commons-vscode\resources\*" -Destination $destResources -Recurse -Force
    Copy-Item -Path "engineering-commons-vscode\package.json" -Destination $destPkg -Force
    Write-Host "DIRECT_COPY_SUCCESSFUL: $($_.Name)"
    $found = $true
}

if (-not $found) {
    Write-Host "Extension directory not found in $extBaseDir"
}

