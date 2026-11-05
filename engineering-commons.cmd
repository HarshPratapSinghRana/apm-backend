@echo off
if "%ENGINEERING_COMMONS_BACKEND_URL%"=="" set "ENGINEERING_COMMONS_BACKEND_URL=https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io"
dotnet run --project "%~dp0EngineeringCommonsCli\EngineeringCommonsCli.csproj" --no-launch-profile -- %*
