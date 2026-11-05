# Azure BI & Data Engineering Prompt Playbook
*Imported directly from [Azure BI & Data Engineering Playbook](https://aisdlcplaybook.azurewebsites.net/prompt-library) for Engineering Commons.*

**Author**: Harsh Pratap Singh Rana (`harsh.rana@maqsoftware.com`)  
**Total Prompts**: 115  

## Categories / SDLC Stages:
- **Requirement Gathering** (`RequirementGathering`): 5 prompt(s)
- **Analysis & Planning** (`Analysis`): 16 prompt(s)
- **Architecture & Design** (`Architecture`): 12 prompt(s)
- **Detailed Design** (`Design`): 16 prompt(s)
- **Development & Implementation** (`Development`): 58 prompt(s)
- **Deployment & CI/CD** (`Deployment`): 2 prompt(s)
- **Support & Maintenance** (`Support`): 6 prompt(s)

---

## Complete Prompt Index:

| ID | Stage | Prompt Title | Tags |
| :--- | :--- | :--- | :--- |
| `playbook-requirementgathering-1` | Requirement Gathering | [Create inventory of all source objects (volume, keys, dependencies)](./playbook-requirementgathering-1.md) | `azure-bi, playbook, prompt` |
| `playbook-requirementgathering-2` | Requirement Gathering | [Create/Capture business definitions, KPIs & metric glossary](./playbook-requirementgathering-2.md) | `azure-bi, playbook, prompt` |
| `playbook-requirementgathering-3` | Requirement Gathering | [Create source‑to‑raw mapping document](./playbook-requirementgathering-3.md) | `azure-bi, playbook, prompt` |
| `playbook-requirementgathering-4` | Requirement Gathering | [Define acceptance criteria for completing analysis phase](./playbook-requirementgathering-4.md) | `azure-bi, playbook, prompt` |
| `playbook-requirementgathering-5` | Requirement Gathering | [Identify rollback and disaster recovery requirements](./playbook-requirementgathering-5.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-1` | Analysis & Planning | [Analyze slowly changing attributes and determine SCD type](./playbook-analysis-1.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-2` | Analysis & Planning | [Create transformation logic inventory & SCD strategy](./playbook-analysis-2.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-3` | Analysis & Planning | [Identify surrogate key strategy & uniqueness rules](./playbook-analysis-3.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-4` | Analysis & Planning | [Document risks, assumptions & dependencies](./playbook-analysis-4.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-5` | Analysis & Planning | [Create consolidated summary document of all analysis findings](./playbook-analysis-5.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-6` | Analysis & Planning | [Assess data migration complexity and risks](./playbook-analysis-6.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-7` | Analysis & Planning | [Perform dependency analysis across pipelines, notebooks and reports](./playbook-analysis-7.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-8` | Analysis & Planning | [Determine optimal file partitioning keys to minimize data scanning and improve query performance in the data lake.](./playbook-analysis-8.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-9` | Analysis & Planning | [Map authentication and authorization flows to define Role-Based Access Control (RBAC) levels for various user personas across the application stack.](./playbook-analysis-9.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-10` | Analysis & Planning | [Define telemetry and event-tracking schemas to capture granular user interactions for product analytics and proactive error monitoring.](./playbook-analysis-10.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-11` | Analysis & Planning | [Perform a query-level cost analysis to identify inefficient SQL or Spark operations that may cause unpredicted spikes in cloud consumption.](./playbook-analysis-11.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-12` | Analysis & Planning | [Draft an OpenAPI file to document request and response bodies for a specific endpoint.](./playbook-analysis-12.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-13` | Analysis & Planning | [Build end‑to‑end lineage map across source → raw → curated → semantic (tables, pipelines, notebooks, reports)](./playbook-analysis-13.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-14` | Analysis & Planning | [Identify M:M relationships and decide bridge table strategy (grain, keys, handling duplicates)](./playbook-analysis-14.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-15` | Analysis & Planning | [Decide how to handle schema drift (additive changes, type changes, breaking changes)](./playbook-analysis-15.md) | `azure-bi, playbook, prompt` |
| `playbook-analysis-16` | Analysis & Planning | [Evaluate need for aggregations, calculation groups, composite models, and query reduction patterns](./playbook-analysis-16.md) | `azure-bi, playbook, prompt` |
| `playbook-architecture-1` | Architecture & Design | [Define data lakehouse architecture (medallion - bronze/silver/gold layers)](./playbook-architecture-1.md) | `azure-bi, playbook, prompt` |
| `playbook-architecture-2` | Architecture & Design | [Design workspace architecture for Fabric (workspace per environment vs shared)](./playbook-architecture-2.md) | `azure-bi, playbook, prompt` |
| `playbook-architecture-3` | Architecture & Design | [Define Semantic model architecture and data modeling strategy](./playbook-architecture-3.md) | `azure-bi, playbook, prompt` |
| `playbook-architecture-4` | Architecture & Design | [Define trade-offs between performance, cost, and complexity](./playbook-architecture-4.md) | `azure-bi, playbook, prompt` |
| `playbook-architecture-5` | Architecture & Design | [Define disaster recovery and business continuity architecture](./playbook-architecture-5.md) | `azure-bi, playbook, prompt` |
| `playbook-architecture-6` | Architecture & Design | [Design compute vs storage separation strategy](./playbook-architecture-6.md) | `azure-bi, playbook, prompt` |
| `playbook-architecture-7` | Architecture & Design | [Design cross-workspace sharing and collaboration patterns](./playbook-architecture-7.md) | `azure-bi, playbook, prompt` |
| `playbook-architecture-8` | Architecture & Design | [Define what belongs in Lakehouse vs Warehouse vs Eventhouse and separation rules per domain](./playbook-architecture-8.md) | `azure-bi, playbook, prompt` |
| `playbook-architecture-9` | Architecture & Design | [Define authentication, authorization, and access control model](./playbook-architecture-9.md) | `azure-bi, playbook, prompt` |
| `playbook-architecture-10` | Architecture & Design | [Define how reports, dashboards, and ad‑hoc queries consume data](./playbook-architecture-10.md) | `azure-bi, playbook, prompt` |
| `playbook-architecture-11` | Architecture & Design | [Define how security propagates from data → cube → report](./playbook-architecture-11.md) | `azure-bi, playbook, prompt` |
| `playbook-architecture-12` | Architecture & Design | [Define where business logic resides across ETL, curated layers, and cubes](./playbook-architecture-12.md) | `azure-bi, playbook, prompt` |
| `playbook-design-1` | Detailed Design | [Document authentication mechanisms (OAuth, Service Principal, Keys, MI)](./playbook-design-1.md) | `azure-bi, playbook, prompt` |
| `playbook-design-2` | Detailed Design | [Document standardization rules (date format, currency normalization, etc.)](./playbook-design-2.md) | `azure-bi, playbook, prompt` |
| `playbook-design-3` | Detailed Design | [Create conceptual data model (entities & relationships)](./playbook-design-3.md) | `azure-bi, playbook, prompt` |
| `playbook-design-4` | Detailed Design | [Capture scalability, partitioning & data growth expectations](./playbook-design-4.md) | `azure-bi, playbook, prompt` |
| `playbook-design-5` | Detailed Design | [Create an approach document for ingestion type (Full, Incremental, CDC) including watermark / delta logic](./playbook-design-5.md) | `azure-bi, playbook, prompt` |
| `playbook-design-6` | Detailed Design | [Create an approach document for landing zones (ADLS / OneLake), file formats (Parquet, Delta, CSV, JSON) and batch vs near-real-time ingestion](./playbook-design-6.md) | `azure-bi, playbook, prompt` |
| `playbook-design-7` | Detailed Design | [Create an approach document for partitioning strategy, dependency & trigger strategy, retry & timeout policies](./playbook-design-7.md) | `azure-bi, playbook, prompt` |
| `playbook-design-8` | Detailed Design | [Create an approach document for parallelism & throttling strategy, error handling & failure paths](./playbook-design-8.md) | `azure-bi, playbook, prompt` |
| `playbook-design-9` | Detailed Design | [Create an approach document for managed identity usage, Key Vault integration, credential storage and RBAC for storage & pipelines](./playbook-design-9.md) | `azure-bi, playbook, prompt` |
| `playbook-design-10` | Detailed Design | [Document ingestion runbook (how-to-run, restart logic, troubleshooting steps)](./playbook-design-10.md) | `azure-bi, playbook, prompt` |
| `playbook-design-11` | Detailed Design | [Define the relationship model (Star/Snowflake)](./playbook-design-11.md) | `azure-bi, playbook, prompt` |
| `playbook-design-12` | Detailed Design | [Ensure naming conventions and standard formatting](./playbook-design-12.md) | `azure-bi, playbook, prompt` |
| `playbook-design-13` | Detailed Design | [Ensure measure folder organization (Display Folders)](./playbook-design-13.md) | `azure-bi, playbook, prompt` |
| `playbook-design-14` | Detailed Design | [Create model documentation (tables, relationships, measures, KPIs, RLS)](./playbook-design-14.md) | `azure-bi, playbook, prompt` |
| `playbook-design-15` | Detailed Design | [Define report layout, visual design, and UX strategy](./playbook-design-15.md) | `azure-bi, playbook, prompt` |
| `playbook-design-16` | Detailed Design | [Create documentation (pages, visuals, KPIs, RLS, data sources)](./playbook-design-16.md) | `azure-bi, playbook, prompt` |
| `playbook-development-1` | Development & Implementation | [Perform data profiling (row count, null %, duplicates, distributions)](./playbook-development-1.md) | `azure-bi, playbook, prompt` |
| `playbook-development-2` | Development & Implementation | [Create Linked Services for source systems, ADLS/Blob, Key Vault, REST APIs, databases etc.](./playbook-development-2.md) | `azure-bi, playbook, prompt` |
| `playbook-development-3` | Development & Implementation | [Create pipelines for full load and incremental load](./playbook-development-3.md) | `azure-bi, playbook, prompt` |
| `playbook-development-4` | Development & Implementation | [Implement watermark logic for incremental ingestion](./playbook-development-4.md) | `azure-bi, playbook, prompt` |
| `playbook-development-5` | Development & Implementation | [Implement dynamic file naming logic](./playbook-development-5.md) | `azure-bi, playbook, prompt` |
| `playbook-development-6` | Development & Implementation | [Implement schema validation during ingestion](./playbook-development-6.md) | `azure-bi, playbook, prompt` |
| `playbook-development-7` | Development & Implementation | [Implement logging & audit activities (start time, end time, counts, status)](./playbook-development-7.md) | `azure-bi, playbook, prompt` |
| `playbook-development-8` | Development & Implementation | [Implement failure handling workflows & alerting mechanisms](./playbook-development-8.md) | `azure-bi, playbook, prompt` |
| `playbook-development-9` | Development & Implementation | [Create schedule triggers and event-based triggers as needed](./playbook-development-9.md) | `azure-bi, playbook, prompt` |
| `playbook-development-10` | Development & Implementation | [Implement dependency checks (file arrival, upstream completion, control tables)](./playbook-development-10.md) | `azure-bi, playbook, prompt` |
| `playbook-development-11` | Development & Implementation | [Configure ADF monitoring dashboards](./playbook-development-11.md) | `azure-bi, playbook, prompt` |
| `playbook-development-12` | Development & Implementation | [Create ingestion control tables (watermark table, audit table, status table)](./playbook-development-12.md) | `azure-bi, playbook, prompt` |
| `playbook-development-13` | Development & Implementation | [Implement metadata-driven pipeline pattern (if required)](./playbook-development-13.md) | `azure-bi, playbook, prompt` |
| `playbook-development-14` | Development & Implementation | [Implement schema drift handling mechanism (ADF Mapping Data Flow or PySpark)](./playbook-development-14.md) | `azure-bi, playbook, prompt` |
| `playbook-development-15` | Development & Implementation | [Implement archival/purging logic for landing zone files](./playbook-development-15.md) | `azure-bi, playbook, prompt` |
| `playbook-development-16` | Development & Implementation | [Set up Unity Catalog with catalog → schema → table governance model](./playbook-development-16.md) | `azure-bi, playbook, prompt` |
| `playbook-development-17` | Development & Implementation | [Create raw → bronze ingestion transformation logic](./playbook-development-17.md) | `azure-bi, playbook, prompt` |
| `playbook-development-18` | Development & Implementation | [Implement bronze → silver cleansing & standardization logic](./playbook-development-18.md) | `azure-bi, playbook, prompt` |
| `playbook-development-19` | Development & Implementation | [Implement silver → gold aggregations & business transformations](./playbook-development-19.md) | `azure-bi, playbook, prompt` |
| `playbook-development-20` | Development & Implementation | [Implement Delta Lake optimization logic (OPTIMIZE, Z-Order, VACUUM)](./playbook-development-20.md) | `azure-bi, playbook, prompt` |
| `playbook-development-21` | Development & Implementation | [Implement merge/upsert logic for incremental/CDC loads](./playbook-development-21.md) | `azure-bi, playbook, prompt` |
| `playbook-development-22` | Development & Implementation | [Implement watermark and CDC logic inside notebooks](./playbook-development-22.md) | `azure-bi, playbook, prompt` |
| `playbook-development-23` | Development & Implementation | [Implement schema drift/change detection & handling](./playbook-development-23.md) | `azure-bi, playbook, prompt` |
| `playbook-development-24` | Development & Implementation | [Implement deduplication logic (primary/business keys)](./playbook-development-24.md) | `azure-bi, playbook, prompt` |
| `playbook-development-25` | Development & Implementation | [Implement late arriving & outlier data handling strategy](./playbook-development-25.md) | `azure-bi, playbook, prompt` |
| `playbook-development-26` | Development & Implementation | [Implement audit logging tables (pipeline run, counts, status, errors)](./playbook-development-26.md) | `azure-bi, playbook, prompt` |
| `playbook-development-27` | Development & Implementation | [Implement control tables (pipeline config, watermark, audit, status)](./playbook-development-27.md) | `azure-bi, playbook, prompt` |
| `playbook-development-28` | Development & Implementation | [Implement data quality rules programmatically (Great Expectations / Custom)](./playbook-development-28.md) | `azure-bi, playbook, prompt` |
| `playbook-development-29` | Development & Implementation | [Implement error handling and rerun framework (idempotent design)](./playbook-development-29.md) | `azure-bi, playbook, prompt` |
| `playbook-development-30` | Development & Implementation | [Optimize notebooks (partitioning, caching, checkpointing, broadcast joins)](./playbook-development-30.md) | `azure-bi, playbook, prompt` |
| `playbook-development-31` | Development & Implementation | [Implement Databricks job orchestration (jobs, multi-task workflows)](./playbook-development-31.md) | `azure-bi, playbook, prompt` |
| `playbook-development-32` | Development & Implementation | [Configure job notifications (email, Teams, webhook)](./playbook-development-32.md) | `azure-bi, playbook, prompt` |
| `playbook-development-33` | Development & Implementation | [Monitor cluster utilization metrics](./playbook-development-33.md) | `azure-bi, playbook, prompt` |
| `playbook-development-34` | Development & Implementation | [Create required gold tables](./playbook-development-34.md) | `azure-bi, playbook, prompt` |
| `playbook-development-35` | Development & Implementation | [Publish curated tables to ADLS/OneLake for analytics consumption](./playbook-development-35.md) | `azure-bi, playbook, prompt` |
| `playbook-development-36` | Development & Implementation | [Publish Delta tables to Databricks Unity Catalog (catalog/schema/table)](./playbook-development-36.md) | `azure-bi, playbook, prompt` |
| `playbook-development-37` | Development & Implementation | [Apply column-level security](./playbook-development-37.md) | `azure-bi, playbook, prompt` |
| `playbook-development-38` | Development & Implementation | [Apply row-level security (RLS)](./playbook-development-38.md) | `azure-bi, playbook, prompt` |
| `playbook-development-39` | Development & Implementation | [Implement masking logic (Dynamic Masking / Custom Masking)](./playbook-development-39.md) | `azure-bi, playbook, prompt` |
| `playbook-development-40` | Development & Implementation | [Implement purge process for outdated or expired data](./playbook-development-40.md) | `azure-bi, playbook, prompt` |
| `playbook-development-41` | Development & Implementation | [Implement table versioning and change management process](./playbook-development-41.md) | `azure-bi, playbook, prompt` |
| `playbook-development-42` | Development & Implementation | [Configure monitoring and alerting for published layer refresh/load failures](./playbook-development-42.md) | `azure-bi, playbook, prompt` |
| `playbook-development-43` | Development & Implementation | [Create the semantic model dataset in Power BI / Fabric](./playbook-development-43.md) | `azure-bi, playbook, prompt` |
| `playbook-development-44` | Development & Implementation | [Import data or configure Direct Lake / Direct Query connection](./playbook-development-44.md) | `azure-bi, playbook, prompt` |
| `playbook-development-45` | Development & Implementation | [Create calculated columns](./playbook-development-45.md) | `azure-bi, playbook, prompt` |
| `playbook-development-46` | Development & Implementation | [Create DAX measures](./playbook-development-46.md) | `azure-bi, playbook, prompt` |
| `playbook-development-47` | Development & Implementation | [Create hierarchies (Date, Product, Customer, etc.)](./playbook-development-47.md) | `azure-bi, playbook, prompt` |
| `playbook-development-48` | Development & Implementation | [Implement Row-Level Security (RLS) rules](./playbook-development-48.md) | `azure-bi, playbook, prompt` |
| `playbook-development-49` | Development & Implementation | [Implement Perspectives (consumer-friendly views)](./playbook-development-49.md) | `azure-bi, playbook, prompt` |
| `playbook-development-50` | Development & Implementation | [Run Vertipaq Analyzer (compression, dictionary size)](./playbook-development-50.md) | `azure-bi, playbook, prompt` |
| `playbook-development-51` | Development & Implementation | [Optimize model size (remove unused columns/tables)](./playbook-development-51.md) | `azure-bi, playbook, prompt` |
| `playbook-development-52` | Development & Implementation | [Build report navigation and information architecture (home page, sections, drill paths)](./playbook-development-52.md) | `azure-bi, playbook, prompt` |
| `playbook-development-53` | Development & Implementation | [Build report pages (overview, detail, trend, exception)](./playbook-development-53.md) | `azure-bi, playbook, prompt` |
| `playbook-development-54` | Development & Implementation | [Build visuals, charts, cards, KPIs, matrices](./playbook-development-54.md) | `azure-bi, playbook, prompt` |
| `playbook-development-55` | Development & Implementation | [Apply conditional formatting (threshold-based, color semantics, icons)](./playbook-development-55.md) | `azure-bi, playbook, prompt` |
| `playbook-development-56` | Development & Implementation | [Add drill-through pages, bookmarks, and interactions](./playbook-development-56.md) | `azure-bi, playbook, prompt` |
| `playbook-development-57` | Development & Implementation | [Apply corporate themes & branding (color palettes, fonts, styles)](./playbook-development-57.md) | `azure-bi, playbook, prompt` |
| `playbook-development-58` | Development & Implementation | [Optimize report performance (DAX optimization, visual reduction, query folding)](./playbook-development-58.md) | `azure-bi, playbook, prompt` |
| `playbook-deployment-1` | Deployment & CI/CD | [Set up Azure DevOps pipelines for ADO (CI/CD)](./playbook-deployment-1.md) | `azure-bi, playbook, prompt` |
| `playbook-deployment-2` | Deployment & CI/CD | [Implement parameterized deployments across environments](./playbook-deployment-2.md) | `azure-bi, playbook, prompt` |
| `playbook-support-1` | Support & Maintenance | [Create Databricks Runbook (execution, restart logic, troubleshooting)](./playbook-support-1.md) | `azure-bi, playbook, prompt` |
| `playbook-support-2` | Support & Maintenance | [Create data contract for all published datasets (schema, SLAs, DQ rules, lineage)](./playbook-support-2.md) | `azure-bi, playbook, prompt` |
| `playbook-support-3` | Support & Maintenance | [Create lineage documentation for each published dataset](./playbook-support-3.md) | `azure-bi, playbook, prompt` |
| `playbook-support-4` | Support & Maintenance | [Ensure compatibility for downstream semantic model consumption (Power BI)](./playbook-support-4.md) | `azure-bi, playbook, prompt` |
| `playbook-support-5` | Support & Maintenance | [Document published dataset SLAs (availability, freshness, latency)](./playbook-support-5.md) | `azure-bi, playbook, prompt` |
| `playbook-support-6` | Support & Maintenance | [Create incident response playbooks](./playbook-support-6.md) | `azure-bi, playbook, prompt` |
