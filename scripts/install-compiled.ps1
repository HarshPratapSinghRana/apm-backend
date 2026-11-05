$ErrorActionPreference = 'Stop'
$homeDir = [System.Environment]::GetFolderPath('UserProfile')
$extBaseDir = Join-Path $homeDir '.vscode\extensions'

# Read version from package.json
$pkgJsonPath = Join-Path $PSScriptRoot '..\engineering-commons-vscode\package.json'
$version = '1.2.3'
if (Test-Path $pkgJsonPath) {
    try {
        $pkg = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
        if ($pkg.version) { $version = $pkg.version }
    } catch {}
}

$targetDirs = @(
    (Join-Path $extBaseDir "company.engineering-commons-vscode-$version")
)

# Also update any existing company.engineering-commons-vscode directories
Get-ChildItem -Path $extBaseDir -Directory -Filter "company.engineering-commons-vscode*" | ForEach-Object {
    if (-not ($targetDirs -contains $_.FullName)) {
        $targetDirs += $_.FullName
    }
}

foreach ($target in $targetDirs) {
    if (!(Test-Path $target)) {
        New-Item -ItemType Directory -Path $target -Force | Out-Null
    }
    $destOut = Join-Path $target 'out'
    if (!(Test-Path $destOut)) { New-Item -ItemType Directory -Path $destOut -Force | Out-Null }
    Copy-Item -Path 'engineering-commons-vscode\out\*' -Destination $destOut -Recurse -Force
    Copy-Item -Path 'engineering-commons-vscode\package.json' -Destination $target -Force
    if (Test-Path 'engineering-commons-vscode\resources') {
        $destRes = Join-Path $target 'resources'
        if (!(Test-Path $destRes)) { New-Item -ItemType Directory -Path $destRes -Force | Out-Null }
        Copy-Item -Path 'engineering-commons-vscode\resources\*' -Destination $destRes -Recurse -Force
    }
    Write-Host "INSTALLED_SUCCESSFULLY_TO: $target"
}
