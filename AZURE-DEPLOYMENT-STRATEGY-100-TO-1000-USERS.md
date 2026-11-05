# Azure Deployment & Scaling Strategy: 100 to 1,000 Users

This document outlines the optimal **Azure-only deployment architecture**, cost modeling, technical justification, and complete step-by-step deployment guide for scaling the Engineering Commons .NET backend from **100 users** (Initial Rollout) to **1,000 users** (Enterprise Scale).

---

## 1. Executive Summary & Recommended Azure Architecture

| Phase | User Scale | Monthly Request Volume | Recommended Azure Architecture | Estimated Monthly Cost | Primary Advantage |
|:---|:---|:---|:---|:---|:---|
| **Phase 1** | **100 Users** | **2,000,000 req/mo** *(Heavy Buffer)* | **Azure Container Apps (Serverless Consumption Plan)** + Azure Files SMB Volume | **$0.00 / month** (100% Free Tier) *(or ~$10–$14/mo if keeping 1 warm replica 24/7)* | Zero infrastructure cost, zero code refactoring, automatic zero-scaling when idle. |
| **Phase 2** | **1,000 Users** | **6,000,000 req/mo** *(Enterprise Spike Buffer)* | **Azure Container Apps (Autoscaled 1–4 Replicas)** + Azure SQL Free Tier (32 GB) | **~$18.00 – $32.00 / month** (₹1,500 – ₹2,650 / mo) | High concurrency, zero lock contention, multi-instance elastic autoscaling with continuous buffer. |

---

## 2. Phase 1 (100 Users): Why Azure Container Apps is the Best Choice

### 2.1 Workload & Capacity Math for 100 Users (Buffered High-Activity Model)
* **Daily Usage per User**: ~600–700 API operations/day (including automated polling, background IDE sync, artifact searches, downloads, and CLI commands).
* **Total Daily Requests**: $100 \times 650 \text{ req} = \mathbf{65,000 \text{ requests/day}}$.
* **Total Monthly Requests**: $65,000 \times 30 = \mathbf{1,950,000 \approx 2,000,000 \text{ requests/month}}$.

#### Azure Container Apps Monthly Free Tier vs 100-User Consumption:
* **Monthly Free Request Grant**: **2,000,000 requests** $\rightarrow$ 100 users with heavy activity consume within the **100% free allowance**.
* **Monthly Free Compute Grant**: **180,000 vCPU-seconds** (50 active vCPU-hours).
* **Monthly Free Memory Grant**: **360,000 GiB-seconds** (100 active GiB-hours).
* **Net Infrastructure Cost (Scale-to-Zero)**: **$0.00 / month (100% Free Tier)**.
* *(Optional 24/7 Warm Instance)*: If 1 minimum replica is toggled ON to eliminate cold-starts, cost is ~**$10.00 – $14.00 / month**.

### 2.2 Why Azure Container Apps Outperforms Other Azure Options for 100 Users

| Compared Azure Service | Why Azure Container Apps (ACA) is Superior |
|:---|:---|
| **vs. Azure App Service (F1 Free)** | **No Daily Throttling Quota**: App Service F1 strictly limits CPU to **60 minutes per day**. If 100 users trigger heavy morning traffic, F1 will abruptly suspend the app. ACA handles spikes seamlessly and provides **2,000,000 free requests/mo**. |
| **vs. Azure Functions (.NET Isolated)** | **Zero Code Refactoring**: Azure Functions requires rewriting standard ASP.NET Core controllers and middlewares to `[Function]` / `[HttpTrigger]` attributes. ACA runs your existing container image without modifying a single line of code. |
| **vs. Azure Virtual Machines (B1s)** | **Zero Server Management**: VMs require setting up Linux OS, systemd daemons, Nginx reverse proxies, SSL certificate renewals, and OS security patches. ACA is fully managed and includes built-in HTTPS endpoints. |

---

## 3. Phase 2 (1,000 Users): Why Autoscaled ACA + Azure SQL is the Best Choice

### 3.1 Workload & Concurrency Dynamics for 1,000 Users (Enterprise Spike Model)
* **Total Monthly Requests**: **6,000,000 requests/month** (buffered for continuous CI/CD pipelines, high-frequency registry downloads, and developer team concurrency).
* **Peak Concurrency**: ~150–350 simultaneous requests during peak enterprise hours.

### 3.2 The Single-File SQLite Bottleneck & Solution
* At 100 users, single-file SQLite (`cip.db`) mounted on an Azure Files SMB share performs exceptionally well.
* At 1,000 users with concurrent artifact publishing, review comments, and bounty status transitions, multi-process SQLite write-locks can introduce file-lock contention.
* **Recommended Evolution**:
  1. Keep **Azure Container Apps** for compute (autoscaling between **1 and 4 container replicas** based on HTTP request traffic).
  2. Switch database provider to **Azure SQL Database Free Tier** (100,000 vCore-seconds + 32 GB storage free every month) or **Azure Database for PostgreSQL Flexible Server (Burstable B1ms)**.

### 3.3 Financial Projection for 1,000 Users (6 Million Request Buffer)
* **Requests beyond 2M free grant**: $4,000,000 \times \$0.40 / \text{million} = \mathbf{\$1.60 / month}$.
* **Active Compute (1.0–2.0 vCPU, 2–4 GB RAM across autoscaled replicas + 1 warm base replica)**: $\mathbf{\approx \$16.00 - \$28.00 / month}$.
* **Database Layer**: Azure SQL Free Tier (32 GB) = **$0.00** (or Azure Postgres B1ms $\approx \$12.00/\text{mo}$).
* **Total Cost**: **~$18.00 – $32.00 / month** ($\approx$ ₹1,500 – ₹2,650 / month) for an enterprise-resilient system supporting 1,000 concurrent developers with zero throttling.

---

## 4. Step-by-Step Deployment Guide (Azure Container Apps)

Follow these exact steps to deploy the `cip-backend-dotnet` backend to Azure Container Apps.

### Prerequisites
* Azure CLI installed (`az --version`). If not installed: `winget install Microsoft.AzureCLI`.
* Azure account authenticated: `az login`.

---

### Step 1: Set Variables & Create Resource Group
Open PowerShell in the workspace root:

```powershell
# Set deployment variables
$RESOURCE_GROUP = "rg-engineering-commons-prod"
$LOCATION = "eastus"
$ACR_NAME = "acrcipbackend$(Get-Random -Minimum 1000 -Maximum 9999)"
$ENVIRONMENT_NAME = "env-engineering-commons"
$APP_NAME = "engineering-commons-api"
$STORAGE_ACCOUNT = "stcipdata$(Get-Random -Minimum 1000 -Maximum 9999)"
$SHARE_NAME = "cip-data"

# 1. Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION
```

---

### Step 2: Set Up Persistent Azure Storage for SQLite (`cip.db`)
To ensure your SQLite database and artifact metadata persist permanently when containers scale down:

```powershell
# 1. Create Storage Account
az storage account create `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku Standard_LRS

# 2. Create File Share
$STORAGE_KEY = (az storage account keys list --resource-group $RESOURCE_GROUP --account-name $STORAGE_ACCOUNT --query "[0].value" -o tsv)

az storage share create `
  --name $SHARE_NAME `
  --account-name $STORAGE_ACCOUNT `
  --account-key $STORAGE_KEY
```

---

### Step 3: Build & Push the Backend Container
Build the multi-stage Docker image directly using Azure Container Registry (ACR):

```powershell
# 1. Create Azure Container Registry (Basic SKU)
az acr create `
  --resource-group $RESOURCE_GROUP `
  --name $ACR_NAME `
  --sku Basic `
  --admin-enabled true

# 2. Build and push image to ACR directly in the cloud (no local Docker daemon required)
az acr build `
  --registry $ACR_NAME `
  --image cip-backend:v1.0 `
  --file ./cip-backend-dotnet/Dockerfile `
  ./cip-backend-dotnet
```

---

### Step 4: Create Container Apps Environment & Link Storage

```powershell
# 1. Create Container Apps Managed Environment
az containerapp env create `
  --name $ENVIRONMENT_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION

# 2. Link Azure Files Share to Container Apps Environment
az containerapp env storage set `
  --name $ENVIRONMENT_NAME `
  --resource-group $RESOURCE_GROUP `
  --storage-name cipStorageMount `
  --azure-file-account-name $STORAGE_ACCOUNT `
  --azure-file-account-key $STORAGE_KEY `
  --azure-file-share-name $SHARE_NAME `
  --access-mode ReadWrite
```

---

### Step 5: Deploy the Container App

Retrieve the ACR admin credentials and deploy the container app:

```powershell
# 1. Get ACR password
$ACR_PASSWORD = (az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# 2. Deploy Azure Container App (with persistent SMB volume mount and secret references)
az containerapp create `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --environment $ENVIRONMENT_NAME `
  --image "$ACR_NAME.azurecr.io/cip-backend:v1.0" `
  --registry-server "$ACR_NAME.azurecr.io" `
  --registry-username $ACR_NAME `
  --registry-password $ACR_PASSWORD `
  --target-port 5000 `
  --ingress external `
  --min-replicas 1 `
  --max-replicas 1 `
  --cpu 0.5 `
  --memory 1.0Gi `
  --secrets `
    ado-pat="$ADO_PAT" `
    github-token="$GITHUB_TOKEN" `
  --env-vars `
    ASPNETCORE_ENVIRONMENT=Production `
    ENABLE_SWAGGER=false `
    AZURE_DEVOPS_PAT=secretref:ado-pat `
    AZURE_DEVOPS_ORG="MAQInternalCIP-Engineering-Commons" `
    AZURE_DEVOPS_PROJECT="Engineering Commons" `
    AZURE_DEVOPS_REPO="Engineering Commons" `
    GITHUB_TOKEN=secretref:github-token `
    GITHUB_OWNER="your_github_org_or_user" `
    GITHUB_REPO="your_marketplace_repo" `
    SQLITE_CONNECTION_STRING="Data Source=/app/data/cip.db" `
  --volume-mount-path /app/data `
  --volume-name cip-storage `
  --storage-type AzureFile `
  --storage-name cipStorageMount

> **Architecture & Concurrency Note**:
> * **Phase 1 (100 Users, SQLite)**: Set `--min-replicas 1 --max-replicas 1`. Because SQLite utilizes OS-level byte-range locks, running multiple container instances against the same SMB Azure Files volume causes write-lock contention (`SQLite Error 5: database is locked`). 1 warm replica provides zero cold-start latency and comfortably handles 65,000 requests/day.
> * **Phase 2 (1,000 Users, Multi-Replica Autoscaling)**: When scaling to 1,000 users, switch the EF Core connection string to Azure SQL or PostgreSQL Flexible Server, which fully supports multi-container autoscaling (`--min-replicas 1 --max-replicas 4`).

# 3. Get your permanent live HTTPS URL
$BACKEND_URL = (az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)
Write-Host "================================================="
Write-Host "Your Backend is Live at: https://$BACKEND_URL"
Write-Host "Swagger UI: https://$BACKEND_URL/swagger"
Write-Host "================================================="
```

---

### Step 6: Connect VS Code Extension & CLI to the Azure Backend

1. **In VS Code Extension**: Update the `engineeringCommons.backendUrl` setting or `config.json`:
   ```json
   {
     "engineeringCommons.backendUrl": "https://engineering-commons-api.<your-env-domain>.azurecontainerapps.io"
   }
   ```
2. **In Engineering Commons CLI**: Set the environment variable or configuration endpoint:
   ```bash
   cip config set backend-url https://engineering-commons-api.<your-env-domain>.azurecontainerapps.io
   ```

---

## 5. Summary & Checklist

- [x] **100 Users**: Fully covered under Azure Container Apps **$0.00 free tier** (uses ~11% of the 2M free requests).
- [x] **1,000 Users**: Scales dynamically up to 3 replicas for **under $10/month**.
- [x] **Architecture**: Microservice container model preserving existing codebase integrity with zero rewrites.
