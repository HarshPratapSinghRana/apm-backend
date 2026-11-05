# Power Automate Setup: ADO Telemetry to SharePoint Sync Pipeline

This document outlines the **Zero-Cost ($0.00)** enterprise architecture to automatically synchronize developer usage tracking events from **Azure DevOps** into **Microsoft 365 SharePoint Online**.

---

## 🏗️ Architecture Overview

```mermaid
flowchart LR
    A[VS Code / CLI Developers] -->|1. Batch Usage Logs| B[(Azure DevOps Git Repo<br>/telemetry/usage-events.json)]
    B -->|2. Scheduled Ingestion (Every 15m)| C[Microsoft Power Automate Flow]
    C -->|3. Deduplicated Inserts| D[(SharePoint Online List<br>Engineering-Commons-Telemetry)]
    D -->|4. Live Dashboard Queries| E[CIP Usage Dashboard Webview]
```

### Why This Solves Client Permission Issues
* **Individual Developer Tokens:** Individual M365 tokens obtained through interactive login in VS Code or CLI often lack write permissions (`Sites.ReadWrite.All`) on company SharePoint Lists without tenant admin consent.
* **Azure DevOps (ADO) Gateway:** All developers already have contributor access to push git commits / API payloads to the ADO repo.
* **Power Automate Enterprise Service Account:** Power Automate runs under authorized cloud flow credentials, seamlessly writing telemetry rows into SharePoint Online without requiring developers to have direct SharePoint write rights.

---

## 📋 Step-by-Step Power Automate Cloud Flow Configuration

### Step 1: Create a Scheduled Cloud Flow
1. Open [Power Automate Portal](https://make.powerautomate.com/).
2. Click **Create** $\rightarrow$ **Scheduled cloud flow**.
3. Set Flow Name: `Engineering-Commons-Telemetry-Sync`.
4. Set Recurrence:
   - **Repeat every:** `15` **Minute(s)**.
5. Click **Create**.

---

### Step 2: Add Action "Get file content" (Azure DevOps)
1. Add a new step: Search for **Azure DevOps**.
2. Select action: **Get file content**.
3. Configure the fields:
   - **Organization Name:** `MAQInternalCIP-Engineering-Commons` (or select your organization from dropdown)
   - **Project Name:** `Engineering Commons`
   - **Repository:** `Engineering Commons`
   - **File Path:** `/telemetry/usage-events.json`
   - **Version Descriptor (Optional):** `main`

---

### Step 3: Add Action "Parse JSON" (Data Operation)
1. Add a new step: Search for **Data Operation** $\rightarrow$ **Parse JSON**.
2. **Content:** Select the dynamic content `File Content` from the previous step.
3. **Schema:** Click **Use sample payload to generate schema** and paste the JSON schema below:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "action": { "type": "string" },
      "eventType": { "type": "string" },
      "userId": { "type": "string" },
      "userEmail": { "type": "string" },
      "artifactId": { "type": "string" },
      "artifactName": { "type": "string" },
      "artifactType": { "type": "string" },
      "artifactVersion": { "type": "string" },
      "source": { "type": "string" },
      "platform": { "type": "string" },
      "workspace": { "type": "string" },
      "timestamp": { "type": "string" },
      "metadata": { "type": "string" }
    }
  }
}
```

---

### Step 4: Add Action "Apply to each" Loop
1. Add a new step: **Control** $\rightarrow$ **Apply to each**.
2. **Select an output from previous steps:** Select `Body` from the **Parse JSON** step.

---

### Step 5: Inside Loop – Check Existing Items (Deduplication)
1. Inside **Apply to each**, add action: **SharePoint** $\rightarrow$ **Get items**.
2. Configure fields:
   - **Site Address:** `https://testmaq.sharepoint.com/sites/AITeam2`
   - **List Name:** `Engineering-Commons-Telemetry`
   - **Filter Query:**
     ```
     Timestamp eq '@{items('Apply_to_each')?['timestamp']}' and UserEmail eq '@{items('Apply_to_each')?['userEmail']}' and ArtifactId eq '@{items('Apply_to_each')?['artifactId']}' and Title eq '@{items('Apply_to_each')?['action']}'
     ```
   - **Top Count:** `1`

---

### Step 6: Inside Loop – Condition (If Not Already Recorded)
1. Add action: **Control** $\rightarrow$ **Condition**.
2. **Left expression:** Click **Expression** tab and enter:
   ```
   length(outputs('Get_items')?['body/value'])
   ```
3. **Operator:** `is equal to`
4. **Right value:** `0`

---

### Step 7: In "If Yes" Branch – Create SharePoint Item
1. In the **If Yes** branch, add action: **SharePoint** $\rightarrow$ **Create item**.
2. Configure parameters:
   - **Site Address:** `https://testmaq.sharepoint.com/sites/AITeam2`
   - **List Name:** `Engineering-Commons-Telemetry`
   - **Title:** `@{items('Apply_to_each')?['action']}`
   - **UserId:** `@{items('Apply_to_each')?['userId']}`
   - **UserEmail:** `@{items('Apply_to_each')?['userEmail']}`
   - **ArtifactId:** `@{items('Apply_to_each')?['artifactId']}`
   - **ArtifactName:** `@{items('Apply_to_each')?['artifactName']}`
   - **ArtifactType:** `@{items('Apply_to_each')?['artifactType']}`
   - **ArtifactVersion:** `@{items('Apply_to_each')?['artifactVersion']}`
   - **Source:** `@{items('Apply_to_each')?['source']}`
   - **Platform:** `@{items('Apply_to_each')?['platform']}`
   - **Workspace:** `@{items('Apply_to_each')?['workspace']}`
   - **Timestamp:** `@{items('Apply_to_each')?['timestamp']}`
   - **Metadata:** `@{items('Apply_to_each')?['metadata']}`

---

## ⚡ Manual / Scheduled Verification with Python Script

For immediate testing, validation, and local execution, the included Python sync pipeline can be run anytime:

```bash
python scripts/sync_ado_telemetry_to_sharepoint.py
```

This script:
1. Connects to the ADO repo item `/telemetry/usage-events.json` (or local fallback).
2. Authenticates against SharePoint site `https://testmaq.sharepoint.com/sites/AITeam2`.
3. Checks for duplicates and creates missing rows in the `Engineering-Commons-Telemetry` list.
