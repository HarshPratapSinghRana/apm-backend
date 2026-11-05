# ==============================================================================
# Start Engineering Commons PostgreSQL Database via Docker
# ==============================================================================

Write-Host "Starting PostgreSQL container for Engineering Commons..." -ForegroundColor Cyan

docker compose -f docker-compose.postgres.yml up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSuccessfully started PostgreSQL on localhost:5432" -ForegroundColor Green
    Write-Host "Database: engineering_commons" -ForegroundColor Gray
    Write-Host "Username: postgres" -ForegroundColor Gray
    Write-Host "Password: postgrespassword" -ForegroundColor Gray
    Write-Host "`nConnection String:" -ForegroundColor Cyan
    Write-Host "Host=localhost;Port=5432;Database=engineering_commons;Username=postgres;Password=postgrespassword" -ForegroundColor White
    Write-Host "`nTo connect the backend, set in cip-backend-dotnet/.env:" -ForegroundColor Yellow
    Write-Host 'POSTGRES_CONNECTION_STRING="Host=localhost;Port=5432;Database=engineering_commons;Username=postgres;Password=postgrespassword"' -ForegroundColor Yellow
} else {
    Write-Host "Failed to start Docker container. Please ensure Docker Desktop is running." -ForegroundColor Red
}
