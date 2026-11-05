# 📋 Engineering Commons — Dedicated SharePoint Schema & Resource Specification

This document details the exact schema, columns, and data types for all dedicated SharePoint Lists and Document Libraries owned and operated exclusively by **Engineering Commons**.

---

## 1. Resource Inventory

Engineering Commons provisions and uses **5 independent resources** in Microsoft 365:

| Resource Name | Type | Purpose |
| :--- | :--- | :--- |
| **`Engineering-Commons-Artifacts`** | SharePoint List | Stores metadata, versioning, quality tags, and `.zip` package attachments for all AI Skills, Agents, Prompts, and Plugins. |
| **`Engineering-Commons-Reviews`** | SharePoint List | Stores peer review threads, line diff comments, SLAs, approval decisions, and reviewer ratings. |
| **`Engineering-Commons-Bounties`** | SharePoint List | Tracks open bounty requests, reward credits, claimed developer assignments, and development stages. |
| **`Engineering-Commons-Notifications`** | SharePoint List | Stores in-app user notifications, badge counters, and review alert events. |
| **`Engineering-Commons-Documents`** | Document Library | Stores large release bundles, architecture presentations, and release notes. |

---

## 2. List Schemas & Field Definitions

### 2.1 `Engineering-Commons-Artifacts`

| Column Display Name | Internal Name | Data Type | Required | Description |
| :--- | :--- | :--- | :---: | :--- |
| **Title** | `Title` | Single line of text | Yes | Unique artifact name (e.g., `semantic-sql-optimizer`, `api-test-generator`). |
| **Category** | `Category` | Single line of text | Yes | Primary domain (e.g., `AI Engineering`, `Cloud`, `BFSI`, `Data`). |
| **Description** | `Description` | Multiple lines of text | No | Detailed overview of the artifact capabilities. |
| **Key Features** | `Key_x0020_Features` | Multiple lines of text | No | Markdown or bullet list of primary features. |
| **Tech Stack** | `Tech_x0020_Stack` | Single line of text | No | Frameworks/tools used (e.g., `Antigravity CLI, Semantic Kernel, VS Code`). |
| **Submitted By** | `Submitted_x0020_By` | Single line of text | Yes | Author corporate email address (`@maqsoftware.com`). |
| **Submitted At** | `Submitted_x0020_At` | Date and Time | No | ISO timestamp of submission. |
| **Version** | `Version` | Single line of text | Yes | Semantic version (e.g., `1.0.0`, `1.2.4`). |
| **Artifact Type** | `ArtifactType` | Choice | Yes | `skill`, `agent`, `prompt`, `plugin`. |
| **Is Certified** | `IsCertified` | Yes/No (Boolean) | No | Quality governance badge (`True` / `False`). |
| **Downloads** | `Downloads` | Number | No | Total download and install count. |
| **Rating** | `Rating` | Number | No | Average developer rating (1.0 to 5.0). |
| **Rating Count** | `RatingCount` | Number | No | Total number of rating submissions. |
| **Visibility** | `Visibility` | Choice | No | `Public`, `Internal`, `Private`. |
| **Attachments** | `AttachmentFiles` | Attachments | No | Published `.zip` artifact package. |

---

### 2.2 `Engineering-Commons-Reviews`

| Column Display Name | Internal Name | Data Type | Required | Description |
| :--- | :--- | :--- | :---: | :--- |
| **Title** | `Title` | Single line of text | Yes | Artifact name or Review ID. |
| **Agent Name** | `Agent_x0020_Name` | Single line of text | No | Subagent or skill name under review. |
| **Vote** | `Like_x0020_Dislike` | Choice | No | `Like`, `Dislike`. |
| **Comment** | `Comment` | Multiple lines of text | Yes | Peer review feedback or code diff comment. |
| **Submitted By** | `Submitted_x0020_By` | Single line of text | Yes | Reviewer corporate email (`@maqsoftware.com`). |
| **Submitted At** | `Submitted_x0020_At` | Date and Time | No | ISO timestamp of comment/review. |
| **File Path** | `FilePath` | Single line of text | No | Specific file relative path for inline diff comments. |
| **Line Number** | `LineNumber` | Number | No | Specific line number for code diff discussions. |
| **Review Status** | `ReviewStatus` | Choice | No | `UnderReview`, `Approved`, `ChangesRequested`, `Rejected`, `Certified`. |

---

### 2.3 `Engineering-Commons-Bounties`

| Column Display Name | Internal Name | Data Type | Required | Description |
| :--- | :--- | :--- | :---: | :--- |
| **Title** | `Title` | Single line of text | Yes | Bounty title (e.g., `Create Databricks Cost Auditor Agent`). |
| **Description** | `Description` | Multiple lines of text | No | Acceptance criteria and implementation requirements. |
| **Category** | `Category` | Single line of text | No | Target domain/category. |
| **Reward Credits** | `RewardCredits` | Number | No | Recognition and credit points. |
| **Status** | `Status` | Choice | Yes | `Open`, `InProgress`, `InTesting`, `Completed`. |
| **Claimed By** | `ClaimedBy` | Single line of text | No | Corporate email of developer claiming the work. |
| **Claimed At** | `ClaimedAt` | Date and Time | No | Timestamp of claim. |
| **Stage** | `Stage` | Single line of text | No | Current workflow step. |

---

### 2.4 `Engineering-Commons-Notifications`

| Column Display Name | Internal Name | Data Type | Required | Description |
| :--- | :--- | :--- | :---: | :--- |
| **Title** | `Title` | Single line of text | Yes | Notification heading. |
| **Message** | `Message` | Multiple lines of text | Yes | Notification body content. |
| **Recipient Email** | `RecipientEmail` | Single line of text | Yes | Target user corporate email. |
| **Notification Type** | `Type` | Choice | Yes | `Review`, `Bounty`, `System`, `Certification`. |
| **Is Read** | `IsRead` | Yes/No (Boolean) | No | Read status flag. |
| **Created At** | `CreatedAt` | Date and Time | No | Timestamp when alert was generated. |

---

### 2.5 `Engineering-Commons-Telemetry`

| Column Display Name | Internal Name | Data Type | Required | Description |
| :--- | :--- | :--- | :---: | :--- |
| **Title** | `Title` | Single line of text | Yes | Event Action (e.g. `INSTALL`, `INVOKE`, `USE`, `CONTRIBUTE`). |
| **Artifact Name** | `ArtifactName` | Single line of text | Yes | Name of AI skill or agent used. |
| **Artifact Type** | `ArtifactType` | Single line of text | No | `skill`, `agent`, `prompt`, `plugin`. |
| **Artifact Version** | `ArtifactVersion` | Single line of text | No | Semantic version installed. |
| **User Email** | `UserEmail` | Single line of text | Yes | Corporate email of developer. |
| **Source** | `Source` | Single line of text | No | `VS_CODE`, `GITHUB_COPILOT`, `CLAUDE`, `ANTIGRAVITY`, `CLI`. |
| **Platform** | `Platform` | Single line of text | No | Tooling runtime. |
| **Workspace** | `Workspace` | Single line of text | No | Local repo workspace directory. |
| **Timestamp** | `Timestamp` | Date and Time / Text | Yes | ISO 8601 execution timestamp. |
| **Metadata** | `Metadata` | Multiple lines of text | No | JSON audit payload (non-sensitive metrics). |

---

## 3. Microsoft Graph API Query Patterns

Engineering Commons interacts with these lists using standard Microsoft Graph v1.0 REST endpoints:

```http
# 1. Fetch all artifacts (single atomic call, cached for 15 minutes)
GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists/{artifacts-list-id}/items?$expand=fields&$top=500

# 2. Query peer reviews for a specific artifact
GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists/{reviews-list-id}/items?$expand=fields&$filter=fields/Title eq 'my-skill'

# 3. Submit a new review comment
POST https://graph.microsoft.com/v1.0/sites/{site-id}/lists/{reviews-list-id}/items
Content-Type: application/json

{
  "fields": {
    "Title": "semantic-sql-optimizer",
    "Comment": "LGTM! Verified security and execution speed.",
    "Submitted_x0020_By": "harsh.rana@maqsoftware.com",
    "ReviewStatus": "Approved"
  }
}
```
