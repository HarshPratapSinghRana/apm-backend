# 📥 Engineering Commons — SharePoint CSV Import Guide

This guide walks you through importing the 4 ready-to-use CSV files into your SharePoint site:
**Site URL**: `https://testmaq.sharepoint.com/sites/AITeam2`

---

## 📂 CSV Files Inventory

All files are located in your workspace under:
`c:\Users\HarshPratapSinghRana\Downloads\ecommerce-app\sharepoint-import-sheets\`

| File Name | Target SharePoint List Name | Description |
| :--- | :--- | :--- |
| **`Engineering-Commons-Artifacts.csv`** | `Engineering-Commons-Artifacts` | Catalog of AI Skills, Agents, Prompts, versions, downloads, and ratings |
| **`Engineering-Commons-Bounties.csv`** | `Engineering-Commons-Bounties` | Open and in-progress developer bounties with credit rewards |
| **`Engineering-Commons-Reviews.csv`** | `Engineering-Commons-Reviews` | Peer review feedback threads, line diff comments, and approvals |
| **`Engineering-Commons-Notifications.csv`** | `Engineering-Commons-Notifications` | In-app alerts, certifications, and bounty notifications |
| **`Engineering-Commons-Telemetry.csv`** | `Engineering-Commons-Telemetry` | Real-time usage logs, skill installs, and AI tool invocations |

---

## 🚀 Method 1: Create Lists via "From CSV" (Recommended - 10 Seconds per List)

SharePoint has a native wizard that reads the CSV, creates all columns with the correct data types, and populates all initial rows automatically.

### Steps:
1. Open your browser and navigate to:
   👉 **`https://testmaq.sharepoint.com/sites/AITeam2`**
2. On the top navigation bar / Site contents, click **`+ New`** ➔ **`List`**.
3. In the creation dialog, select **`From CSV`** (or **`From Excel`**).
4. Click **`Upload file`** and select the respective CSV file from:
   `c:\Users\HarshPratapSinghRana\Downloads\ecommerce-app\sharepoint-import-sheets\`
   - For Artifacts: select `Engineering-Commons-Artifacts.csv`
   - For Bounties: select `Engineering-Commons-Bounties.csv`
   - For Reviews: select `Engineering-Commons-Reviews.csv`
   - For Notifications: select `Engineering-Commons-Notifications.csv`
   - For Telemetry: select `Engineering-Commons-Telemetry.csv`
5. SharePoint will show a preview table:
   - Verify column types (Title = Title, Numbers = Number, Text = Single/Multiple lines of text).
   - Click **`Next`**.
6. Set the **List Name** exactly as:
   - `Engineering-Commons-Artifacts`
   - `Engineering-Commons-Bounties`
   - `Engineering-Commons-Reviews`
   - `Engineering-Commons-Notifications`
   - `Engineering-Commons-Telemetry`
7. Click **`Create`**.

Repeat this for all 5 CSV files!

---

## 📋 Method 2: Paste Rows via "Edit in grid view" (If Lists Already Exist)

If the lists already exist on SharePoint:

1. Open the list in your browser (e.g. `Engineering-Commons-Artifacts`).
2. Add any missing columns by clicking **`+ Add column`** (Text, Number, etc.).
3. Click **`Edit in grid view`** at the top of the list.
4. Open the CSV file in **Microsoft Excel** or Notepad.
5. Select and copy (`Ctrl + C`) the data rows.
6. Click on the first empty row in SharePoint's grid view and press **`Ctrl + V`**.
7. Click **`Exit grid view`** to save!
