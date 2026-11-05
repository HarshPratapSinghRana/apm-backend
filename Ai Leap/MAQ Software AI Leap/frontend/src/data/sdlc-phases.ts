/* ─── Agentic SDLC Phase Definitions ─── */

export interface SdlcSolution {
  id: string;
  type: "agent" | "product";
  /** Must match an id in agents.json use_cases or a product id */
  domainId?: string;
  architecture?: "No Code" | "Low Code" | "Pro Code";
}

export interface SdlcPhase {
  id: string;
  title: string;
  icon: string; // lucide icon name
  color: string; // tailwind color name (emerald, blue, violet, amber, teal)
  painPoint: string; // "Without AI" description
  agenticSolution: string; // "With MAQ AI" description
  roleOfAgents: string;
  example: string;
  kpis: string[];
  solutions: SdlcSolution[];
  status: "mapped" | "partial" | "tbd";
}

export const SDLC_PHASES: SdlcPhase[] = [
  {
    id: "planning",
    title: "Planning & Requirements",
    icon: "Lightbulb",
    color: "amber",
    painPoint:
      "Manual project scoping, missed priorities, slow requirements-to-delivery cycles, and stakeholder alignment through lengthy meetings.",
    agenticSolution:
      "AI agents analyze projects, prioritize tasks, and deliver automated metrics — enabling data-driven planning and reducing RTD.",
    roleOfAgents: "Analyze projects, prioritize tasks, generate automated metric reports",
    example: "Executive Copilot surfaces top priorities; Monday Morning Agent auto-delivers weekly KPI reports to inboxes.",
    kpis: ["Reduction in planning cycle time", "Requirements-to-Delivery (RTD) reduction"],
    solutions: [
      { id: "executive-copilot-agent", type: "agent", domainId: "finance", architecture: "Pro Code" },
      { id: "monday-morning-agent", type: "agent", domainId: "retail", architecture: "Pro Code" },
    ],
    status: "mapped",
  },
  {
    id: "development",
    title: "Development",
    icon: "Code",
    color: "blue",
    painPoint:
      "Manual code reviews take 2–3 days, inconsistent coding standards, knowledge silos, and tribal knowledge that never gets documented.",
    agenticSolution:
      "Agents scan commits, enforce standards in real-time, and provide instant answers from the codebase — eliminating review bottlenecks.",
    roleOfAgents: "Scan commits, enforce coding standards, generate secure code suggestions",
    example: "Code Standards Reviewer flags violations on push; Enterprise Knowledge Bot answers dev questions from internal docs.",
    kpis: ["% code review time reduction", "Vulnerabilities detected pre-merge"],
    solutions: [
      { id: "code-standards-reviewer-agent", type: "agent", domainId: "finance", architecture: "Pro Code" },
      { id: "enterprise-knowledge-bot", type: "agent", domainId: "retail", architecture: "Low Code" },
    ],
    status: "mapped",
  },
  {
    id: "cicd",
    title: "CI/CD",
    icon: "Infinity",
    color: "violet",
    painPoint:
      "Manual pipeline configurations, deployment failures, slow rollbacks, and lack of intelligent orchestration across environments.",
    agenticSolution:
      "AI agents orchestrate builds, detect deployment risks, and auto-rollback on failure — enabling continuous, safe delivery.",
    roleOfAgents: "Orchestrate deployments, suppress noise, enable autonomous incident remediation",
    example: "Autonomous pipeline orchestrator detects failed deployments and triggers rollback within seconds.",
    kpis: ["Deployment frequency improvement", "Mean Time to Recovery (MTTR)"],
    solutions: [],
    status: "tbd",
  },
  {
    id: "testing",
    title: "Testing & Quality Assurance",
    icon: "FlaskConical",
    color: "emerald",
    painPoint:
      "Manual test case writing, low automated coverage, late defect discovery, and performance testing as an afterthought.",
    agenticSolution:
      "AI auto-generates test cases from code analysis, orchestrates test suites, and validates performance — catching defects early.",
    roleOfAgents: "Orchestrate tests, optimize test suites, auto-categorize defects",
    example: "Test Case Recommender generates test scenarios from code changes; LoadFAST validates Power BI performance.",
    kpis: ["Improvements in automated test coverage", "Defect escape rate reduction"],
    solutions: [
      { id: "test-case-recommender", type: "product" },
      { id: "loadfast", type: "product" },
      { id: "certyfast", type: "product" },
    ],
    status: "mapped",
  },
  {
    id: "operations",
    title: "Postmortems & Continuous Improvement",
    icon: "ClipboardCheck",
    color: "teal",
    painPoint:
      "Alert fatigue, slow root-cause analysis, manual postmortem reports, and action items that never get tracked.",
    agenticSolution:
      "Agents aggregate logs, identify root causes, auto-generate postmortems, and track action item completion — closing the feedback loop.",
    roleOfAgents: "Aggregate logs, identify root cause, auto-generate postmortems",
    example: "Security Risk Analyzer detects anomalies; Expense Trend Analyzer spots financial patterns for ops review.",
    kpis: ["% postmortem time reduction", "Action item completion rate", "Mean Time to Detect (MTTD)"],
    solutions: [
      { id: "security-risk-analyzer-agent", type: "agent", domainId: "finance", architecture: "Pro Code" },
      { id: "fraud-anomaly-detection-agent", type: "agent", domainId: "retail", architecture: "Pro Code" },
      { id: "expense-trend-analyzer", type: "agent", domainId: "finance", architecture: "Pro Code" },
    ],
    status: "mapped",
  },
];

/* Stats helpers */
export function getSdlcStats() {
  const total = SDLC_PHASES.length;
  const mapped = SDLC_PHASES.filter((p) => p.status === "mapped").length;
  const partial = SDLC_PHASES.filter((p) => p.status === "partial").length;
  const tbd = SDLC_PHASES.filter((p) => p.status === "tbd").length;
  const solutionCount = SDLC_PHASES.reduce((sum, p) => sum + p.solutions.length, 0);
  const coverage = Math.round(((mapped + partial * 0.5) / total) * 100);
  return { total, mapped, partial, tbd, solutionCount, coverage };
}
