@echo off
if "%ENGINEERING_COMMONS_BACKEND_URL%"=="" set "ENGINEERING_COMMONS_BACKEND_URL=https://ecommerce-app-chi-wine.vercel.app"
dotnet run --project "%~dp0EngineeringCommonsCli\EngineeringCommonsCli.csproj" --no-launch-profile -- %*
