# ==============================================================================
# Engineering Commons - Live SharePoint Resource Provisioner & Syncer
# ==============================================================================
# Authenticates with Microsoft Entra ID (Azure AD) and creates the dedicated
# Engineering Commons lists and columns directly on your SharePoint site via Microsoft Graph.
# ==============================================================================

param(
    [string]$Tenant = "maqsoftware.com",
    [string]$Hostname = "testmaq.sharepoint.com",
    [string]$SitePath = "sites/MAQSoftwareAllEmployees",
    [string]$ClientId = "a5f3ba81-4c95-4c74-afd9-38b72cf39156"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Engineering Commons - Live SharePoint Provisioner & Syncer" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target Site: https://$Hostname/$SitePath" -ForegroundColor Yellow

# -----------------------------------------------------------------------------
# STEP 1: Microsoft Entra ID Device Code Authentication
# -----------------------------------------------------------------------------
Write-Host "`n[1/4] Initiating Microsoft Entra ID Device Code Login..." -ForegroundColor Green
$deviceCodeBody = @{
    client_id = $ClientId
    scope = "https://graph.microsoft.com/Sites.ReadWrite.All offline_access openid profile"
}

try {
    $deviceCodeRes = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$Tenant/oauth2/v2.0/devicecode" -Method Post -Body $deviceCodeBody
} catch {
    Write-Host "Failed to initiate device code login: $($_.ToString())" -ForegroundColor Red
    exit 1
}

$userCode = $deviceCodeRes.user_code
$loginUrl = $deviceCodeRes.verification_uri
$deviceCode = $deviceCodeRes.device_code
$interval = [Math]::Max(5, $deviceCodeRes.interval)
$expiresIn = $deviceCodeRes.expires_in

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host " ACTION REQUIRED: Sign in to your corporate account" -ForegroundColor Yellow
Write-Host " 1. Open URL:  $loginUrl" -ForegroundColor Cyan
Write-Host " 2. Enter Code: $userCode" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "==========================================================" -ForegroundColor Yellow

# Try opening the browser automatically
try {
    Start-Process $loginUrl
} catch {}

Write-Host "`nWaiting for authentication in browser (polling every $($interval)s)..." -ForegroundColor Gray

$tokenBody = @{
    grant_type = "urn:ietf:params:oauth:grant-type:device_code"
    client_id = $ClientId
    device_code = $deviceCode
}

$accessToken = $null
$startTime = Get-Date

while ($null -eq $accessToken) {
    Start-Sleep -Seconds $interval

    if (((Get-Date) - $startTime).TotalSeconds -gt $expiresIn) {
        Write-Host "Authentication timed out. Please run the script again." -ForegroundColor Red
        exit 1
    }

    try {
        $tokenRes = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$Tenant/oauth2/v2.0/token" -Method Post -Body $tokenBody -ErrorAction Stop
        if ($tokenRes.access_token) {
            $accessToken = $tokenRes.access_token
            Write-Host "`nSuccessfully authenticated as corporate user!" -ForegroundColor Green
            break
        }
    } catch {
        $errObj = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errObj -and $errObj.error -eq "authorization_pending") {
            Write-Host -NoNewline "."
            continue
        } else {
            Write-Host "`nAuthentication error: $($_.ToString())" -ForegroundColor Red
            exit 1
        }
    }
}

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type"  = "application/json"
}

# -----------------------------------------------------------------------------
# STEP 2: Resolve SharePoint Site ID via Graph API
# -----------------------------------------------------------------------------
Write-Host "`n`n[2/4] Resolving SharePoint Site ID..." -ForegroundColor Green
$cleanPath = $SitePath.Trim('/')
$siteEndpoint = "https://graph.microsoft.com/v1.0/sites/${Hostname}:/${cleanPath}"

try {
    $siteInfo = Invoke-RestMethod -Uri $siteEndpoint -Method Get -Headers $headers
    $siteId = $siteInfo.id
    Write-Host "Found Site: $($siteInfo.displayName) (ID: $($siteId))" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to resolve SharePoint site at $($siteEndpoint) - $($_.ToString())" -ForegroundColor Red
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 3: Create Dedicated Engineering Commons Lists
# -----------------------------------------------------------------------------
Write-Host "`n[3/4] Provisioning Dedicated Engineering Commons Lists..." -ForegroundColor Green

# Fetch existing lists to avoid duplicate errors
$existingLists = Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/sites/$siteId/lists" -Method Get -Headers $headers
$existingNames = @($existingLists.value | ForEach-Object { $_.displayName })

$listsToProvision = @(
    @{
        displayName = "Engineering-Commons-Artifacts"
        columns = @(
            @{ name = "Category"; text = @{} },
            @{ name = "Description"; text = @{ allowMultipleLines = $true } },
            @{ name = "KeyFeatures"; text = @{ allowMultipleLines = $true } },
            @{ name = "TechStack"; text = @{} },
            @{ name = "SubmittedBy"; text = @{} },
            @{ name = "SubmittedAt"; dateTime = @{} },
            @{ name = "Version"; text = @{} },
            @{ name = "ArtifactType"; choice = @{ choices = @("skill", "agent", "prompt", "plugin") } },
            @{ name = "IsCertified"; boolean = @{} },
            @{ name = "Downloads"; number = @{} },
            @{ name = "Rating"; number = @{} },
            @{ name = "RatingCount"; number = @{} },
            @{ name = "Visibility"; choice = @{ choices = @("Public", "Internal", "Private") } }
        )
    },
    @{
        displayName = "Engineering-Commons-Reviews"
        columns = @(
            @{ name = "AgentName"; text = @{} },
            @{ name = "Vote"; choice = @{ choices = @("Like", "Dislike") } },
            @{ name = "Comment"; text = @{ allowMultipleLines = $true } },
            @{ name = "SubmittedBy"; text = @{} },
            @{ name = "SubmittedAt"; dateTime = @{} },
            @{ name = "FilePath"; text = @{} },
            @{ name = "LineNumber"; number = @{} },
            @{ name = "ReviewStatus"; choice = @{ choices = @("UnderReview", "Approved", "ChangesRequested", "Rejected") } }
        )
    },
    @{
        displayName = "Engineering-Commons-Bounties"
        columns = @(
            @{ name = "Description"; text = @{ allowMultipleLines = $true } },
            @{ name = "Category"; text = @{} },
            @{ name = "RewardCredits"; number = @{} },
            @{ name = "Status"; choice = @{ choices = @("Open", "InProgress", "InTesting", "Completed") } },
            @{ name = "ClaimedBy"; text = @{} },
            @{ name = "ClaimedAt"; dateTime = @{} },
            @{ name = "Stage"; text = @{} }
        )
    },
    @{
        displayName = "Engineering-Commons-Notifications"
        columns = @(
            @{ name = "Message"; text = @{ allowMultipleLines = $true } },
            @{ name = "RecipientEmail"; text = @{} },
            @{ name = "Type"; choice = @{ choices = @("Review", "Bounty", "System", "Certification") } },
            @{ name = "IsRead"; boolean = @{} },
            @{ name = "CreatedAt"; dateTime = @{} }
        )
    }
)

$createdListIds = @{}

foreach ($listDef in $listsToProvision) {
    $name = $listDef.displayName
    if ($existingNames -contains $name) {
        Write-Host "  -> List '$name' already exists." -ForegroundColor Yellow
        $existing = $existingLists.value | Where-Object { $_.displayName -eq $name } | Select-Object -First 1
        $createdListIds[$name] = $existing.id
    } else {
        Write-Host "  -> Creating List '$name'..." -ForegroundColor Cyan
        $createPayload = @{
            displayName = $name
            columns = $listDef.columns
            list = @{
                template = "genericList"
            }
        } | ConvertTo-Json -Depth 5

        try {
            $created = Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/sites/$siteId/lists" -Method Post -Headers $headers -Body $createPayload
            $createdListIds[$name] = $created.id
            Write-Host "     Created successfully (List ID: $($created.id))" -ForegroundColor Green
        } catch {
            Write-Host "     Failed to create list $($name) - $($_.ToString())" -ForegroundColor Red
        }
    }
}

# -----------------------------------------------------------------------------
# STEP 4: Populate Initial Catalog & Bounties Data
# -----------------------------------------------------------------------------
Write-Host "`n[4/4] Populating Initial Artifacts & Bounties Data..." -ForegroundColor Green

# Populate Artifacts
if ($createdListIds.ContainsKey("Engineering-Commons-Artifacts")) {
    $artListId = $createdListIds["Engineering-Commons-Artifacts"]
    $initialArtifacts = @(
        @{
            Title = "demo-skill"
            Category = "AI Engineering"
            Description = "AI Skill package for company developers"
            ArtifactType = "skill"
            Version = "1.0.0"
            SubmittedBy = "harsh.rana@maqsoftware.com"
            IsCertified = $true
            Downloads = 12
            Rating = 5.0
            RatingCount = 3
            Visibility = "Public"
        },
        @{
            Title = "semantic-sql-optimizer"
            Category = "Data & Analytics"
            Description = "Optimizes complex SQL queries and generates AST execution plans."
            ArtifactType = "skill"
            Version = "1.2.0"
            SubmittedBy = "harsh.rana@maqsoftware.com"
            IsCertified = $true
            Downloads = 34
            Rating = 4.9
            RatingCount = 8
            Visibility = "Public"
        }
    )

    foreach ($art in $initialArtifacts) {
        Write-Host "  -> Adding Artifact: $($art.Title)" -ForegroundColor Gray
        $itemPayload = @{ fields = $art } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/sites/$siteId/lists/$artListId/items" -Method Post -Headers $headers -Body $itemPayload | Out-Null
        } catch {
            Write-Host "     Note: Item note: $($_.ToString())" -ForegroundColor DarkGray
        }
    }
}

# Populate Bounties
if ($createdListIds.ContainsKey("Engineering-Commons-Bounties")) {
    $bountyListId = $createdListIds["Engineering-Commons-Bounties"]
    $initialBounties = @(
        @{
            Title = "Build Accessibility Audit Agent"
            Category = "Frontend"
            Description = "Create an AI subagent that audits WCAG 2.1 compliance."
            RewardCredits = 250
            Status = "Open"
        },
        @{
            Title = "Implement Semantic Search Skill"
            Category = "Search"
            Description = "Semantic indexing and cosine similarity search skill."
            RewardCredits = 400
            Status = "InProgress"
            ClaimedBy = "harsh.rana@maqsoftware.com"
            Stage = "CodeGeneration"
        },
        @{
            Title = "Security Token Guard MCP Plugin"
            Category = "Security"
            Description = "Prevent secret leaks in prompts and local environment variables."
            RewardCredits = 300
            Status = "Open"
        }
    )

    foreach ($b in $initialBounties) {
        Write-Host "  -> Adding Bounty: $($b.Title)" -ForegroundColor Gray
        $itemPayload = @{ fields = $b } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/sites/$siteId/lists/$bountyListId/items" -Method Post -Headers $headers -Body $itemPayload | Out-Null
        } catch {
            Write-Host "     Note: Bounty item note: $($_.ToString())" -ForegroundColor DarkGray
        }
    }
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "Provisioning & Data Sync Complete!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "`nYou can now check your lists directly on SharePoint:" -ForegroundColor White
Write-Host "1. Engineering-Commons-Artifacts:     https://$Hostname/$SitePath/Lists/EngineeringCommonsArtifacts" -ForegroundColor Cyan
Write-Host "2. Engineering-Commons-Reviews:       https://$Hostname/$SitePath/Lists/EngineeringCommonsReviews" -ForegroundColor Cyan
Write-Host "3. Engineering-Commons-Bounties:      https://$Hostname/$SitePath/Lists/EngineeringCommonsBounties" -ForegroundColor Cyan
Write-Host "4. Engineering-Commons-Notifications: https://$Hostname/$SitePath/Lists/EngineeringCommonsNotifications" -ForegroundColor Cyan
