param(
    [string]$Org = $env:AZURE_DEVOPS_ORG,
    [string]$Project = $env:AZURE_DEVOPS_PROJECT,
    [string]$Repo = $env:AZURE_DEVOPS_REPO,
    [string]$Pat = $env:AZURE_DEVOPS_PAT,
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

# Auto-load .env files if variables are not set
$envPaths = @(
    (Join-Path $PSScriptRoot ".env"),
    (Join-Path $PSScriptRoot "cip-backend-dotnet\.env")
)
foreach ($ep in $envPaths) {
    if (Test-Path $ep) {
        $lines = Get-Content $ep
        foreach ($line in $lines) {
            $trimmed = $line.Trim()
            if ($trimmed -and -not $trimmed.StartsWith("#") -and $trimmed.Contains("=")) {
                $idx = $trimmed.IndexOf("=")
                $k = $trimmed.Substring(0, $idx).Trim()
                $v = $trimmed.Substring($idx + 1).Trim().Trim('"').Trim("'")
                if ($k -eq "AZURE_DEVOPS_ORG" -and [string]::IsNullOrWhiteSpace($Org)) { $Org = $v }
                if ($k -eq "AZURE_DEVOPS_PROJECT" -and [string]::IsNullOrWhiteSpace($Project)) { $Project = $v }
                if ($k -eq "AZURE_DEVOPS_REPO" -and [string]::IsNullOrWhiteSpace($Repo)) { $Repo = $v }
                if ($k -eq "AZURE_DEVOPS_PAT" -and [string]::IsNullOrWhiteSpace($Pat)) { $Pat = $v }
                if ($k -eq "AZURE_DEVOPS_BRANCH" -and [string]::IsNullOrWhiteSpace($Branch)) { $Branch = $v }
            }
        }
    }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Engineering Commons - Azure DevOps (ADO) Marketplace Sync Tool" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ([string]::IsNullOrWhiteSpace($Org)) {
    $Org = Read-Host "Enter Azure DevOps Organization"
}
if ([string]::IsNullOrWhiteSpace($Project)) {
    $Project = Read-Host "Enter Azure DevOps Project"
}
if ([string]::IsNullOrWhiteSpace($Repo)) {
    $Repo = Read-Host "Enter Azure DevOps Repository"
}
if ([string]::IsNullOrWhiteSpace($Pat)) {
    $Pat = Read-Host "Enter Azure DevOps PAT"
}

if ([string]::IsNullOrWhiteSpace($Org) -or [string]::IsNullOrWhiteSpace($Project) -or [string]::IsNullOrWhiteSpace($Repo) -or [string]::IsNullOrWhiteSpace($Pat)) {
    Write-Error "Organization, Project, Repository, and PAT are all required."
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

Write-Host ""
Write-Host "Verifying Azure DevOps repository connection..." -ForegroundColor Yellow
Write-Host "  Target URL: https://dev.azure.com/$Org/$Project/_git/$Repo" -ForegroundColor DarkGray

$repoInfo = $null
try {
    $connUri = $repoUrl + "?api-version=7.0"
    $repoInfo = Invoke-RestMethod -Uri $connUri -Headers $headers -Method Get
    Write-Host "  Connected to repository '$($repoInfo.name)' (ID: $($repoInfo.id))" -ForegroundColor Green
}
catch {
    Write-Host "  Repository check failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Scanning local workspace for AI artifacts..." -ForegroundColor Yellow
$workspaceRoot = $PSScriptRoot
$artifactFiles = @()

$skillsDir = Join-Path $workspaceRoot ".agents\skills"
if (Test-Path $skillsDir) {
    $foundFiles = Get-ChildItem -Path $skillsDir -Recurse -File
    foreach ($f in $foundFiles) {
        $relPath = $f.FullName.Substring($workspaceRoot.Length).Replace('\', '/').TrimStart('/')
        $content = Get-Content -Path $f.FullName -Raw -Encoding UTF8
        $artifactFiles += [PSCustomObject]@{ Path = "/" + $relPath; Content = $content; Name = $f.Name }
        Write-Host "  Found skill: $relPath" -ForegroundColor DarkGray
    }
}

$githubDir = Join-Path $workspaceRoot ".github"
if (Test-Path $githubDir) {
    $foundFiles = Get-ChildItem -Path $githubDir -Recurse -File
    foreach ($f in $foundFiles) {
        $relPath = $f.FullName.Substring($workspaceRoot.Length).Replace('\', '/').TrimStart('/')
        $content = Get-Content -Path $f.FullName -Raw -Encoding UTF8
        $artifactFiles += [PSCustomObject]@{ Path = "/" + $relPath; Content = $content; Name = $f.Name }
        Write-Host "  Found GitHub artifact: $relPath" -ForegroundColor DarkGray
    }
}

$rootSkillsDir = Join-Path $workspaceRoot "skills"
if (Test-Path $rootSkillsDir) {
    $foundFiles = Get-ChildItem -Path $rootSkillsDir -Recurse -File
    foreach ($f in $foundFiles) {
        $relPath = $f.FullName.Substring($workspaceRoot.Length).Replace('\', '/').TrimStart('/')
        $content = Get-Content -Path $f.FullName -Raw -Encoding UTF8
        $artifactFiles += [PSCustomObject]@{ Path = "/" + $relPath; Content = $content; Name = $f.Name }
        Write-Host "  Found skill: $relPath" -ForegroundColor DarkGray
    }
}

$pluginsDir = Join-Path $workspaceRoot "plugins"
if (Test-Path $pluginsDir) {
    $foundFiles = Get-ChildItem -Path $pluginsDir -Recurse -File
    foreach ($f in $foundFiles) {
        $relPath = $f.FullName.Substring($workspaceRoot.Length).Replace('\', '/').TrimStart('/')
        $content = Get-Content -Path $f.FullName -Raw -Encoding UTF8
        $artifactFiles += [PSCustomObject]@{ Path = "/" + $relPath; Content = $content; Name = $f.Name }
        Write-Host "  Found plugin: $relPath" -ForegroundColor DarkGray
    }
}

$defaultAgents = @(
    @{
        Path = "/artifacts/design-reviewer.md"
        Content = "---\nname: design-reviewer\ntype: agent\nversion: 1.1.0\ndescription: Official CIP Design Reviewer Agent\n---\n\n# Design Reviewer Agent (v1.1.0)\nSpecialized agent for automated UX, architectural pattern analysis, and UI consistency checks."
    },
    @{
        Path = "/artifacts/api-test-generator.skill.md"
        Content = "---\nname: api-test-generator\ntype: skill\nversion: 1.0.0\ndescription: Automated xUnit and Integration test generator for REST API endpoints\n---\n\n# API Test Generator Skill\nGenerates comprehensive xUnit and integration tests for REST API controllers and services."
    },
    @{
        Path = "/artifacts/review-and-refactor.skill.md"
        Content = "---\nname: review-and-refactor\ntype: skill\nversion: 1.0.0\ndescription: AI code review and refactoring assistant\n---\n\n# Review & Refactor Skill\nReviews code for best practices, architectural clean code patterns, and performance optimizations."
    }
)

foreach ($da in $defaultAgents) {
    $existing = $artifactFiles | Where-Object { $_.Path -eq $da.Path }
    if (-not $existing) {
        $artifactFiles += [PSCustomObject]@{ Path = $da.Path; Content = $da.Content; Name = [System.IO.Path]::GetFileName($da.Path) }
        Write-Host "  Seeded marketplace package: $($da.Path)" -ForegroundColor DarkGray
    }
}

$catalogObj = @{
    repository = "$Org/$Project/$Repo"
    updatedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    artifacts = @(
        @{ id = "design-reviewer"; name = "design-reviewer"; type = "agent"; version = "1.1.0"; description = "Official CIP Design Reviewer Agent"; cipPackage = "$Org/$Project/$Repo#design-reviewer" },
        @{ id = "api-test-generator"; name = "api-test-generator"; type = "skill"; version = "1.0.0"; description = "Automated xUnit and Integration test generator"; cipPackage = "$Org/$Project/$Repo#api-test-generator" },
        @{ id = "review-and-refactor"; name = "review-and-refactor"; type = "skill"; version = "1.0.0"; description = "AI code review and refactoring assistant"; cipPackage = "$Org/$Project/$Repo#review-and-refactor" },
        @{ id = "github-assistant"; name = "github-assistant"; type = "plugin"; version = "1.0.0"; description = "GitHub and ADO integration assistant plugin"; cipPackage = "$Org/$Project/$Repo#github-assistant" },
        @{ id = "accessibility-fix"; name = "accessibility-fix"; type = "agent"; version = "1.0.0"; description = "Accessibility fix and remediation agent"; cipPackage = "$Org/$Project/$Repo#accessibility-fix" },
        @{ id = "enterprise-reviewer"; name = "enterprise-reviewer"; type = "agent"; version = "1.0.0"; description = "Enterprise code and architecture reviewer"; cipPackage = "$Org/$Project/$Repo#enterprise-reviewer" },
        @{ id = "postgres-mcp"; name = "postgres-mcp"; type = "mcpserver"; version = "1.0.0"; description = "PostgreSQL Model Context Protocol Server"; cipPackage = "$Org/$Project/$Repo#postgres-mcp" },
        @{ id = "time-mcp"; name = "time-mcp"; type = "mcpserver"; version = "1.0.0"; description = "Time and timezone calculation MCP Server"; cipPackage = "$Org/$Project/$Repo#time-mcp" },
        @{ id = "cip-db-explorer"; name = "cip-db-explorer"; type = "mcpserver"; version = "1.0.0"; description = "CIP Database Explorer MCP Server"; cipPackage = "$Org/$Project/$Repo#cip-db-explorer" }
    )
}
$catalogJson = $catalogObj | ConvertTo-Json -Depth 5
$artifactFiles += [PSCustomObject]@{ Path = "/catalog.json"; Content = $catalogJson; Name = "catalog.json" }

Write-Host "  Total artifact files to sync: $($artifactFiles.Count)" -ForegroundColor Green

Write-Host ""
Write-Host "Resolving branch '$Branch' ref in Azure DevOps..." -ForegroundColor Yellow

$refUri = "$repoUrl/refs?filter=heads/$Branch`&api-version=7.0"
$refInfo = Invoke-RestMethod -Uri $refUri -Headers $headers -Method Get
$currentObjectId = "0000000000000000000000000000000000000000"

if ($refInfo.value -and $refInfo.value.Count -gt 0) {
    $currentObjectId = $refInfo.value[0].objectId
    Write-Host "  Branch '$Branch' found at commit $currentObjectId" -ForegroundColor Green
} else {
    Write-Host "  Branch '$Branch' will be initialized as default branch." -ForegroundColor Cyan
}

# Fetch existing items to determine add vs edit
$existingMap = @{}
if ($currentObjectId -ne "0000000000000000000000000000000000000000") {
    try {
        $itemsUri = "$repoUrl/items?recursionLevel=Full&versionDescriptor.version=$Branch`&api-version=7.0"
        $itemsInfo = Invoke-RestMethod -Uri $itemsUri -Headers $headers -Method Get
        if ($itemsInfo.value) {
            foreach ($item in $itemsInfo.value) {
                if (-not $item.isFolder) {
                    $existingMap[$item.path.ToLower()] = $true
                }
            }
        }
    }
    catch { }
}

# Push in batches of 5 files for high reliability
$batchSize = 5
$totalPushed = 0
$batchCount = [Math]::Ceiling($artifactFiles.Count / $batchSize)

Write-Host ""
Write-Host "Pushing $($artifactFiles.Count) files across $batchCount batches..." -ForegroundColor Yellow

for ($b = 0; $b -lt $batchCount; $b++) {
    $batchItems = $artifactFiles | Select-Object -Skip ($b * $batchSize) -First $batchSize
    $changes = @()
    
    foreach ($file in $batchItems) {
        $cType = "add"
        if ($existingMap.ContainsKey($file.Path.ToLower())) {
            $cType = "edit"
        }
        $changes += @{
            changeType = $cType
            item = @{
                path = $file.Path
            }
            newContent = @{
                content = $file.Content
                contentType = "rawtext"
            }
        }
    }

    $pushPayload = @{
        refUpdates = @(
            @{
                name = "refs/heads/$Branch"
                oldObjectId = $currentObjectId
            }
        )
        commits = @(
            @{
                comment = "Sync CIP AI Marketplace batch $(($b+1))/$batchCount ($($batchItems.Count) files)"
                changes = $changes
            }
        )
    }

    $pushJson = $pushPayload | ConvertTo-Json -Depth 10
    $pushUri = "$repoUrl/pushes?api-version=7.0"
    
    try {
        $pushResult = Invoke-RestMethod -Uri $pushUri -Headers $headers -Method Post -Body $pushJson
        $currentObjectId = $pushResult.commits[0].commitId
        $totalPushed += $batchItems.Count
        
        # Mark pushed items as existing for future batches
        foreach ($file in $batchItems) {
            $existingMap[$file.Path.ToLower()] = $true
        }
        
        Write-Host "  [Batch $(($b+1))/$batchCount] Pushed $($batchItems.Count) files (Commit: $($currentObjectId.Substring(0,8)))" -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to push batch $(($b+1)): $_`n$($_.ErrorDetails.Message)"
        exit 1
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  SUCCESS! All artifacts synced to Azure DevOps repository!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Repository URL : https://dev.azure.com/$Org/$Project/_git/$Repo" -ForegroundColor Cyan
Write-Host "  Branch         : $Branch" -ForegroundColor Cyan
Write-Host "  Total Files    : $totalPushed files & catalog.json" -ForegroundColor Cyan
Write-Host "  Latest Commit  : $currentObjectId" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
