import { Project } from "@/types/project";

export const projects: Project[] = [
  {
    id: "smart-invoice-processor",
    title: "Smart Invoice Processor",
    description:
      "End-to-end AI pipeline that extracts, validates, and reconciles invoices against purchase orders with 98% accuracy.",
    status: "Active",
    industry: "Finance",
    function: "Accounts Payable",
    detail: {
      keyMetrics: [
        { value: "98%", label: "Extraction Accuracy" },
        { value: "80%", label: "Time Saved" },
        { value: "15K+", label: "Invoices / Month" },
        { value: "4 weeks", label: "Time to Deploy" },
      ],
      problemStatement:
        "The AP team manually processed 15,000+ invoices per month, leading to slow turnaround times, frequent data-entry errors, and missed early-payment discounts. Cross-referencing invoices with purchase orders was a bottleneck that consumed 40% of analyst time.",
      solution:
        "We built an AI-powered pipeline using Azure Document Intelligence for OCR, GPT-4o for field extraction and validation, and a custom matching engine that reconciles line items against purchase orders. Exceptions are routed to a human-in-the-loop review queue.",
      outcomes: [
        "Reduced average processing time from 12 minutes to 90 seconds per invoice",
        "Achieved 98% extraction accuracy across 50+ vendor formats",
        "Recovered $1.2M in early-payment discounts in the first quarter",
        "Freed up 6 FTEs to focus on strategic vendor management",
      ],
      techStack: [
        "Azure Document Intelligence",
        "GPT-4o",
        "Azure Functions",
        "Cosmos DB",
        "Power Automate",
        "React",
      ],
      team: [
        { name: "Priya Sharma", role: "Project Lead" },
        { name: "Alex Chen", role: "ML Engineer" },
        { name: "Jordan Lee", role: "Backend Developer" },
        { name: "Sara Kim", role: "UX Designer" },
      ],
      timeline: "Jan 2026 – Mar 2026",
      architectureDiagram: `
┌──────────────┐     ┌───────────────────┐     ┌────────────────┐
│  Email/SFTP  │────▶│ Azure Doc Intel   │────▶│  GPT-4o        │
│  Ingestion   │     │  (OCR + Layout)   │     │  (Extraction)  │
└──────────────┘     └───────────────────┘     └───────┬────────┘
                                                       │
                     ┌───────────────────┐     ┌───────▼────────┐
                     │  Cosmos DB        │◀────│  Matching       │
                     │  (Invoice Store)  │     │  Engine         │
                     └───────┬───────────┘     └────────────────┘
                             │
                     ┌───────▼───────────┐
                     │  Review Dashboard │
                     │  (React + Teams)  │
                     └───────────────────┘`,
      demoVideoTitle: "Smart Invoice Processor – Full Demo",
      demoVideoUrl: "",
    },
  },
  {
    id: "compliance-guardian",
    title: "Compliance Guardian Agent",
    description:
      "AI agent that monitors regulatory changes, scans internal policies for gaps, and auto-generates remediation recommendations.",
    status: "Active",
    industry: "Compliance",
    function: "Risk & Governance",
    detail: {
      keyMetrics: [
        { value: "200+", label: "Policies Scanned" },
        { value: "95%", label: "Gap Detection Rate" },
        { value: "60%", label: "Audit Prep Reduction" },
        { value: "Real-time", label: "Regulation Alerts" },
      ],
      problemStatement:
        "The compliance team struggled to keep up with evolving regulations across multiple jurisdictions. Manual policy reviews took weeks, often missing critical gaps that led to audit findings and potential fines.",
      solution:
        "Deployed a multi-agent system: a Regulatory Monitor agent that tracks changes across SEC, GDPR, and HIPAA sources; a Policy Analyzer agent that maps internal documents to regulatory requirements; and a Remediation Advisor that generates actionable gap-closure plans.",
      outcomes: [
        "Reduced policy review cycle from 3 weeks to 2 days",
        "Identified 47 previously unknown compliance gaps in Q1",
        "Automated 60% of audit preparation documentation",
        "Zero regulatory findings in the most recent external audit",
      ],
      techStack: [
        "Azure AI Search",
        "GPT-4o",
        "Semantic Kernel",
        "Azure SQL",
        "Power BI",
        "SharePoint",
      ],
      team: [
        { name: "Michael Torres", role: "Project Lead" },
        { name: "Emily Zhang", role: "AI Engineer" },
        { name: "David Park", role: "Compliance SME" },
      ],
      timeline: "Nov 2025 – Feb 2026",
      architectureDiagram: `
┌──────────────────┐     ┌────────────────────┐
│  Regulatory      │────▶│  Azure AI Search   │
│  Feed Monitors   │     │  (Index & Embed)   │
└──────────────────┘     └────────┬───────────┘
                                  │
┌──────────────────┐     ┌────────▼───────────┐
│  SharePoint      │────▶│  Policy Analyzer   │
│  Policy Store    │     │  (GPT-4o Agent)    │
└──────────────────┘     └────────┬───────────┘
                                  │
                         ┌────────▼───────────┐
                         │  Remediation        │
                         │  Advisor Agent      │
                         └────────┬───────────┘
                                  │
                         ┌────────▼───────────┐
                         │  Dashboard / Alerts │
                         └────────────────────┘`,
      demoVideoTitle: "Compliance Guardian – Walkthrough",
      demoVideoUrl: "",
    },
  },
  {
    id: "retail-demand-forecaster",
    title: "Retail Demand Forecaster",
    description:
      "ML-powered demand forecasting system that predicts SKU-level demand across 500+ stores with 94% accuracy.",
    status: "Pilot",
    industry: "Retail",
    function: "Supply Chain",
    detail: {
      keyMetrics: [
        { value: "94%", label: "Forecast Accuracy" },
        { value: "30%", label: "Overstock Reduced" },
        { value: "500+", label: "Stores Covered" },
        { value: "$4.5M", label: "Annual Savings" },
      ],
      problemStatement:
        "The supply chain team relied on spreadsheet-based forecasting that couldn't account for seasonality, promotions, or regional trends. This led to chronic overstocking of slow movers and frequent stockouts of high-demand items.",
      solution:
        "Built a time-series forecasting pipeline using Prophet and LightGBM ensembles, enriched with external signals (weather, events, social trends). A GPT-4o agent provides natural-language explanations of forecasts and anomaly alerts for planners.",
      outcomes: [
        "Improved forecast accuracy from 72% to 94% at SKU-store level",
        "Reduced overstock inventory by 30%, freeing up $4.5M in working capital",
        "Cut stockout incidents by 45% across top 200 SKUs",
        "Planners save 15 hours/week with AI-generated forecast summaries",
      ],
      techStack: [
        "Azure ML",
        "LightGBM",
        "Prophet",
        "Azure Databricks",
        "GPT-4o",
        "Power BI",
        "Azure Data Factory",
      ],
      team: [
        { name: "Rachel Green", role: "Data Science Lead" },
        { name: "Tom Wilson", role: "ML Engineer" },
        { name: "Nina Patel", role: "Supply Chain Analyst" },
        { name: "Chris Obi", role: "Data Engineer" },
      ],
      timeline: "Dec 2025 – Mar 2026",
      architectureDiagram: `
┌──────────────────┐     ┌────────────────────┐     ┌─────────────┐
│  POS / ERP       │────▶│  Azure Data        │────▶│  Feature    │
│  Data Sources    │     │  Factory (ETL)     │     │  Store      │
└──────────────────┘     └────────────────────┘     └──────┬──────┘
                                                           │
┌──────────────────┐     ┌────────────────────┐     ┌──────▼──────┐
│  External Signals│────▶│  Azure Databricks  │────▶│  ML Models  │
│  (Weather, etc.) │     │  (Training)        │     │  (Ensemble) │
└──────────────────┘     └────────────────────┘     └──────┬──────┘
                                                           │
                         ┌────────────────────┐     ┌──────▼──────┐
                         │  Power BI          │◀────│  GPT-4o     │
                         │  Dashboard         │     │  Summaries  │
                         └────────────────────┘     └─────────────┘`,
      demoVideoTitle: "Demand Forecaster – Live Dashboard Demo",
      demoVideoUrl: "",
    },
  },
  {
    id: "hr-onboarding-assistant",
    title: "HR Onboarding Assistant",
    description:
      "Conversational AI agent that guides new hires through onboarding, answers policy questions, and automates IT/HR provisioning tasks.",
    status: "Active",
    industry: "HR",
    function: "Employee Experience",
    detail: {
      keyMetrics: [
        { value: "85%", label: "Self-Service Rate" },
        { value: "3 days", label: "Avg. Onboarding Time" },
        { value: "4.8/5", label: "Employee Satisfaction" },
        { value: "2000+", label: "Queries Handled / Mo" },
      ],
      problemStatement:
        "New employees faced a fragmented onboarding experience-multiple portals, inconsistent information, and long wait times for IT provisioning. HR spent 60% of their time answering repetitive questions instead of strategic initiatives.",
      solution:
        "Built a Teams-integrated AI assistant powered by GPT-4o with RAG over HR policies, benefits docs, and IT runbooks. The agent handles Q&A, triggers automated provisioning workflows via Power Automate, and tracks onboarding progress.",
      outcomes: [
        "85% of onboarding queries resolved without human intervention",
        "Reduced onboarding completion time from 10 days to 3 days",
        "HR team reclaimed 25+ hours per week for strategic work",
        "Employee satisfaction with onboarding rose from 3.2 to 4.8 out of 5",
      ],
      techStack: [
        "GPT-4o",
        "Azure AI Search",
        "Microsoft Teams",
        "Power Automate",
        "Azure Functions",
        "Cosmos DB",
      ],
      team: [
        { name: "Lisa Wang", role: "Product Owner" },
        { name: "James Rivera", role: "AI Engineer" },
        { name: "Amy Foster", role: "HR Business Partner" },
      ],
      timeline: "Oct 2025 – Jan 2026",
      architectureDiagram: `
┌──────────────────┐     ┌────────────────────┐
│  Microsoft Teams │────▶│  Bot Framework     │
│  (Chat UI)       │     │  + GPT-4o          │
└──────────────────┘     └────────┬───────────┘
                                  │
                         ┌────────▼───────────┐
                         │  Azure AI Search   │
                         │  (RAG over Docs)   │
                         └────────┬───────────┘
                                  │
┌──────────────────┐     ┌────────▼───────────┐
│  Power Automate  │◀────│  Orchestrator      │
│  (Provisioning)  │     │  (Azure Functions) │
└──────────────────┘     └────────┬───────────┘
                                  │
                         ┌────────▼───────────┐
                         │  Cosmos DB         │
                         │  (Progress Store)  │
                         └────────────────────┘`,
      demoVideoTitle: "HR Onboarding Assistant – Chat Demo",
      demoVideoUrl: "",
    },
  },
];
