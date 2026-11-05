# Push MCP and Plugin fixes to Azure DevOps Git

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

# 1. Get branch ref
$refUri = "$repoUrl/refs?filter=heads/$Branch&api-version=7.0"
$refInfo = Invoke-RestMethod -Uri $refUri -Headers $headers -Method Get
$currentObjectId = $refInfo.value[0].objectId

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
} catch {
    Write-Host "Warning: Could not fetch existing items tree: $_" -ForegroundColor DarkGray
}

$files = @(
    @{ local = "artifacts-json\postgres-mcp.json"; remote = "/artifacts-json/postgres-mcp.json" },
    @{ local = "artifacts-json\time-mcp.json"; remote = "/artifacts-json/time-mcp.json" },
    @{ local = "artifacts-json\azure-cloud-development.json"; remote = "/artifacts-json/azure-cloud-development.json" },
    @{ local = "engineering-commons-vscode\resources\catalog\masterCatalog.json"; remote = "/engineering-commons-vscode/resources/catalog/masterCatalog.json" },
    @{ local = "api\artifacts-catalog.json"; remote = "/api/artifacts-catalog.json" }
)

$changes = @()
$rootDir = (Get-Item $PSScriptRoot).Parent.FullName

foreach ($f in $files) {
    $fullLocal = Join-Path $rootDir $f.local
    if (-not (Test-Path $fullLocal)) { continue }
    $content = [System.IO.File]::ReadAllText($fullLocal, [System.Text.Encoding]::UTF8)
    $remotePath = $f.remote
    $changeType = if ($existingMap.ContainsKey($remotePath.ToLower())) { "edit" } else { "add" }

    $changes += @{
        changeType = $changeType
        item = @{ path = $remotePath }
        newContent = @{
            content = $content
            contentType = "rawtext"
        }
    }
}

$commitPayload = @{
    refUpdates = @(
        @{
            name = "refs/heads/$Branch"
            oldObjectId = $currentObjectId
        }
    )
    commits = @(
        @{
            comment = "Fix MCP Server and Plugin classification and counts (postgres-mcp, time-mcp, azure-cloud-development)"
            changes = $changes
        }
    )
}

$jsonBody = $commitPayload | ConvertTo-Json -Depth 10
$pushUri = "$repoUrl/pushes?api-version=7.0"
$pushRes = Invoke-RestMethod -Uri $pushUri -Headers $headers -Method Post -Body $jsonBody

Write-Host "Successfully pushed fixes to ADO Git! Commit ID: $($pushRes.commits[0].commitId)" -ForegroundColor Green
