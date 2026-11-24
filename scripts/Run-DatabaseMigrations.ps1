<#
.SYNOPSIS
    Automated CI/CD Database Migration Script for Engineering Commons.
.DESCRIPTION
    Executes version-controlled SQL migration scripts (V001, V002, etc.) against the target SQLite/SQL database.
#>
param(
    [string]$DatabasePath = "engineering-commons.db",
    [string]$MigrationsDir = "engineering-commons-backend/Migrations/Sql"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Engineering Commons - Database Migration Runner" -ForegroundColor Cyan
Write-Host "Database Target: $DatabasePath" -ForegroundColor Gray
Write-Host "Migrations Directory: $MigrationsDir" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path $MigrationsDir)) {
    Write-Error "Migrations directory not found at '$MigrationsDir'"
    exit 1
}

$fullDb = [System.IO.Path]::GetFullPath($DatabasePath)
$fullDir = [System.IO.Path]::GetFullPath($MigrationsDir)

Write-Host "`n--> Executing migrations via decoupled runner..." -ForegroundColor Yellow
dotnet run --project engineering-commons-backend -- --migrate --db "$fullDb" --dir "$fullDir"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Database migration execution failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "`n✓ All database migrations executed and verified successfully." -ForegroundColor Green
