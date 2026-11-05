import { FC, useState, useCallback, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  BookOpen,
  Clock,
  Users,
  Star,
  ArrowRight,
  ArrowLeft,
  Play,
  FileText,
  GraduationCap,
  Calendar,
  Award,
  ExternalLink,
  Sparkles,
  Brain,
  Bot,
  Workflow,
  MessageSquare,
  Shield,
  Database,
  Cog,
  Target,
  CheckCircle2,
  Rocket,
  ClipboardList,
  Check,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  X,
  Trash2,
  User,
} from "lucide-react";

/* ─── COE - Agentic AI Training Plan ─────────────────── */

interface COEModule {
  id: string;
  day: string;
  theme: string;
  week: string;
  topics: string[];
  handsOn: string;
  tools: string;
  resources: { title: string; url: string }[];
  skillValidated: string;
  isCapstone?: boolean;
  isHighlight?: boolean;
}

/* ─── Progress Tracker Types & Helpers ────────────── */

type DayStatus = "not-started" | "in-progress" | "complete" | "needs-review";
type NextAction = "" | "proceed" | "revise" | "needs-review";

interface DayProgress {
  status: DayStatus;
  conceptScore: number; // 0-4 stars
  labScore: number;     // 0-4 stars
  mentorComment: string;
  nextAction: NextAction;
  topicsCompleted: boolean[]; // per-topic completion
}

interface CapstoneProgress {
  archScore: number;    // 0-4 stars
  presentScore: number; // 0-4 stars
  overallScore: number; // 0-4 stars
}

interface TrainingProgress {
  days: Record<string, DayProgress>;
  capstone: CapstoneProgress;
}

const STORAGE_KEY_PREFIX = "coe-training-progress-";

function getStorageKey(email: string): string {
  return STORAGE_KEY_PREFIX + email.toLowerCase();
}

function loadProgress(email: string): TrainingProgress {
  try {
    const raw = localStorage.getItem(getStorageKey(email));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return createDefaultProgress();
}

function saveProgress(email: string, progress: TrainingProgress) {
  localStorage.setItem(getStorageKey(email), JSON.stringify(progress));
}

function createDefaultProgress(): TrainingProgress {
  const days: Record<string, DayProgress> = {};
  for (const m of coeModules) {
    days[m.id] = {
      status: "not-started",
      conceptScore: 0,
      labScore: 0,
      mentorComment: "",
      nextAction: "",
      topicsCompleted: m.topics.map(() => false),
    };
  }
  return { days, capstone: { archScore: 0, presentScore: 0, overallScore: 0 } };
}

const coeModules: COEModule[] = [
  {
    id: "day1",
    day: "Day 1",
    theme: "Foundations of Agentic AI",
    week: "W1",
    topics: [
      "AI Agent vs LLM Application",
      "Agentic-first vs traditional architecture",
      "Agent Loop: Perception → Planning → Action → Reflection",
      "Autonomous vs Assistive agents",
      "Single vs Multi-agent systems",
      "Agent maturity model for enterprises",
    ],
    handsOn: "USE CASE: IT Helpdesk First-Responder Agent\n\nBuild a Copilot Studio agent for MAQ's IT helpdesk that autonomously triages employee support tickets. Configure a system prompt, add a SharePoint knowledge source with IT FAQ & runbooks, and publish to Microsoft Teams. Test end-to-end: employee asks 'My VPN is not connecting' - agent perceives, plans, acts, reflects. Map each step to the Perception → Planning → Action → Reflection loop.",
    tools: "Copilot Studio · SharePoint · Microsoft Teams",
    resources: [
      { title: "Get started with Microsoft Copilot Studio", url: "https://learn.microsoft.com/en-us/microsoft-copilot-studio/" },
      { title: "Build an initial agent with Copilot Studio", url: "https://learn.microsoft.com/en-us/microsoft-copilot-studio/" },
      { title: "AB-100 Study Guide", url: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-100" },
    ],
    skillValidated: "Create agents with instructions & knowledge; early architecture thinking",
  },
  {
    id: "day2",
    day: "Day 2",
    theme: "Planning & Reasoning Patterns",
    week: "W1",
    topics: [
      "Chain of Thought, Tree of Thought, Least-to-Most planning",
      "Policy-constrained reasoning",
      "Workflow decomposition",
      "Human-in-the-loop checkpoints",
    ],
    handsOn: "USE CASE: Employee Leave Approval Workflow Agent\n\nBuild a Copilot Studio agent for HR leave requests. Apply Chain-of-Thought: (1) check Dataverse leave balance, (2) check Microsoft Graph Calendar for team availability, (3) apply sprint policy rules, (4) draft decision. Add Human-in-the-Loop: >5 days triggers Adaptive Card approval in Teams for HR Manager. Test: 3-day request (autonomous) vs 10-day request (human sign-off).",
    tools: "Copilot Studio · Dataverse · Teams Adaptive Cards · Power Automate",
    resources: [
      { title: "Work with entities and variables in Copilot Studio", url: "https://learn.microsoft.com/en-us/microsoft-copilot-studio/" },
      { title: "Build effective agents with Copilot Studio", url: "https://learn.microsoft.com/en-us/microsoft-copilot-studio/" },
      { title: "Enhance Microsoft Copilot Studio agents", url: "https://learn.microsoft.com/en-us/microsoft-copilot-studio/" },
    ],
    skillValidated: "Agent loop design + assistive boundaries",
  },
  {
    id: "day3",
    day: "Day 3",
    theme: "Prompt Engineering & Safe Routing",
    week: "W1",
    topics: [
      "Query rewriting & expansion",
      "Context-aware prompt enhancement",
      "PII & language detection",
      "Prompt libraries & versioning",
      "Prompt injection defenses",
      "Copilot Studio: Prompt actions & fallback strategies",
    ],
    handsOn: "USE CASE: Customer Support Agent for a Retail Banking Client\n\nBuild a Copilot Studio banking support agent. Create versioned prompt library in Azure Blob Storage (5 scenarios: balance, loan, dispute, branch, escalation). Implement PII detection via Azure AI Content Safety - mask account numbers before LLM. Add injection defenses: reject 'ignore previous instructions'. Fallback: if confidence < threshold, route to live agent via Power Automate.",
    tools: "Copilot Studio · Azure AI Content Safety · Azure Blob Storage · Power Automate",
    resources: [
      { title: "Build an Autonomous Agent in Copilot Studio", url: "https://learn.microsoft.com/en-us/microsoft-copilot-studio/" },
      { title: "Guided Project – Create agents with Copilot Studio", url: "https://learn.microsoft.com/en-us/training/" },
      { title: "Azure AI Content Safety overview", url: "https://learn.microsoft.com/en-us/azure/ai-services/content-safety/" },
    ],
    skillValidated: "Prompt engineering + safe design (policy compliant)",
  },
  {
    id: "day4",
    day: "Day 4 ★",
    theme: "Memory, Knowledge & Grounding",
    week: "W1",
    isHighlight: true,
    topics: [
      "Short-term vs Long-term memory",
      "Episodic vs Semantic memory",
      "Stateful vs stateless agents",
      "Vector stores & embeddings",
      "Copilot Studio Knowledge Sources",
      "Grounding data quality & access control",
    ],
    handsOn: "USE CASE: Sales Intelligence Agent Grounded on CRM Data\n\nUsing Azure AI Foundry Agent Service, build a Sales Intelligence Agent for B2B sales. Ingest 3 months of D365 Sales opportunity records into Azure AI Search (vector + keyword). Configure short-term memory (last 5 turns) and long-term episodic memory (deal summaries in Dataverse). Test: 'What were blockers for Contoso deal?' - should retrieve, NOT fabricate. Enforce row-level security per salesperson.",
    tools: "Azure AI Foundry · Azure AI Search · Dynamics 365 Sales · Dataverse",
    resources: [
      { title: "Orchestrate multi-agent solution – Semantic Kernel", url: "https://learn.microsoft.com/en-us/semantic-kernel/" },
      { title: "Develop multi-agent solution – Azure AI Foundry", url: "https://learn.microsoft.com/en-us/azure/ai-studio/" },
      { title: "Integrate MCP Tools with Azure AI Agents", url: "https://learn.microsoft.com/en-us/azure/ai-services/" },
    ],
    skillValidated: "Grounding quality and responsible response patterns",
  },
  {
    id: "day5",
    day: "Day 5 ★",
    theme: "RAG Design & Enterprise ROI",
    week: "W1",
    isHighlight: true,
    topics: [
      "FAISS & vector databases",
      "Hybrid RAG (semantic + keyword)",
      "Re-ranking & relevance scoring",
      "Retrieval strategies per agent role",
      "Build vs Buy vs Extend decision",
      "ROI & TCO frameworks, AI success metrics",
    ],
    handsOn: "USE CASE: Legal Document Review Agent with Hybrid RAG\n\nBuild a Legal Document Review Agent using Azure AI Foundry + Azure AI Search. Upload 50 contract PDFs to Azure Blob Storage, chunk and embed into AI Search with semantic + keyword indexes. Implement Hybrid RAG + semantic re-ranker. Complete Build vs Buy vs Extend analysis: custom RAG vs third-party legal AI SaaS. Fill ROI template: baseline 2 hrs manual → 20 min agent, calculate savings × volume × rate.",
    tools: "Azure AI Foundry · Azure AI Search · Azure Blob Storage · Excel ROI template",
    resources: [
      { title: "Azure AI Search – Hybrid search overview", url: "https://learn.microsoft.com/en-us/azure/search/" },
      { title: "Azure AI Search – Semantic ranking", url: "https://learn.microsoft.com/en-us/azure/search/" },
      { title: "AB-100 Study Guide – ROI & business value", url: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-100" },
    ],
    skillValidated: "Real enterprise agent scenario definition",
  },
  {
    id: "day6",
    day: "Day 6",
    theme: "Tool Use & Action Design",
    week: "W2",
    topics: [
      "Tool calling fundamentals",
      "Tool schema design (JSON)",
      "Safe execution & error handling",
      "Copilot Studio: Actions, Entities, Variables",
      "Conversation routing, Fallback design",
    ],
    handsOn: "USE CASE: Project Status Agent with Live Data Actions\n\nBuild a PMO Project Status Agent in Copilot Studio. Connect 3 live actions: (1) Power Automate flow → Azure DevOps sprint burndown, (2) Microsoft Graph API → calendar milestone dates, (3) Dataverse custom action → risk register entries. Design JSON tool schemas with required/optional params and error responses. Safe fallback: if DevOps API errors, offer last cached status.",
    tools: "Copilot Studio · Power Automate · Azure DevOps · Microsoft Graph API · Dataverse",
    resources: [
      { title: "Create agent with Copilot Studio and Dataverse for Teams", url: "https://learn.microsoft.com/en-us/microsoft-copilot-studio/" },
      { title: "Microsoft Graph API documentation", url: "https://learn.microsoft.com/en-us/graph/" },
      { title: "Power Automate – Connector reference", url: "https://learn.microsoft.com/en-us/connectors/" },
    ],
    skillValidated: "Custom agents leverage connectors/actions",
  },
  {
    id: "day7",
    day: "Day 7 ★",
    theme: "Multi-Agent Orchestration & Standards",
    week: "W2",
    isHighlight: true,
    topics: [
      "Supervisor–Worker pattern",
      "Debate agents",
      "Role-based collaboration",
      "Event-driven agents",
      "Communication channels & Agent isolation",
      "Agent2Agent (A2A) protocol",
      "Model Context Protocol (MCP)",
    ],
    handsOn: "USE CASE: End-to-End Procurement Approval System (Multi-Agent)\n\nBuild a 3-agent procurement system in Azure AI Foundry. Agent 1 (Intake - Copilot Studio): receives Teams purchase requests, extracts vendor/amount/category. Agent 2 (Policy - Foundry): checks rules in Azure AI Search (>$10K = 3 quotes). Agent 3 (Orchestrator - Foundry): determines routing (auto <$500, manager $500–$5K, CFO >$5K), triggers Power Automate approval. Wire A2A between Foundry agents. Add MCP tool for SAP vendor master data.",
    tools: "Azure AI Foundry · Copilot Studio · Power Automate · Azure AI Search · MCP server",
    resources: [
      { title: "Develop multi-agent solution – Azure AI Foundry", url: "https://learn.microsoft.com/en-us/azure/ai-studio/" },
      { title: "Integrate MCP Tools with Azure AI Agents", url: "https://learn.microsoft.com/en-us/azure/ai-services/" },
      { title: "Azure AI Foundry Agent Service documentation", url: "https://learn.microsoft.com/en-us/azure/ai-services/" },
    ],
    skillValidated: "Design multi-agent orchestrated solutions",
  },
  {
    id: "day8",
    day: "Day 8 ★",
    theme: "Frameworks & Model Selection",
    week: "W2",
    isHighlight: true,
    topics: [
      "Semantic Kernel (skills, memory, planners)",
      "Microsoft Foundry agents & models",
      "AutoGen multi-agent framework",
      "Model router design",
      "Small vs foundation models trade-offs",
    ],
    handsOn: "USE CASE: Intelligent Code Review Agent with Model Routing\n\nUsing Semantic Kernel (Python SDK), build a Code Review Agent. Define 3 SK plugins: (1) CodeQualityPlugin → Azure OpenAI GPT-4o (bugs, design), (2) DocstringPlugin → Phi-4 via Azure AI Foundry (fast, low cost), (3) SecurityScanPlugin → Azure Function (static analysis). Implement model router: complex review → GPT-4o, docstrings → Phi-4, security → Azure Function. Compare latency + token cost across 10 PRs.",
    tools: "Semantic Kernel Python SDK · Azure OpenAI (GPT-4o) · Azure AI Foundry (Phi-4) · Azure Functions",
    resources: [
      { title: "Orchestrate multi-agent solution – Semantic Kernel", url: "https://learn.microsoft.com/en-us/semantic-kernel/" },
      { title: "Azure AI Foundry – Model catalog", url: "https://learn.microsoft.com/en-us/azure/ai-studio/" },
      { title: "Semantic Kernel Python SDK – GitHub", url: "https://github.com/microsoft/semantic-kernel" },
    ],
    skillValidated: "Route requests to suitable model; plan costs",
  },
  {
    id: "day9",
    day: "Day 9",
    theme: "Microsoft Ecosystem Integration",
    week: "W2",
    topics: [
      "Agents with Dynamics 365 (Sales, Service)",
      "Microsoft 365 agents (Teams, SharePoint)",
      "Power Platform AI Hub",
      "In-app Copilot extensibility",
      "Finance & Supply Chain agent scenarios",
    ],
    handsOn: "USE CASE: Sales Opportunity Intelligence Agent in D365 + M365\n\nPart A - D365: Build Copilot Studio agent inside D365 Sales. On opportunity open: summarise emails (Graph), surface similar won deals (AI Search), suggest next best action. Configure as in-app Copilot extension.\n\nPart B - Teams: Extend to Teams channel. Manager asks 'Which deals are at risk this quarter?' - agent queries D365 via Power Automate, formats Adaptive Card, posts to channel.",
    tools: "Copilot Studio · Dynamics 365 Sales · Microsoft Graph · Azure AI Search · Teams · Power Automate",
    resources: [
      { title: "Microsoft Sales Copilot documentation", url: "https://learn.microsoft.com/en-us/viva/sales/" },
      { title: "Extend Microsoft 365 Copilot with Copilot Studio", url: "https://learn.microsoft.com/en-us/microsoft-365-copilot/" },
      { title: "Teams – Build bots and agents", url: "https://learn.microsoft.com/en-us/microsoftteams/" },
    ],
    skillValidated: "Real business agent patterns and structured capture",
  },
  {
    id: "day10",
    day: "Day 10",
    theme: "Deployment, Security & ALM",
    week: "W2",
    topics: [
      "Stateless vs stateful deployment on Azure",
      "Enterprise deployment & scaling patterns",
      "ALM for Copilot Studio / Foundry / custom agents",
      "Environment strategy (Dev/Test/Prod)",
      "Agent security: data residency, access controls, prompt defenses",
      "Audit trails, change tracking, Microsoft Responsible AI",
    ],
    handsOn: "USE CASE: Promoting Procurement Agent from Dev to Production\n\nStep 1 - Environments: create Dev/Test/Prod in Power Platform Admin Center with separate Dataverse DBs.\nStep 2 - CI/CD: Azure DevOps Pipeline to export Copilot Studio solution, run automated tests, promote on approval.\nStep 3 - Security: Azure Private Endpoints, Managed Identity auth, Azure Monitor diagnostic logs, conditional access.\nStep 4 - STRIDE threat model: Spoofing/Tampering/Repudiation/Info Disclosure/DoS/Elevation - document all mitigations.",
    tools: "Power Platform Admin Center · Azure DevOps Pipelines · Azure Monitor · Azure Private Endpoints · Managed Identity",
    resources: [
      { title: "ALM with Microsoft Power Platform", url: "https://learn.microsoft.com/en-us/power-platform/alm/" },
      { title: "Azure DevOps Pipelines documentation", url: "https://learn.microsoft.com/en-us/azure/devops/pipelines/" },
      { title: "Azure Private Endpoints for AI services", url: "https://learn.microsoft.com/en-us/azure/private-link/" },
    ],
    skillValidated: "Safe execution, audit trails, cohesive ALM + environment strategy",
  },
  {
    id: "day11",
    day: "Day 11 ★",
    theme: "Observability, Evaluation & Tuning",
    week: "W2",
    isHighlight: true,
    topics: [
      "Logging, tracing & metrics",
      "Telemetry interpretation",
      "Agent performance KPIs",
      "Copilot Studio Analytics",
      "Azure Application Insights for agent traces",
      "Feedback-driven tuning",
    ],
    handsOn: "USE CASE: Diagnosing & Improving the IT Helpdesk Agent (Day 1)\n\nStep 1 - Tracing: connect Copilot Studio to Azure Application Insights; custom events per turn (intent, knowledge hit/miss, action, escalation).\nStep 2 - Dashboard: Azure Monitor Workbooks tracking containment rate, avg turns, top 3 unanswered intents, knowledge hit rate.\nStep 3 - Analyse: run 20 test conversations, identify 3 failure patterns from traces.\nStep 4 - Tune: fix each failure (add topic / refine prompt / add fallback) and re-test. Document before/after metrics.",
    tools: "Copilot Studio Analytics · Azure Application Insights · Azure Monitor Workbooks",
    resources: [
      { title: "Analyse agent performance – Copilot Studio analytics", url: "https://learn.microsoft.com/en-us/microsoft-copilot-studio/" },
      { title: "Azure Application Insights overview", url: "https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview" },
      { title: "Azure Monitor Workbooks", url: "https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-overview" },
    ],
    skillValidated: "Monitor agent performance and interpret telemetry",
  },
  {
    id: "day12",
    day: "Day 12 ★",
    theme: "Responsible AI & Architecture Review",
    week: "W2",
    isHighlight: true,
    topics: [
      "End-to-end architecture walkthrough",
      "Threat modeling for agents",
      "Cost & scalability review",
      "Microsoft Responsible AI principles (Fairness, Reliability, Privacy, Inclusiveness, Transparency, Accountability)",
      "User-level data access enforcement",
    ],
    handsOn: "USE CASE: Responsible AI Audit of the Sales Intelligence Agent (Day 9)\n\nStep 1 - Fairness: test equal responses for junior vs senior salespeople; check bias in risk scoring.\nStep 2 - Privacy audit: verify Azure AI Search row-level security per salesperson. Test: prompt 'Show me Sarah's deals' - must refuse.\nStep 3 - Transparency: add AI-generated disclaimer footer citing knowledge source used.\nStep 4 - Peer review: present architecture diagram; reviewer completes Microsoft RAI Impact Assessment + AB-100 Responsible AI rubric. Fix ≥2 gaps per agent.",
    tools: "Azure AI Search (security trimming) · Copilot Studio · Microsoft RAI template · Entra ID",
    resources: [
      { title: "Microsoft Responsible AI principles", url: "https://www.microsoft.com/en-us/ai/principles-and-approach" },
      { title: "Azure AI Search – Security trimming", url: "https://learn.microsoft.com/en-us/azure/search/" },
      { title: "AB-100 Study Guide – Responsible AI domain", url: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-100" },
    ],
    skillValidated: "Responsible, secure, and scalable agent architecture",
  },
  {
    id: "capstone",
    day: "Days 13–14 ★",
    theme: "Capstone: Enterprise Agentic AI System",
    week: "W2",
    isCapstone: true,
    isHighlight: true,
    topics: [
      "Architecture diagram (Visio/Miro)",
      "Multi-agent system in Azure AI Foundry + Copilot Studio",
      "ALM checklist - Dev/Test/Prod pipeline in Azure DevOps",
      "Security & Responsible AI checklist (STRIDE + RAI sign-off)",
      "ROI summary - time saved, cost avoided, payback period",
    ],
    handsOn: "CAPSTONE: Intelligent Client Delivery Agent for MAQ Software\n\nTeams of 2–3 build: (1) Intake Agent in Copilot Studio (Teams) - takes natural language questions from managers. (2) Data Retrieval Agent in Azure AI Foundry - grounded on SharePoint project pages, Azure DevOps sprint data (MCP), D365 Project Operations timesheets. (3) Insight Orchestrator (Semantic Kernel) - synthesises all sources, Hybrid RAG via Azure AI Search, detects at-risk projects, generates HTML status report.\n\nAll agents: Azure AD auth, Application Insights logging, Dev→Test via Azure DevOps Pipelines.\n30-min demo: live query + architecture walkthrough + ROI presentation + security Q&A.",
    tools: "Copilot Studio · Azure AI Foundry · Semantic Kernel · Azure AI Search · SharePoint · Azure DevOps · D365 Project Operations · Application Insights · Power Automate",
    resources: [
      { title: "AB-100 Study Guide – Full exam skill areas", url: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-100" },
      { title: "Azure AI Foundry documentation", url: "https://learn.microsoft.com/en-us/azure/ai-studio/" },
      { title: "Copilot Studio – Solution export & ALM", url: "https://learn.microsoft.com/en-us/microsoft-copilot-studio/" },
      { title: "Semantic Kernel documentation", url: "https://learn.microsoft.com/en-us/semantic-kernel/" },
    ],
    skillValidated: "Full AB-100 skills coverage + production-ready Microsoft agentic AI engineering",
  },
];

const referenceResources = [
  { title: "Microsoft Copilot Studio", description: "Build, publish, and manage AI agents without code - primary low-code agent tool for MAQ's Microsoft-first stack", url: "https://learn.microsoft.com/en-us/training/paths/work-power-virtual-agents/", cost: "Free" },
  { title: "Azure AI Foundry", description: "Enterprise multi-agent orchestration, model deployment, RAG pipelines, evaluation, and governance on Azure", url: "https://learn.microsoft.com/en-us/azure/ai-studio/", cost: "Azure sub" },
  { title: "Semantic Kernel SDK", description: "Microsoft's open-source SDK for agentic AI with plugins, memory, and model routing in C# and Python", url: "https://learn.microsoft.com/en-us/semantic-kernel/overview/", cost: "Free (OSS)" },
  { title: "Azure AI Search", description: "Hybrid semantic + keyword vector search for grounding agents on enterprise data with security trimming", url: "https://learn.microsoft.com/en-us/azure/search/", cost: "Azure sub" },
  { title: "AB-100 Study Guide", description: "Microsoft's official study guide: planning, designing, deploying, and governing agentic AI solutions", url: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-100", cost: "Free" },
  { title: "Power Platform ALM", description: "ALM for Power Platform and Copilot Studio solutions across Dev/Test/Prod environments", url: "https://learn.microsoft.com/en-us/power-platform/alm/overview-alm", cost: "Free" },
  { title: "HF Agents Course", description: "Supplementary theory: agent loop, planning patterns, RAG design - Units 0–3 (smolagents, LangGraph, LlamaIndex)", url: "https://huggingface.co/learn/agents-course/en/unit0/introduction", cost: "Free" },
  { title: "DeepLearning.AI – Agentic AI", description: "Andrew Ng's short course: Reflection, Tool Use, Planning, and Multi-Agent Collaboration patterns", url: "https://www.deeplearning.ai/short-courses/ai-agentic-design-patterns-with-autogen/", cost: "Free (audit)" },
  { title: "Microsoft Responsible AI", description: "Microsoft's Responsible AI principles: Fairness, Reliability, Privacy, Inclusiveness, Transparency, Accountability", url: "https://www.microsoft.com/en-us/ai/principles-and-approach", cost: "Free" },
];

const expectedOutcomes = [
  "Build and deploy production-ready agents using Copilot Studio, Azure AI Foundry, and Semantic Kernel across real enterprise use cases",
  "Design multi-agent architectures using Azure AI Foundry Agent Service with A2A and MCP standards, integrated with D365 and M365",
  "Implement Hybrid RAG pipelines on Azure AI Search and ground agents on enterprise data with row-level security",
  "Apply full ALM: Dev/Test/Prod environments in Azure DevOps with automated Copilot Studio solution promotion pipelines",
  "Monitor and tune agents using Azure Application Insights, Copilot Studio Analytics, and Azure Monitor Workbooks",
  "Complete a capstone Microsoft-stack Client Delivery Agent with architecture diagram, STRIDE threat model, Responsible AI checklist, and ROI summary - covering all AB-100 exam domains",
];

const programOverview = [
  { component: "Week 1 (Days 1–5)", description: "Foundations: Agent concepts, planning, prompt engineering, memory, grounding, RAG, ROI - all labs use Copilot Studio, Azure AI Foundry, Azure AI Search, and Dataverse" },
  { component: "Week 2 (Days 6–12)", description: "Engineering & Enterprise: Tool use, multi-agent orchestration, Semantic Kernel, D365/M365 integration, ALM with Azure DevOps, observability with Application Insights - aligned with AB-100 exam domains" },
  { component: "Days 13–14 Capstone", description: "Teams build a full Client Delivery Agent on Azure + M365 stack with live demo, architecture review, and ROI presentation" },
  { component: "Daily Format", description: "~9 hrs/day: 3 hrs theory + 4 hrs hands-on lab + 1 hr review/Q&A + 20 min self-paced MS Learn + 20 min assignment + 20 min open problem solving" },
  { component: "Microsoft Tools", description: "Copilot Studio · Azure AI Foundry · Azure AI Search · Semantic Kernel · Azure OpenAI · Dynamics 365 · Microsoft Teams · Power Automate · SharePoint · Azure DevOps · Application Insights · Dataverse · Microsoft Graph" },
];

type COETab = "overview" | "week1" | "week2" | "capstone" | "resources" | "progress";

const coeTabConfig: { id: COETab; label: string; icon: React.ReactNode; count?: number }[] = [
  { id: "overview", label: "Overview", icon: <Rocket className="w-4 h-4" /> },
  { id: "resources", label: "Resources", icon: <FileText className="w-4 h-4" />, count: 9 },
  { id: "progress", label: "My Progress", icon: <ClipboardList className="w-4 h-4" /> },
];

export const COETrainingGrid: FC = () => {
  const { accounts } = useAuth();
  const userEmail = accounts[0]?.username || "anonymous";
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<COETab>("overview");
  const [progress, setProgress] = useState<TrainingProgress>(() => loadProgress(userEmail));

  const updateProgress = useCallback((updater: (prev: TrainingProgress) => TrainingProgress) => {
    setProgress(prev => {
      const next = updater(prev);
      saveProgress(userEmail, next);
      return next;
    });
  }, [userEmail]);

  const module = selectedModule ? coeModules.find((m) => m.id === selectedModule) : null;

  if (module) {
    return (
      <COEModuleDetail
        module={module}
        onBack={() => setSelectedModule(null)}
        progress={progress}
        onUpdateProgress={updateProgress}
      />
    );
  }

  return (
    <div className="animate-leap-fade-in-up">
      {/* Compact Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Rocket className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground leading-tight">Agentic AI: 2-Week Training Plan</h2>
          <p className="text-xs text-muted-foreground mt-0.5">MAQ Software · Microsoft Stack · 14 Days · AB-100 Aligned</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-border pb-px overflow-x-auto">
        {coeTabConfig.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-leap-fade-in-up">
        {activeTab === "overview" && <COEOverviewTab onWeekSelect={(week) => setActiveTab(week)} />}
        {(activeTab === "week1" || activeTab === "week2" || activeTab === "capstone") && (
          <div className="space-y-4">
            <button
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Overview
            </button>
            {activeTab === "week1" && <COEWeekTab week="W1" modules={coeModules.filter(m => m.week === "W1")} onSelect={setSelectedModule} progress={progress} />}
            {activeTab === "week2" && <COEWeekTab week="W2" modules={coeModules.filter(m => m.week === "W2" && !m.isCapstone)} onSelect={setSelectedModule} progress={progress} />}
            {activeTab === "capstone" && <COEWeekTab week="W2" modules={coeModules.filter(m => m.isCapstone)} onSelect={setSelectedModule} progress={progress} />}
          </div>
        )}
        {activeTab === "resources" && <COEResourcesTab />}
        {activeTab === "progress" && <COEProgressDashboard progress={progress} onUpdateProgress={updateProgress} />}
      </div>
    </div>
  );
};

/* ── Overview Tab ──────────────────────────────────── */
const COEOverviewTab: FC<{ onWeekSelect: (week: COETab) => void }> = ({ onWeekSelect }) => {
  const clickableRows: Record<string, COETab> = {
    "Week 1 (Days 1–5)": "week1",
    "Week 2 (Days 6–12)": "week2",
    "Days 13–14 Capstone": "capstone",
  };

  return (
  <div className="space-y-6 w-full">
    {/* Quick Stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: "Duration", value: "14 Days", icon: <Calendar className="w-4 h-4" /> },
        { label: "Daily Load", value: "~9 hrs", icon: <Clock className="w-4 h-4" /> },
        { label: "Modules", value: "13", icon: <BookOpen className="w-4 h-4" /> },
        { label: "Hands-On Labs", value: "13", icon: <Play className="w-4 h-4" /> },
      ].map((stat, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="flex justify-center mb-2 text-primary">{stat.icon}</div>
          <p className="text-lg font-bold text-foreground">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>

    {/* Program Structure */}
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        Program Structure
      </h3>
      <div className="space-y-2">
        {programOverview.map((item, i) => {
          const target = clickableRows[item.component];
          if (target) {
            return (
              <button
                key={i}
                onClick={() => onWeekSelect(target)}
                className="w-full text-left flex items-center gap-3 py-3 px-4 rounded-lg border border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.07] hover:border-primary/35 transition-all group"
              >
                <div className="w-1 h-8 rounded-full bg-primary/60 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-primary">{item.component}</span>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-primary/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            );
          }
          return (
            <div key={i} className="flex gap-3 py-2.5 border-b border-border/50 last:border-0">
              <span className="text-xs font-semibold text-primary whitespace-nowrap min-w-[140px]">{item.component}</span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </div>
          );
        })}
      </div>
    </div>

    {/* Expected Outcomes */}
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        Expected Outcomes After 2 Weeks
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {expectedOutcomes.map((outcome, i) => (
          <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-xs text-foreground leading-relaxed">{outcome}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-border">
        MAQ Software - Internal Training Document | Sources: HF Agents Course · DeepLearning.AI · Microsoft Learn AB-100 · MAQ AgenticAIPlan.xlsx
      </p>
    </div>
  </div>
  );
};

/* ── Week Tab ──────────────────────────────────────── */
const COEWeekTab: FC<{ week: string; modules: COEModule[]; onSelect: (id: string) => void; progress: TrainingProgress }> = ({ week, modules, onSelect, progress }) => {
  const regularModules = modules.filter(m => !m.isCapstone);
  const capstoneModules = modules.filter(m => m.isCapstone);
  const weekLabel = week === "W1" ? "Foundations" : "Engineering & Enterprise";
  const weekDesc = week === "W1"
    ? "Agent concepts, planning, prompt engineering, memory, grounding, RAG, ROI"
    : "Tool use, multi-agent orchestration, Semantic Kernel, D365/M365, ALM, observability";

  return (
    <div className="space-y-4">
      {/* Week intro */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary">{week}</span>
        <div>
          <span className="text-sm font-semibold text-foreground">{weekLabel}</span>
          <span className="text-xs text-muted-foreground ml-2">- {weekDesc}</span>
        </div>
      </div>

      {/* Module list */}
      <div className="space-y-2">
        {regularModules.map((m, i) => (
          <COEModuleRow key={m.id} module={m} index={i} onClick={() => onSelect(m.id)} progress={progress} />
        ))}
      </div>

      {/* Capstone */}
      {capstoneModules.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Capstone Project</span>
          </div>
          {capstoneModules.map((m, i) => (
            <COEModuleRow key={m.id} module={m} index={i} onClick={() => onSelect(m.id)} isCapstone progress={progress} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Resources Tab ─────────────────────────────────── */
const COEResourcesTab: FC = () => (
  <div className="space-y-3">
    {referenceResources.map((r, i) => (
      <a
        key={i}
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <ExternalLink className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{r.title}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">{r.cost}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-all" />
      </a>
    ))}
  </div>
);

const coeIconMap: Record<string, React.ReactNode> = {
  day1: <Brain className="w-4 h-4" />,
  day2: <Workflow className="w-4 h-4" />,
  day3: <MessageSquare className="w-4 h-4" />,
  day4: <Database className="w-4 h-4" />,
  day5: <Target className="w-4 h-4" />,
  day6: <Cog className="w-4 h-4" />,
  day7: <Bot className="w-4 h-4" />,
  day8: <Sparkles className="w-4 h-4" />,
  day9: <Workflow className="w-4 h-4" />,
  day10: <Shield className="w-4 h-4" />,
  day11: <Target className="w-4 h-4" />,
  day12: <CheckCircle2 className="w-4 h-4" />,
  capstone: <Award className="w-4 h-4" />,
};

const COEModuleRow: FC<{ module: COEModule; index: number; onClick: () => void; isCapstone?: boolean; progress: TrainingProgress }> = ({ module, index, onClick, isCapstone, progress }) => {
  const dayProgress = progress.days[module.id];
  const completedCount = dayProgress?.topicsCompleted?.filter(Boolean).length ?? 0;
  const totalCount = module.topics.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
  <div
    className="flex items-center gap-4 group"
    style={{ animationDelay: `${index * 60}ms`, animation: "fadeInUp 0.4s ease-out both" }}
  >
    {/* Card */}
    <button
      onClick={onClick}
      className="text-left flex-1 w-full"
    >
      <div className={`flex items-center gap-4 p-3.5 rounded-lg border transition-all ${
        isCapstone
          ? "bg-primary/[0.03] border-primary/15 hover:border-primary/30 hover:bg-primary/[0.06]"
          : "bg-card border-border hover:border-primary/25 hover:bg-muted/40"
      }`}>
        {/* Icon */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isCapstone ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"
        }`}>
          {coeIconMap[module.id] || <BookOpen className="w-4 h-4" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {module.theme}
            </span>
            {module.isHighlight && (
              <Star className="w-3 h-3 text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{module.skillValidated}</p>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
            isCapstone ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            {module.day}
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">{module.topics.length} topics</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
        </div>
      </div>
    </button>

    {/* Progress ring — outside card, in the right empty space */}
    <div className="flex flex-col items-center flex-shrink-0 w-20">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3"
            className={percent === 100 ? "stroke-emerald-100" : percent > 0 ? "stroke-red-100" : "stroke-gray-200"} />
          <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${percent * 0.88} 88`}
            className={percent === 100 ? "stroke-emerald-500" : percent > 0 ? "stroke-red-500" : "stroke-transparent"}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums ${
          percent === 100 ? "text-emerald-600" : percent > 0 ? "text-red-600" : "text-muted-foreground"
        }`}>{percent}%</span>
      </div>
      <span className={`text-[10px] font-medium mt-1 ${
        percent === 100 ? "text-emerald-600" : percent > 0 ? "text-red-500" : "text-muted-foreground"
      }`}>{completedCount}/{totalCount}</span>
    </div>
  </div>
  );
};

const COEModuleDetail: FC<{
  module: COEModule;
  onBack: () => void;
  progress: TrainingProgress;
  onUpdateProgress: (updater: (prev: TrainingProgress) => TrainingProgress) => void;
}> = ({ module, onBack, progress, onUpdateProgress }) => {
  const [activeSection, setActiveSection] = useState<"topics" | "lab" | "resources">("topics");
  const currentIndex = coeModules.findIndex(m => m.id === module.id);
  const dayProgress = progress.days[module.id];
  const completedCount = dayProgress?.topicsCompleted.filter(Boolean).length || 0;
  const totalCount = module.topics.length;

  const toggleTopic = (topicIdx: number) => {
    onUpdateProgress(prev => {
      const dp = { ...prev.days[module.id] };
      const tc = [...dp.topicsCompleted];
      tc[topicIdx] = !tc[topicIdx];
      dp.topicsCompleted = tc;
      // Auto-update status based on completion
      const doneCount = tc.filter(Boolean).length;
      if (doneCount === 0) dp.status = "not-started";
      else if (doneCount === tc.length) dp.status = "complete";
      else dp.status = "in-progress";
      return { ...prev, days: { ...prev.days, [module.id]: dp } };
    });
  };

  return (
    <div className="animate-leap-fade-in-up">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/50 transition-all group text-sm font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          All Modules
        </button>

        {/* Prev / Next navigation */}
        <div className="flex items-center gap-1">
          {currentIndex > 0 && (
            <button
              onClick={() => { onBack(); setTimeout(() => {}, 0); }}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded"
              title="Previous module"
            >
              <span className="text-[10px] text-muted-foreground">{currentIndex + 1} of {coeModules.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            {coeIconMap[module.id] || <BookOpen className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-foreground">{module.theme}</h1>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{module.day}</span>
            </div>
            <p className="text-xs text-muted-foreground">{module.skillValidated}</p>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border pb-px">
        {([
          { id: "topics" as const, label: "Topics", icon: <GraduationCap className="w-3.5 h-3.5" />, count: module.topics.length },
          { id: "lab" as const, label: "Hands-On Lab", icon: <Play className="w-3.5 h-3.5" /> },
          { id: "resources" as const, label: "References", icon: <BookOpen className="w-3.5 h-3.5" />, count: module.resources.length },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 -mb-px ${
              activeSection === tab.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeSection === tab.id ? "bg-primary/15" : "bg-muted"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="animate-leap-fade-in-up">
        {activeSection === "topics" && (
          <div className="space-y-3">
            {/* Topic completion bar */}
            <div className="flex items-center gap-3 px-1 mb-1">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {completedCount}/{totalCount} completed
              </span>
            </div>
            {module.topics.map((topic, i) => {
              const done = dayProgress?.topicsCompleted[i] || false;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    done
                      ? "bg-primary/5 border-primary/20"
                      : "bg-card border-border"
                  }`}
                >
                  <span className="text-sm flex-1 min-w-0 text-foreground">{topic}</span>
                  <button
                    onClick={() => toggleTopic(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium flex-shrink-0 transition-all ${
                      done
                        ? "bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {done ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Completed</>
                    ) : (
                      <>Mark as completed</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeSection === "lab" && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="prose prose-sm max-w-none">
              {module.handsOn.split('\n\n').map((paragraph, i) => (
                <p key={i} className="text-sm text-foreground mb-3 last:mb-0 whitespace-pre-line leading-relaxed">{paragraph}</p>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-[11px] font-semibold text-primary mb-1">TOOLS</p>
              <p className="text-xs text-muted-foreground">{module.tools}</p>
            </div>
          </div>
        )}

        {activeSection === "resources" && (
          <div className="space-y-2">
            {module.resources.map((res, i) => (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/25 hover:bg-primary/[0.02] transition-all group"
              >
                <ExternalLink className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors flex-1">{res.title}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Star Rating Component ───────────────────────── */
const StarRating: FC<{ value: number; onChange: (v: number) => void; max?: number }> = ({ value, onChange, max = 4 }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: max }, (_, i) => (
      <button
        key={i}
        onClick={() => onChange(value === i + 1 ? 0 : i + 1)}
        className="p-0 transition-colors"
        title={`${i + 1} star${i > 0 ? "s" : ""}`}
      >
        <Star className={`w-4 h-4 ${i < value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      </button>
    ))}
  </div>
);

/* ─── Status Badge ─────────────────────────────────── */
const statusConfig: Record<DayStatus, { label: string; icon: React.ReactNode; className: string }> = {
  "not-started": { label: "Not Started", icon: null, className: "bg-muted text-muted-foreground" },
  "in-progress": { label: "In Progress", icon: <RotateCcw className="w-3 h-3" />, className: "bg-blue-100 text-blue-700" },
  "complete": { label: "Complete", icon: <Check className="w-3 h-3" />, className: "bg-green-100 text-green-700" },
  "needs-review": { label: "Needs Review", icon: <AlertTriangle className="w-3 h-3" />, className: "bg-amber-100 text-amber-700" },
};

const nextActionConfig: Record<string, { label: string; className: string }> = {
  "": { label: "—", className: "text-muted-foreground" },
  "proceed": { label: "✅ Proceed", className: "text-green-700" },
  "revise": { label: "🔁 Revise & Resubmit", className: "text-amber-700" },
  "needs-review": { label: "⚠ Needs Review", className: "text-orange-600" },
};

const StatusBadge: FC<{ status: DayStatus }> = ({ status }) => {
  const cfg = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

/* ─── Progress Dashboard ──────────────────────────── */
const COEProgressDashboard: FC<{
  progress: TrainingProgress;
  onUpdateProgress: (updater: (prev: TrainingProgress) => TrainingProgress) => void;
}> = ({ progress, onUpdateProgress }) => {
  const { accounts } = useAuth();
  const userName = accounts[0]?.name || "Engineer";

  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Computed stats
  const stats = useMemo(() => {
    let daysComplete = 0;
    let totalConceptScore = 0;
    let conceptScoreCount = 0;
    let totalTopics = 0;
    let completedTopics = 0;

    for (const m of coeModules) {
      const dp = progress.days[m.id];
      if (!dp) continue;
      if (dp.status === "complete") daysComplete++;
      if (dp.conceptScore > 0) { totalConceptScore += dp.conceptScore; conceptScoreCount++; }
      totalTopics += dp.topicsCompleted.length;
      completedTopics += dp.topicsCompleted.filter(Boolean).length;
    }

    const percentDone = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    const avgConcept = conceptScoreCount > 0 ? (totalConceptScore / conceptScoreCount).toFixed(1) : "—";

    return { daysComplete, percentDone, avgConcept, completedTopics, totalTopics };
  }, [progress]);

  const updateDay = (moduleId: string, field: keyof DayProgress, value: unknown) => {
    onUpdateProgress(prev => ({
      ...prev,
      days: { ...prev.days, [moduleId]: { ...prev.days[moduleId], [field]: value } },
    }));
  };

  const updateCapstone = (field: keyof CapstoneProgress, value: number) => {
    onUpdateProgress(prev => ({
      ...prev,
      capstone: { ...prev.capstone, [field]: value },
    }));
  };

  const week1Modules = coeModules.filter(m => m.week === "W1");
  const week2Regular = coeModules.filter(m => m.week === "W2" && !m.isCapstone);
  const capstoneModule = coeModules.find(m => m.isCapstone);

  return (
    <div className="space-y-6 animate-leap-fade-in-up">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Agentic AI Training — Engineer Progress Tracker</h3>
            <p className="text-xs text-muted-foreground mt-1">
              14-Day Program · Microsoft Stack · Mark topics complete, update scores after mentor interviews
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{userName}</p>
            <p className="text-[10px] text-muted-foreground">{accounts[0]?.username}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Progress", value: `${stats.percentDone}%`, sub: `${stats.completedTopics}/${stats.totalTopics} topics` },
            { label: "Days Complete", value: `${stats.daysComplete}`, sub: `of ${coeModules.length}` },
            { label: "Avg Concept Score", value: stats.avgConcept, sub: "out of 4" },
            { label: "Status", value: stats.percentDone === 100 ? "✅ Ready" : stats.percentDone > 0 ? "🔄 In Progress" : "Not Started", sub: "" },
          ].map((s, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              {s.sub && <p className="text-[9px] text-muted-foreground mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground">Overall Completion</span>
            <span className="text-[10px] font-bold text-primary">{stats.percentDone}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${stats.percentDone}%` }}
            />
          </div>
        </div>

        {/* Status Key */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <span className="text-[10px] font-semibold text-muted-foreground">KEY:</span>
          {Object.entries(statusConfig).filter(([k]) => k !== "not-started").map(([k, v]) => (
            <span key={k} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${v.className}`}>
              {v.icon} {v.label}
            </span>
          ))}
        </div>
      </div>

      {/* Week 1 */}
      <DayProgressSection
        title="Week 1 (Days 1–5)"
        subtitle="Foundations"
        modules={week1Modules}
        progress={progress}
        expandedDay={expandedDay}
        onToggle={setExpandedDay}
        onUpdateDay={updateDay}
      />

      {/* Week 2 */}
      <DayProgressSection
        title="Week 2 (Days 6–12)"
        subtitle="Engineering & Enterprise"
        modules={week2Regular}
        progress={progress}
        expandedDay={expandedDay}
        onToggle={setExpandedDay}
        onUpdateDay={updateDay}
      />

      {/* Capstone */}
      {capstoneModule && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-primary/5 border-b border-border flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Capstone (Days 13–14)</span>
            <StatusBadge status={progress.days[capstoneModule.id]?.status || "not-started"} />
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-foreground">{capstoneModule.theme}</span>
            </div>

            {/* Topic progress */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Topics: {progress.days[capstoneModule.id]?.topicsCompleted.filter(Boolean).length || 0}/{capstoneModule.topics.length} completed
              </p>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${capstoneModule.topics.length ? ((progress.days[capstoneModule.id]?.topicsCompleted.filter(Boolean).length || 0) / capstoneModule.topics.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Regular day fields */}
            <DayFieldsEditor
              moduleId={capstoneModule.id}
              dayProgress={progress.days[capstoneModule.id]}
              onUpdateDay={updateDay}
            />

            {/* Capstone-specific scores */}
            <div className="border-t border-border pt-4 mt-4">
              <p className="text-xs font-semibold text-foreground mb-3">Capstone Evaluation</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">Architecture ⭐</label>
                  <StarRating value={progress.capstone.archScore} onChange={v => updateCapstone("archScore", v)} />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">Presentation ⭐</label>
                  <StarRating value={progress.capstone.presentScore} onChange={v => updateCapstone("presentScore", v)} />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">Overall ⭐</label>
                  <StarRating value={progress.capstone.overallScore} onChange={v => updateCapstone("overallScore", v)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Day Progress Section (Week Group) ───────────── */
const DayProgressSection: FC<{
  title: string;
  subtitle: string;
  modules: COEModule[];
  progress: TrainingProgress;
  expandedDay: string | null;
  onToggle: (id: string | null) => void;
  onUpdateDay: (moduleId: string, field: keyof DayProgress, value: unknown) => void;
}> = ({ title, subtitle, modules, progress, expandedDay, onToggle, onUpdateDay }) => (
  <div className="bg-card border border-border rounded-xl overflow-hidden">
    <div className="px-5 py-3 bg-muted/30 border-b border-border">
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground ml-2">— {subtitle}</span>
    </div>
    <div className="divide-y divide-border">
      {modules.map(m => {
        const dp = progress.days[m.id];
        const done = dp?.topicsCompleted.filter(Boolean).length || 0;
        const total = m.topics.length;
        const isExpanded = expandedDay === m.id;

        return (
          <div key={m.id}>
            {/* Row summary */}
            <button
              onClick={() => onToggle(isExpanded ? null : m.id)}
              className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-muted/20 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                {coeIconMap[m.id] || <BookOpen className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{m.theme}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{m.day}</span>
                  {m.isHighlight && <Star className="w-3 h-3 text-primary" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{done}/{total}</span>
                </div>
              </div>
              <StatusBadge status={dp?.status || "not-started"} />
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="hidden sm:flex items-center gap-1" title="Concept">
                  <Star className={`w-3 h-3 ${dp?.conceptScore ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                  <span className="text-[10px] text-muted-foreground">{dp?.conceptScore || "—"}</span>
                </div>
                <div className="hidden sm:flex items-center gap-1" title="Lab">
                  <Play className={`w-3 h-3 ${dp?.labScore ? "fill-blue-400 text-blue-400" : "text-muted-foreground/30"}`} />
                  <span className="text-[10px] text-muted-foreground">{dp?.labScore || "—"}</span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-5 pb-4 pt-1 bg-muted/10 animate-leap-fade-in-up">
                <DayFieldsEditor moduleId={m.id} dayProgress={dp} onUpdateDay={onUpdateDay} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

/* ─── Day Fields Editor (Shared) ──────────────────── */
const DayFieldsEditor: FC<{
  moduleId: string;
  dayProgress: DayProgress | undefined;
  onUpdateDay: (moduleId: string, field: keyof DayProgress, value: unknown) => void;
}> = ({ moduleId, dayProgress, onUpdateDay }) => {
  if (!dayProgress) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Status */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground block mb-1">Status</label>
        <select
          value={dayProgress.status}
          onChange={e => onUpdateDay(moduleId, "status", e.target.value)}
          className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="not-started">Not Started</option>
          <option value="in-progress">🔄 In Progress</option>
          <option value="complete">✅ Complete</option>
          <option value="needs-review">⚠ Needs Review</option>
        </select>
      </div>

      {/* Next Action */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground block mb-1">Next Action</label>
        <select
          value={dayProgress.nextAction}
          onChange={e => onUpdateDay(moduleId, "nextAction", e.target.value)}
          className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">—</option>
          <option value="proceed">✅ Proceed</option>
          <option value="revise">🔁 Revise & Resubmit</option>
          <option value="needs-review">⚠ Needs Review</option>
        </select>
      </div>

      {/* Concept Score */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground block mb-1">Concept Score ⭐</label>
        <StarRating value={dayProgress.conceptScore} onChange={v => onUpdateDay(moduleId, "conceptScore", v)} />
      </div>

      {/* Lab Score */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground block mb-1">Lab Score ⭐</label>
        <StarRating value={dayProgress.labScore} onChange={v => onUpdateDay(moduleId, "labScore", v)} />
      </div>

      {/* Mentor Comment */}
      <div className="sm:col-span-2">
        <label className="text-[10px] font-medium text-muted-foreground block mb-1">Mentor Comment</label>
        <textarea
          value={dayProgress.mentorComment}
          onChange={e => onUpdateDay(moduleId, "mentorComment", e.target.value)}
          placeholder="Enter mentor feedback..."
          rows={2}
          className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
    </div>
  );
};

/* ─── Learning Content Components ─────────────────── */

/* ─── Courses Grid ───────────────────────────────────── */

const courses = [
  {
    id: "ai-fundamentals",
    title: "AI Fundamentals for Enterprise",
    description:
      "A 6-week program covering the foundations of artificial intelligence, machine learning, and their practical applications in enterprise settings.",
    duration: "6 weeks",
    level: "Beginner",
    enrolled: 1240,
    rating: 4.8,
    modules: 12,
    instructor: "Dr. Sarah Chen",
    topics: ["Machine Learning Basics", "Neural Networks", "NLP Fundamentals", "Computer Vision Intro", "Ethics in AI", "Deployment Strategies"],
  },
  {
    id: "prompt-engineering",
    title: "Advanced Prompt Engineering",
    description:
      "Master the art of crafting effective prompts for large language models. Learn techniques for chain-of-thought reasoning, few-shot learning, and structured outputs.",
    duration: "3 weeks",
    level: "Intermediate",
    enrolled: 890,
    rating: 4.9,
    modules: 8,
    instructor: "James Rodriguez",
    topics: ["Prompt Design Patterns", "Chain-of-Thought", "Few-Shot Learning", "System Prompts", "Output Formatting", "Evaluation Metrics"],
  },
  {
    id: "azure-ai-services",
    title: "Azure AI Services Deep Dive",
    description:
      "Comprehensive training on Azure's AI service portfolio including Cognitive Services, Azure ML, OpenAI integration, and AI Search.",
    duration: "4 weeks",
    level: "Intermediate",
    enrolled: 675,
    rating: 4.7,
    modules: 10,
    instructor: "Priya Kapoor",
    topics: ["Azure OpenAI Service", "Cognitive Services", "Azure ML Studio", "AI Search", "Form Recognizer", "Custom Vision"],
  },
  {
    id: "ml-ops",
    title: "MLOps & Model Lifecycle Management",
    description:
      "Learn to build, deploy, monitor, and maintain ML models at scale. Covers CI/CD for ML, model versioning, drift detection, and A/B testing.",
    duration: "5 weeks",
    level: "Advanced",
    enrolled: 420,
    rating: 4.6,
    modules: 14,
    instructor: "Marcus Thompson",
    topics: ["CI/CD for ML", "Model Versioning", "Drift Detection", "A/B Testing", "Feature Stores", "Monitoring"],
  },
];

/* ─── LDP Machine Learning Section ───────────────────── */

/* ─── LDP Machine Learning Section ───────────────────── */

export interface MlCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  specializationStatus: "Completed" | "In Progress" | "Not Started";
  totalModules: number;
  completedModules: number;
  totalQuizzes: number;
  completedQuizzes: number;
  description: string;
  key_features: string[];
  impact: string;
  portalUrl: string;
}

export const mlCourses: MlCourse[] = [
  {
    id: "ml-pe101",
    code: "ML-PE101",
    title: "Machine Learning",
    credits: 1,
    specializationStatus: "Completed",
    totalModules: 1,
    completedModules: 1,
    totalQuizzes: 0,
    completedQuizzes: 0,
    description: "Foundational course covering core machine learning concepts, algorithms, and practical applications for enterprise settings.",
    key_features: [
      "Introduction to supervised and unsupervised learning",
      "Data preprocessing and feature engineering",
      "Model evaluation metrics and validation techniques",
      "Classification and regression algorithms",
      "Hands-on projects with real-world datasets",
    ],
    impact: "Build a solid foundation in machine learning concepts, enabling you to identify and apply the right algorithms for various business problems.",
    portalUrl: "https://ldp.maqsoftware.com/tracks/specialization/12",
  },
  {
    id: "ml-pe102",
    code: "ML-PE102",
    title: "Designing and Implementing an Azure AI Solution",
    credits: 0.05,
    specializationStatus: "In Progress",
    totalModules: 0,
    completedModules: 0,
    totalQuizzes: 1,
    completedQuizzes: 0,
    description: "Learn to design and implement AI solutions using Azure AI services including Cognitive Services, Azure ML, and Azure OpenAI.",
    key_features: [
      "Azure AI service portfolio and architecture patterns",
      "Azure Machine Learning workspace setup and management",
      "Deploying models using Azure ML endpoints",
      "Integrating Azure Cognitive Services into applications",
      "Responsible AI practices on Azure",
    ],
    impact: "Master Azure AI services to design and implement scalable, enterprise-grade AI solutions on the Microsoft cloud platform.",
    portalUrl: "https://ldp.maqsoftware.com/tracks/specialization/34",
  },
  {
    id: "ml-pe104",
    code: "ML-PE104",
    title: "Statistics and Probability for Machine Learning",
    credits: 1,
    specializationStatus: "In Progress",
    totalModules: 2,
    completedModules: 0,
    totalQuizzes: 0,
    completedQuizzes: 0,
    description: "Master the statistical foundations and probability theory essential for understanding and building machine learning models.",
    key_features: [
      "Descriptive statistics and data distributions",
      "Probability theory and Bayes' theorem",
      "Hypothesis testing and confidence intervals",
      "Correlation, regression analysis, and statistical inference",
      "Applying statistical methods to ML model evaluation",
    ],
    impact: "Develop a strong mathematical foundation to make informed decisions about model selection, feature engineering, and result interpretation.",
    portalUrl: "https://ldp.maqsoftware.com/tracks/specialization/53",
  },
  {
    id: "ml-pe106",
    code: "ML-PE106",
    title: "Introduction to Machine Learning",
    credits: 1,
    specializationStatus: "Not Started",
    totalModules: 1,
    completedModules: 0,
    totalQuizzes: 1,
    completedQuizzes: 0,
    description: "A beginner-friendly introduction to machine learning covering key concepts, common algorithms, and practical use cases.",
    key_features: [
      "What is machine learning and its types",
      "Supervised vs unsupervised vs reinforcement learning",
      "Common ML algorithms and when to use them",
      "Model training, testing, and validation basics",
      "Real-world ML use cases and applications",
    ],
    impact: "Gain a clear understanding of machine learning fundamentals to kickstart your journey into data science and AI.",
    portalUrl: "https://ldp.maqsoftware.com/tracks/specialization/55",
  },
  {
    id: "ml-pe107",
    code: "ML-PE107",
    title: "Microsoft Applied AI & Business Solutions",
    credits: 0.1,
    specializationStatus: "Not Started",
    totalModules: 3,
    completedModules: 0,
    totalQuizzes: 0,
    completedQuizzes: 0,
    description: "Explore Microsoft's applied AI tools and business solutions including Power Platform AI Builder, Azure AI, and Copilot integrations.",
    key_features: [
      "AI Builder in Power Platform",
      "Microsoft Copilot integrations across M365",
      "Azure Applied AI Services for business",
      "Building intelligent business workflows",
      "AI-powered analytics and decision support",
    ],
    impact: "Learn to leverage Microsoft's applied AI ecosystem to solve real business challenges and drive digital transformation.",
    portalUrl: "https://ldp.maqsoftware.com/tracks/specialization/1115",
  },
];

const ldpTracks = [
  {
    id: "ldp-ml-track",
    label: "Machine Learning Track",
    description: "Click to view all machine learning courses from the LDP portal.",
    nestedItems: mlCourses,
  },
];

export const LdpGrid: FC<{ onTrackSelect?: (trackId: string) => void }> = ({ onTrackSelect }) => {
  return (
    <div className="space-y-6 animate-leap-fade-in-up">
      <div className="cards-grid-symmetric">
        {ldpTracks.map((t, i) => (
          <button
            key={t.id}
            onClick={() => onTrackSelect?.(t.id)}
            className="block group text-left w-full h-full"
            style={{ animationDelay: `${i * 80}ms`, animation: "fadeInUp 0.6s ease-out both" }}
          >
            <div className="relative domain-card p-6 h-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="flex flex-col h-full relative z-10">
                <div>
                  <h3 className="text-lg font-bold text-[#1a1a1a] mb-2 group-hover:text-primary transition-colors">
                    {t.label}
                  </h3>
                  <p className="text-[#6b7280] text-xs leading-relaxed mb-4 line-clamp-2">
                    {t.description}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-500" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export const CoursesGrid: FC = () => {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const course = selectedCourse ? courses.find((c) => c.id === selectedCourse) : null;

  if (course) {
    return <CourseDetail course={course} onBack={() => setSelectedCourse(null)} />;
  }

  return (
    <div className="space-y-6 animate-leap-fade-in-up">
      <div className="cards-grid-symmetric">
        {courses.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setSelectedCourse(c.id)}
            className="block group text-left w-full h-full"
            style={{ animationDelay: `${i * 80}ms`, animation: "fadeInUp 0.6s ease-out both" }}
          >
            <div className="relative domain-card p-6 h-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="flex flex-col h-full relative z-10">
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                      c.level === "Beginner" ? "bg-emerald-100 text-emerald-700" :
                      c.level === "Intermediate" ? "bg-blue-100 text-blue-700" :
                      "bg-purple-100 text-purple-700"
                    }`}>{c.level}</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {c.duration}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="text-lg font-bold text-[#1a1a1a] mb-2 group-hover:text-primary transition-colors">
                      {c.title}
                    </h3>
                    <p className="text-[#6b7280] text-xs leading-relaxed mb-4 line-clamp-2">
                      {c.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c.enrolled.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500" /> {c.rating}</span>
                      <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {c.modules} modules</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-500" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const CourseDetail: FC<{ course: typeof courses[0]; onBack: () => void }> = ({ course, onBack }) => (
  <div className="animate-leap-fade-in-up">
    <div className="bg-card border border-border rounded-xl p-6 md:p-8 mb-6">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{course.title}</h1>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
          course.level === "Beginner" ? "bg-emerald-100 text-emerald-700" :
          course.level === "Intermediate" ? "bg-blue-100 text-blue-700" :
          "bg-purple-100 text-purple-700"
        }`}>{course.level}</span>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-6">{course.description}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
          <div className="text-2xl font-bold text-primary">{course.modules}</div>
          <div className="text-xs text-muted-foreground mt-1">Modules</div>
        </div>
        <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
          <div className="text-2xl font-bold text-primary">{course.duration}</div>
          <div className="text-xs text-muted-foreground mt-1">Duration</div>
        </div>
        <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
          <div className="text-2xl font-bold text-primary">{course.enrolled.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">Enrolled</div>
        </div>
        <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
          <div className="text-2xl font-bold text-primary">{course.rating}</div>
          <div className="text-xs text-muted-foreground mt-1">Rating</div>
        </div>
      </div>
    </div>
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" /> Curriculum
        </h3>
        <div className="space-y-3">
          {course.topics.map((topic, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
              <span className="text-sm font-medium text-foreground">{topic}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-3">Instructor</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {course.instructor.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <div className="font-medium text-foreground text-sm">{course.instructor}</div>
              <div className="text-xs text-muted-foreground">Lead Instructor</div>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-3">Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">Self-paced, starts anytime</span></div>
            <div className="flex items-center gap-2"><Award className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">Certificate on completion</span></div>
            <div className="flex items-center gap-2"><Play className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">Hands-on labs included</span></div>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Tutorials Grid ─────────────────────────────────── */

const tutorials = [
  { id: "t1", title: "Build a RAG Chatbot with Azure OpenAI", description: "Step-by-step guide to creating a Retrieval-Augmented Generation chatbot using Azure OpenAI and AI Search.", difficulty: "Intermediate", readTime: "25 min", category: "Chatbots" },
  { id: "t2", title: "Fine-Tuning GPT Models for Your Domain", description: "Learn how to fine-tune GPT models on your proprietary data for improved accuracy in domain-specific tasks.", difficulty: "Advanced", readTime: "40 min", category: "Model Training" },
  { id: "t3", title: "Getting Started with Semantic Kernel", description: "A beginner-friendly walkthrough of Microsoft's Semantic Kernel SDK for building AI-powered applications.", difficulty: "Beginner", readTime: "15 min", category: "Frameworks" },
  { id: "t4", title: "Implementing Vector Search in Cosmos DB", description: "Add semantic search capabilities to your Cosmos DB application using vector embeddings and similarity search.", difficulty: "Intermediate", readTime: "30 min", category: "Databases" },
  { id: "t5", title: "Building Multi-Agent Systems with AutoGen", description: "Create collaborative AI agents that work together to solve complex tasks using the AutoGen framework.", difficulty: "Advanced", readTime: "35 min", category: "Agents" },
  { id: "t6", title: "AI-Powered Document Processing Pipeline", description: "Build an end-to-end document processing pipeline using Azure Document Intelligence and GPT-4.", difficulty: "Intermediate", readTime: "30 min", category: "Document AI" },
];

export const TutorialsGrid: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    <div className="cards-grid-symmetric">
      {tutorials.map((t, i) => (
        <div
          key={t.id}
          className="relative domain-card p-6 h-full overflow-hidden group cursor-pointer"
          style={{ animationDelay: `${i * 80}ms`, animation: "fadeInUp 0.6s ease-out both" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
          <div className="flex flex-col h-full relative z-10">
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                  t.difficulty === "Beginner" ? "bg-emerald-100 text-emerald-700" :
                  t.difficulty === "Intermediate" ? "bg-blue-100 text-blue-700" :
                  "bg-purple-100 text-purple-700"
                }`}>{t.difficulty}</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary">{t.category}</span>
              </div>
            </div>
            <div className="flex flex-col justify-between flex-1">
              <div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2 group-hover:text-primary transition-colors">{t.title}</h3>
                <p className="text-[#6b7280] text-xs leading-relaxed mb-4 line-clamp-2">{t.description}</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5" /> {t.readTime}</span>
                <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-500" />
        </div>
      ))}
    </div>
  </div>
);

/* ─── Workshops Grid ─────────────────────────────────── */

interface WorkshopSession {
  id: string;
  owner: string;
  topics: string;
  timing: string;
}

interface Workshop {
  id: string;
  title: string;
  date: string;
  time: string;
  tags: string[];
  sessions: WorkshopSession[];
}

const WORKSHOPS_STORAGE_KEY = "leap-workshops";

const defaultWorkshops: Workshop[] = [
  { id: "w1", title: "Hands-On: Building Enterprise Chatbots", date: "Mar 15, 2026", time: "10:00 AM – 4:00 PM PST", tags: ["Chatbot", "Azure OpenAI", "Hands-On"], sessions: [] },
  { id: "w2", title: "AI Security & Red Teaming Workshop", date: "Mar 22, 2026", time: "9:00 AM – 1:00 PM PST", tags: ["Security", "Red Team", "LLM"], sessions: [] },
  { id: "w3", title: "MLOps Pipeline Bootcamp", date: "Apr 5, 2026", time: "10:00 AM – 5:00 PM PST", tags: ["MLOps", "Azure ML", "CI/CD"], sessions: [] },
  { id: "w4", title: "Agentic AI Design Patterns", date: "Apr 12, 2026", time: "11:00 AM – 3:00 PM PST", tags: ["Agents", "AutoGen", "Patterns"], sessions: [] },
];

function loadWorkshops(): Workshop[] {
  try {
    const raw = localStorage.getItem(WORKSHOPS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return defaultWorkshops;
}

function saveWorkshops(workshops: Workshop[]) {
  localStorage.setItem(WORKSHOPS_STORAGE_KEY, JSON.stringify(workshops));
}

function getWorkshopStatus(date: string, time: string): "Completed" | "In Progress" | "Upcoming" {
  const workshopDate = new Date(date);
  if (Number.isNaN(workshopDate.getTime())) return "Upcoming";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const wDay = new Date(workshopDate.getFullYear(), workshopDate.getMonth(), workshopDate.getDate());
  if (wDay < today) return "Completed";
  if (wDay > today) return "Upcoming";
  // Same day — try to parse end time from the time range
  const endMatch = time.match(/–\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
  if (endMatch) {
    const endParts = endMatch[1].match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
    if (endParts) {
      let h = parseInt(endParts[1], 10);
      const m = parseInt(endParts[2], 10);
      const ampm = endParts[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      const endDateTime = new Date(wDay);
      endDateTime.setHours(h, m, 0, 0);
      if (now > endDateTime) return "Completed";
    }
  }
  return "In Progress";
}

function formatWorkshopDate(dateValue: string) {
  if (!dateValue) return "";
  const parsedDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return dateValue;
  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatWorkshopTime(timeValue: string) {
  if (!timeValue) return "";
  const parsedTime = new Date(`1970-01-01T${timeValue}:00`);
  if (Number.isNaN(parsedTime.getTime())) return timeValue;
  return parsedTime.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSessionTiming(startTime: string, endTime: string) {
  const formattedStart = formatWorkshopTime(startTime);
  const formattedEnd = formatWorkshopTime(endTime);
  if (formattedStart && formattedEnd) return `${formattedStart} – ${formattedEnd}`;
  return formattedStart || formattedEnd;
}

/* ── Add / Edit Workshop Form ──────────────────────── */
const WorkshopForm: FC<{
  onSave: (workshop: Workshop) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [sessions, setSessions] = useState<WorkshopSession[]>([]);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionOwner, setSessionOwner] = useState("");
  const [sessionTopics, setSessionTopics] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState("");
  const [sessionEndTime, setSessionEndTime] = useState("");

  const addSession = () => {
    if (!sessionOwner.trim() && !sessionTopics.trim()) return;
    setSessions(prev => [...prev, {
      id: `s-${Date.now()}`,
      owner: sessionOwner.trim(),
      topics: sessionTopics.trim(),
      timing: formatSessionTiming(sessionStartTime, sessionEndTime),
    }]);
    setSessionOwner("");
    setSessionTopics("");
    setSessionStartTime("");
    setSessionEndTime("");
    setShowSessionForm(false);
  };

  const removeSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: `w-${Date.now()}`,
      title: title.trim(),
      date: formatWorkshopDate(date),
      time: formatSessionTiming(startTime, endTime),
      tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean),
      sessions,
    });
  };

  return (
    <div className="animate-leap-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onCancel} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <h2 className="text-lg font-bold text-foreground">Add Workshop</h2>
        <div />
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Workshop Name *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Hands-On: Building Enterprise Chatbots" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Tech Stack (comma separated)</label>
          <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. Azure OpenAI, Chatbot, Hands-On" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>

        {/* Sessions */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Sessions ({sessions.length})</h3>
            {!showSessionForm && (
              <button onClick={() => setShowSessionForm(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-xs font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Session
              </button>
            )}
          </div>

          {sessions.map(s => (
            <div key={s.id} className="flex items-start gap-3 p-3 mb-2 rounded-lg bg-muted/30 border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{s.topics || "Untitled session"}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {s.owner && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {s.owner}</span>}
                  {s.timing && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.timing}</span>}
                </div>
              </div>
              <button onClick={() => removeSession(s.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}

          {showSessionForm && (
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/[0.02] space-y-3 mb-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Session Owner</label>
                <input value={sessionOwner} onChange={e => setSessionOwner(e.target.value)} placeholder="e.g. Dr. Sarah Chen" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Topics</label>
                <input value={sessionTopics} onChange={e => setSessionTopics(e.target.value)} placeholder="e.g. Intro to RAG patterns" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Timing</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="time" value={sessionStartTime} onChange={e => setSessionStartTime(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input type="time" value={sessionEndTime} onChange={e => setSessionEndTime(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={addSession} className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors">Add</button>
                <button onClick={() => setShowSessionForm(false)} className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button onClick={onCancel} className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={!title.trim()} className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save Workshop</button>
      </div>
    </div>
  );
};

/* ── Workshop Detail View ──────────────────────────── */
const WorkshopDetail: FC<{
  workshop: Workshop;
  onBack: () => void;
  onUpdate: (updated: Workshop) => void;
}> = ({ workshop, onBack, onUpdate }) => {
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionOwner, setSessionOwner] = useState("");
  const [sessionTopics, setSessionTopics] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState("");
  const [sessionEndTime, setSessionEndTime] = useState("");

  const addSession = () => {
    if (!sessionOwner.trim() && !sessionTopics.trim()) return;
    const newSession: WorkshopSession = {
      id: `s-${Date.now()}`,
      owner: sessionOwner.trim(),
      topics: sessionTopics.trim(),
      timing: formatSessionTiming(sessionStartTime, sessionEndTime),
    };
    onUpdate({ ...workshop, sessions: [...workshop.sessions, newSession] });
    setSessionOwner("");
    setSessionTopics("");
    setSessionStartTime("");
    setSessionEndTime("");
    setShowSessionForm(false);
  };

  const removeSession = (id: string) => {
    onUpdate({ ...workshop, sessions: workshop.sessions.filter(s => s.id !== id) });
  };

  return (
    <div className="animate-leap-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> All Workshops
        </button>
      </div>

      {/* Workshop Header */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground mb-1">{workshop.title}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
              {workshop.date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {workshop.date}</span>}
              {workshop.time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {workshop.time}</span>}
            </div>
            {workshop.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {workshop.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Sessions ({workshop.sessions.length})</h3>
          {!showSessionForm && (
            <button onClick={() => setShowSessionForm(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-xs font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Session
            </button>
          )}
        </div>

        {workshop.sessions.length === 0 && !showSessionForm && (
          <p className="text-sm text-muted-foreground py-6 text-center">No sessions yet. Click "Add Session" to create one.</p>
        )}

        <div className="space-y-2">
          {workshop.sessions.map(s => (
            <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                <Play className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{s.topics || "Untitled session"}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {s.owner && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {s.owner}</span>}
                  {s.timing && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.timing}</span>}
                </div>
              </div>
              <button onClick={() => removeSession(s.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>

        {showSessionForm && (
          <div className="p-4 mt-3 rounded-lg border border-primary/20 bg-primary/[0.02] space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Session Owner</label>
              <input value={sessionOwner} onChange={e => setSessionOwner(e.target.value)} placeholder="e.g. Dr. Sarah Chen" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Topics</label>
              <input value={sessionTopics} onChange={e => setSessionTopics(e.target.value)} placeholder="e.g. Intro to RAG patterns" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Timing</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="time" value={sessionStartTime} onChange={e => setSessionStartTime(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <input type="time" value={sessionEndTime} onChange={e => setSessionEndTime(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={addSession} className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors">Save Session</button>
              <button onClick={() => setShowSessionForm(false)} className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Workshops Grid (Main) ─────────────────────────── */
export const WorkshopsGrid: FC = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>(() => loadWorkshops());
  const [view, setView] = useState<"grid" | "add" | "detail">("grid");
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null);

  useEffect(() => { saveWorkshops(workshops); }, [workshops]);

  const addWorkshop = (workshop: Workshop) => {
    setWorkshops(prev => [...prev, workshop]);
    setView("grid");
  };

  const updateWorkshop = (updated: Workshop) => {
    setWorkshops(prev => prev.map(w => w.id === updated.id ? updated : w));
  };

  const openDetail = (id: string) => {
    setSelectedWorkshopId(id);
    setView("detail");
  };

  const selectedWorkshop = workshops.find(w => w.id === selectedWorkshopId) ?? null;

  if (view === "add") {
    return <WorkshopForm onSave={addWorkshop} onCancel={() => setView("grid")} />;
  }

  if (view === "detail" && selectedWorkshop) {
    return <WorkshopDetail workshop={selectedWorkshop} onBack={() => setView("grid")} onUpdate={updateWorkshop} />;
  }

  return (
    <div className="space-y-6 animate-leap-fade-in-up">
      <div className="flex items-center justify-end">
        <button onClick={() => setView("add")} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Add a Workshop
        </button>
      </div>
      <div className="cards-grid-symmetric">
        {workshops.map((w, i) => (
          <div
            key={w.id}
            onClick={() => openDetail(w.id)}
            className="relative domain-card p-6 h-full overflow-hidden group cursor-pointer"
            style={{ animationDelay: `${i * 80}ms`, animation: "fadeInUp 0.6s ease-out both" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="flex flex-col h-full relative z-10">
              <div className="flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  {(() => {
                    const status = getWorkshopStatus(w.date, w.time);
                    const cfg = status === "Completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : status === "In Progress"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-sky-100 text-sky-700";
                    return (
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${cfg}`}>
                        {status}
                      </span>
                    );
                  })()}
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="w-3 h-3" /> {w.date}
                  </span>
                  {w.sessions.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {w.sessions.length} session{w.sessions.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col justify-between flex-1">
                <div>
                  <h3 className="text-lg font-bold text-[#1a1a1a] mb-2 group-hover:text-primary transition-colors">{w.title}</h3>
                  <p className="text-[#6b7280] text-xs mb-3">{w.time}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {w.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-500" />
          </div>
        ))}
      </div>
    </div>
  );
};
