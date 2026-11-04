# Multi-stage Dockerfile for CIP Backend (.NET 10 Web API)
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

COPY ["cip-backend-dotnet.csproj", "./"]
RUN dotnet restore "cip-backend-dotnet.csproj"

COPY . .
RUN dotnet publish "cip-backend-dotnet.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS final
WORKDIR /app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

# Persistent storage mount point for SQLite database
VOLUME /app/data
ENV SQLITE_CONNECTION_STRING="Data Source=/app/data/cip.db"

ENTRYPOINT ["dotnet", "cip-backend-dotnet.dll"]
