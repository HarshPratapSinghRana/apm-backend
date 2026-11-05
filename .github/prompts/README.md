# Engineering Commons Prompts & Playbook Guide
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Total Prompts: 116](https://img.shields.io/badge/Total_Prompts-116-purple.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

This directory houses **GitHub Copilot Prompt Templates** (`.prompt.md`) that provide pre-engineered, standardized instructions for common development and data engineering tasks.

---

## 📜 Top-Level Prompts

### 1. `/find-artifact`
- **File**: [`find-artifact.prompt.md`](./find-artifact.prompt.md)
- **Main Work**: Searches the Engineering Commons catalog to find and recommend the best-matching AI agents, skills, and prompts for your exact task.
- **How to Use**:
  ```text
  /find-artifact I need automated unit testing and Roslyn security checks for my C# microservice
  ```

### 2. `/azure-bi-playbook`
- **File**: [`azure-bi-playbook.prompt.md`](./azure-bi-playbook.prompt.md)
- **Main Work**: Interactive prompt router for all 115 certified prompt templates from the **Azure BI & Data Engineering Playbook**.
- **How to Use**:
  ```text
  /azure-bi-playbook Design a Medallion Lakehouse architecture using Bronze, Silver, and Gold layers for retail sales data
  ```

---

## 📁 Azure BI & Data Engineering Playbook Prompts (115 Prompts)
Located in [`playbook/`](./playbook/):
- **Requirement Gathering (5)**: Source inventory, KPI glossary, mapping documents, acceptance criteria, DR rollback.
- **Analysis & Planning (16)**: SCD strategy, surrogate keys, data lineage, schema drift, query cost analysis.
- **Architecture & Design (12)**: Medallion Lakehouse, Fabric workspaces, semantic models, lakehouse partitioning.
- **Detailed Design (16)**: Star schema design, bridge tables, indexing, partitioning strategy.
- **Development & Implementation (58)**: PySpark profiling, SQL Server profiling, DAX measures, ADF pipelines, Delta Lake.
- **Deployment & CI/CD (2)**: Fabric Git integration, automated release pipelines.
- **Support & Maintenance (6)**: Pipeline telemetry, incident triage, performance tuning.

Full catalog and individual prompt details are available in [playbook/README.md](../../.agents/prompts/playbook/README.md).

---
*Maintained by **Harsh Pratap Singh Rana** (`harsh.rana@maqsoftware.com`) • Engineering Commons Ecosystem*
