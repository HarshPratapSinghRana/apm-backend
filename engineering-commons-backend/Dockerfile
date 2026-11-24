# Multi-stage Dockerfile for Engineering Commons Backend (.NET 10 Web API)
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

COPY ["engineering-commons-backend.csproj", "./"]
RUN dotnet restore "engineering-commons-backend.csproj"

COPY . .
RUN dotnet publish "engineering-commons-backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS final
WORKDIR /app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

# Persistent storage mount point for SQLite database
VOLUME /app/data
ENV SQLITE_CONNECTION_STRING="Data Source=/app/data/engineering-commons.db"

ENTRYPOINT ["dotnet", "engineering-commons-backend.dll"]
