# Push newly created artifact directly to Azure DevOps Git repository

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
$Project = $env:AZURE_DEVOPS_PROJECT
$Repo = $env:AZURE_DEVOPS_REPO
$Pat = $env:AZURE_DEVOPS_PAT
$Branch = "main"

if (-not $Org -or -not $Project -or -not $Repo -or -not $Pat) {
    Write-Error "Missing Azure DevOps configuration in .env"
    exit 1
}

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
Write-Host "  Pushing New Artifact 'powerautomate-sync-engine' to ADO   " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Get branch ref
$refUri = "$repoUrl/refs?filter=heads/$Branch&api-version=7.0"
$refInfo = Invoke-RestMethod -Uri $refUri -Headers $headers -Method Get
$currentObjectId = $refInfo.value[0].objectId
Write-Host "  Current HEAD on '$Branch': $currentObjectId" -ForegroundColor Yellow

# 2. Prepare artifact content
$artifactPath = Join-Path $PSScriptRoot "..\artifacts\powerautomate-sync-engine.md"
$content = Get-Content $artifactPath -Raw -Encoding UTF8

# 3. Check if file already exists in ADO to determine add vs edit
$changeType = "add"
try {
    $itemUri = "$repoUrl/items?path=/artifacts/powerautomate-sync-engine.md&versionDescriptor.version=$Branch&api-version=7.0"
    $itemInfo = Invoke-RestMethod -Uri $itemUri -Headers $headers -Method Get
    if ($itemInfo) {
        $changeType = "edit"
        Write-Host "  File exists in ADO, performing 'edit'" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  File is new in ADO, performing 'add'" -ForegroundColor Green
}

$base64Content = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))

$pushPayload = @{
    refUpdates = @(
        @{
            name = "refs/heads/$Branch"
            oldObjectId = $currentObjectId
        }
    )
    commits = @(
        @{
            comment = "Publish new artifact: powerautomate-sync-engine (v1.0.0)"
            changes = @(
                @{
                    changeType = $changeType
                    item = @{
                        path = "/artifacts/powerautomate-sync-engine.md"
                    }
                    newContent = @{
                        content = $base64Content
                        contentType = "base64Encoded"
                    }
                }
            )
        }
    )
}

$pushJson = $pushPayload | ConvertTo-Json -Depth 10
$pushUri = "$repoUrl/pushes?api-version=7.0"

$headers["Content-Type"] = "application/json; charset=utf-8"
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($pushJson)

Write-Host "  Sending push request to Azure DevOps Git..." -ForegroundColor Yellow
$pushResp = Invoke-RestMethod -Uri $pushUri -Headers $headers -Method Post -Body $bodyBytes

$newCommitId = $pushResp.commits[0].commitId
$newPushId = $pushResp.pushId

Write-Host ""
Write-Host "  SUCCESSFULLY PUSHED TO AZURE DEVOPS!" -ForegroundColor Green
Write-Host "  Commit ID : $newCommitId" -ForegroundColor Cyan
Write-Host "  Push ID   : $newPushId" -ForegroundColor Cyan
Write-Host "  File      : /artifacts/powerautomate-sync-engine.md" -ForegroundColor Cyan
Write-Host "  Timestamp : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
