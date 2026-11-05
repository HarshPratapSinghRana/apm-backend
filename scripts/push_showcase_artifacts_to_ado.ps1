# Push official Showcase Artifacts to Azure DevOps Git

$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $idx = $line.IndexOf("=")
            $k = $line.Substring(0, $idx).Trim()
            $v = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($k, $v, "Process")
        }
    }
}

$Org = $env:AZURE_DEVOPS_ORG
if (-not $Org) { $Org = "MAQInternalCIP-Engineering-Commons" }
$Project = $env:AZURE_DEVOPS_PROJECT
if (-not $Project) { $Project = "Engineering Commons" }
$Repo = $env:AZURE_DEVOPS_REPO
if (-not $Repo) { $Repo = "Engineering Commons" }
$Pat = $env:AZURE_DEVOPS_PAT
if (-not $Pat) { $Pat = "A2RW5UcHDolfE7HztH9l9Ktj2kDF7Rzka3azqA39eTJR6EGFU9lbJQQJ99CJACAAAAAqDT5DAAASAZDO2Izl" }
$Branch = "main"

$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $Pat))
$headers = @{
    "Authorization" = "Basic " + $base64Auth
    "Content-Type"  = "application/json"
    "User-Agent"    = "engineering-commons-sync-utility"
}

$escapedProject = [System.Uri]::EscapeDataString($Project)
$escapedRepo = [System.Uri]::EscapeDataString($Repo)
$repoUrl = "https://dev.azure.com/$Org/$escapedProject/_apis/git/repositories/$escapedRepo"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Pushing Official Showcase Artifacts to Azure DevOps       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Get branch ref
$refUri = "$repoUrl/refs?filter=heads/$Branch&api-version=7.0"
$refInfo = Invoke-RestMethod -Uri $refUri -Headers $headers -Method Get
$currentObjectId = $refInfo.value[0].objectId
Write-Host "  Current HEAD on '$Branch': $currentObjectId" -ForegroundColor Yellow

# 2. Get existing items map
$existingMap = @{}
try {
    $itemsUri = "$repoUrl/items?recursionLevel=Full&versionDescriptor.version=$Branch&api-version=7.0"
    $itemsInfo = Invoke-RestMethod -Uri $itemsUri -Headers $headers -Method Get
    if ($itemsInfo.value) {
        foreach ($item in $itemsInfo.value) {
            if (-not $item.isFolder) {
                $existingMap[$item.path.ToLower()] = $true
            }
        }
    }
} catch { }

$showcaseArtifacts = @(
    "playwright-mcp",
    "github-mcp-server",
    "chrome-devtools-mcp",
    "webapp-testing",
    "skill-creator",
    "mcp-builder",
    "senior-code-reviewer",
    "debugging-assistant"
)

$filesToPush = @()

foreach ($art in $showcaseArtifacts) {
    # 1. artifacts-json/<name>.json
    $jsonPath = Join-Path $PSScriptRoot "..\artifacts-json\$art.json"
    if (Test-Path $jsonPath) {
        $raw = Get-Content $jsonPath -Raw -Encoding UTF8
        $filesToPush += [PSCustomObject]@{
            Path = "/artifacts-json/$art.json"
            Content = $raw
        }
        $doc = $raw | ConvertFrom-Json
        if ($doc.files) {
            foreach ($f in $doc.files) {
                if ($f.path -and $f.content) {
                    $filesToPush += [PSCustomObject]@{
                        Path = "/" + $f.path.TrimStart('/')
                        Content = $f.content
                    }
                }
            }
        }
    }
}

Write-Host "  Total files prepared for push: $($filesToPush.Count)" -ForegroundColor Green

# Push in batches of 5
$batchSize = 5
$batchCount = [Math]::Ceiling($filesToPush.Count / $batchSize)

for ($b = 0; $b -lt $batchCount; $b++) {
    $batch = $filesToPush | Select-Object -Skip ($b * $batchSize) -First $batchSize
    $changes = @()

    foreach ($f in $batch) {
        $cType = "add"
        if ($existingMap.ContainsKey($f.Path.ToLower())) {
            $cType = "edit"
        }
        $base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($f.Content))
        $changes += @{
            changeType = $cType
            item = @{ path = $f.Path }
            newContent = @{
                content = $base64
                contentType = "base64Encoded"
            }
        }
    }

    $refInfo = Invoke-RestMethod -Uri $refUri -Headers $headers -Method Get
    $currentObjectId = $refInfo.value[0].objectId

    $pushPayload = @{
        refUpdates = @(
            @{
                name = "refs/heads/$Branch"
                oldObjectId = $currentObjectId
            }
        )
        commits = @(
            @{
                comment = "Upload official showcase artifacts from GitHub (Batch $($b+1)/$batchCount)"
                changes = $changes
            }
        )
    }

    $pushJson = $pushPayload | ConvertTo-Json -Depth 10
    $pushUri = "$repoUrl/pushes?api-version=7.0"
    $headers["Content-Type"] = "application/json; charset=utf-8"
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($pushJson)

    Write-Host "  Pushing batch $($b+1) of $batchCount ($($batch.Count) files)..." -ForegroundColor Yellow
    $resp = Invoke-RestMethod -Uri $pushUri -Headers $headers -Method Post -Body $bodyBytes
    Write-Host "  [OK] Batch $($b+1) committed: $($resp.commits[0].commitId)" -ForegroundColor Green

    foreach ($f in $batch) {
        $existingMap[$f.Path.ToLower()] = $true
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  SUCCESS: All official showcase artifacts uploaded to ADO! " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
