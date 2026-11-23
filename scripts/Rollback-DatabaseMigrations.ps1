<#
.SYNOPSIS
    Automated CI/CD Database Rollback Script for Engineering Commons.
.DESCRIPTION
    Executes version-controlled SQL rollback scripts (U002, U001, etc.) in reverse order for safe recovery.
#>
param(
    [string]$DatabasePath = "cip.db",
    [string]$MigrationsDir = "cip-backend-dotnet/Migrations/Sql"
)

Write-Host "==========================================================" -ForegroundColor Red
Write-Host "Engineering Commons - Database Rollback Runner" -ForegroundColor Red
Write-Host "Database Target: $DatabasePath" -ForegroundColor Gray
Write-Host "Rollback Directory: $MigrationsDir" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Red

if (-not (Test-Path $MigrationsDir)) {
    Write-Error "Migrations directory not found at '$MigrationsDir'"
    exit 1
}

$fullDb = [System.IO.Path]::GetFullPath($DatabasePath)
$fullDir = [System.IO.Path]::GetFullPath($MigrationsDir)

Write-Host "`n<-- Executing database rollback via decoupled runner..." -ForegroundColor Yellow
dotnet run --project cip-backend-dotnet -- --rollback --db "$fullDb" --dir "$fullDir"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Database rollback execution failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "`n✓ All rollback scripts executed and verified successfully." -ForegroundColor Green
