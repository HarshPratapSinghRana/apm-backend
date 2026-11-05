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
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $env:AZURE_DEVOPS_PAT))
$headers = @{ Authorization = "Basic " + $auth }
$repo = [Uri]::EscapeDataString($env:AZURE_DEVOPS_REPO)
$proj = [Uri]::EscapeDataString($env:AZURE_DEVOPS_PROJECT)
$parent = "336076f2dc0108d9f21a3f1ad2ecc407efa76d15"
$target = "0a78f9c4dadedcad8cea304d395dcbc06b2e780d"

Write-Host "--- Testing diffs/commits ---"
$uriDiff = "https://dev.azure.com/" + $env:AZURE_DEVOPS_ORG + "/" + $proj + "/_apis/git/repositories/" + $repo + "/diffs/commits?baseVersion=" + $parent + "&targetVersion=" + $target + "&api-version=7.0"
$resDiff = Invoke-RestMethod -Uri $uriDiff -Headers $headers -Method Get
$resDiff | ConvertTo-Json -Depth 6

Write-Host "--- Testing items in /artifacts ---"
$uriItems = "https://dev.azure.com/" + $env:AZURE_DEVOPS_ORG + "/" + $proj + "/_apis/git/repositories/" + $repo + "/items?scopePath=/artifacts&recursionLevel=OneLevel&api-version=7.0"
$resItems = Invoke-RestMethod -Uri $uriItems -Headers $headers -Method Get
$resItems | ConvertTo-Json -Depth 6
