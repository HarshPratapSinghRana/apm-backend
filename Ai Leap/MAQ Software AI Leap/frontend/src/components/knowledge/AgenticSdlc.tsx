import React, { useState } from "react";
import * as Icons from "lucide-react";
import {
  ArrowRight, BarChart3, CheckCircle2, Clock, AlertCircle, ExternalLink,
  Layers, ChevronDown, ChevronRight, Wrench, FileText, Map, ListChecks,
  Ticket, Zap, HelpCircle, Search, ClipboardCheck as ClipboardCheckIcon,
  Copy, BookOpen, Play, Star, Terminal
} from "lucide-react";
import { SDLC_PHASES, getSdlcStats, type SdlcPhase } from "@/data/sdlc-phases";

/* ─── Color Maps ─── */
const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string; light: string; ring: string }> = {
  amber:   { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   badge: "bg-amber-600",   light: "bg-amber-100", ring: "ring-amber-400" },
  blue:    { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    badge: "bg-blue-600",    light: "bg-blue-100", ring: "ring-blue-400" },
  violet:  { bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-700",  badge: "bg-violet-600",  light: "bg-violet-100", ring: "ring-violet-400" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-600", light: "bg-emerald-100", ring: "ring-emerald-400" },
  teal:    { bg: "bg-teal-50",    border: "border-teal-200",    text: "text-teal-700",    badge: "bg-teal-600",    light: "bg-teal-100", ring: "ring-teal-400" },
};

const ARCH_STYLE: Record<string, string> = {
  "No Code":  "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  "Low Code": "bg-amber-500/15 text-amber-700 border-amber-200",
  "Pro Code": "bg-violet-500/15 text-violet-700 border-violet-200",
};

interface AgenticSdlcProps {
  onSelectUseCase?: (domainId: string, useCaseId: string) => void;
}

/* ─── SDD Step Data — Use Case: Invoice Data Extraction Agent ─── */
const SDD_STEPS = [
  {
    id: "constitution",
    title: "Constitution",
    icon: FileText,
    command: "/speckit.constitution",
    shortDesc: "Establish project principles & development guidelines",
    input: "Create principles for an AI agent that extracts invoice data. Focus on accuracy over speed, PII handling, auditability, and Azure OpenAI usage.",
    output: "Project constitution with coding standards, security policies, and quality gates that govern all subsequent development.",
    sdlcPhase: "Planning & Requirements",
    sdlcColor: "amber",
    maqSolutions: ["Solution Builder", "Executive Copilot"],
    sample: `# Invoice Agent — Constitution\n\n## Core Principles\n1. Accuracy First: extraction accuracy ≥ 95%\n2. PII Protection: mask SSN, bank accounts in logs\n3. Auditability: every extraction → audit trail\n4. Azure OpenAI: gpt-4o for extraction, gpt-4o-mini for validation\n\n## Coding Standards\n- Python 3.11+, FastAPI, Pydantic v2\n- Type hints on all public functions\n- 80%+ test coverage minimum\n\n## Quality Gates\n- Pre-merge: lint + unit tests + security scan\n- Post-deploy: integration tests against sample invoices`,
  },
  {
    id: "specify",
    title: "Specify",
    icon: FileText,
    command: "/speckit.specify",
    shortDesc: "Define what you want to build — the what and why, not the how",
    input: "Build an AI agent that extracts structured data from PDF/image invoices — vendor name, invoice number, line items, tax, total. Support multi-page and multi-currency.",
    output: "Structured specification with user stories, acceptance criteria, constraints, and success metrics.",
    sdlcPhase: "Planning & Requirements",
    sdlcColor: "amber",
    maqSolutions: ["Executive Copilot", "Monday Morning Agent"],
    sample: `# Invoice Extraction Agent — Specification\n\n## User Stories\nUS-1: As a finance analyst, I upload a PDF invoice\n      and receive structured JSON within 10 seconds.\nUS-2: As an auditor, I can view extraction confidence\n      scores per field to flag uncertain values.\nUS-3: As a batch user, I submit 50+ invoices via API\n      and download results as CSV.\n\n## Acceptance Criteria\n- Extract: vendor, invoice#, date, line items, tax, total\n- Support: PDF, PNG, JPG, TIFF\n- Multi-page invoices → single unified output\n- Confidence score (0–1) per extracted field\n- Currencies: USD, EUR, GBP, INR\n\n## Constraints\n- Max file size: 10 MB\n- Response time: < 10s for single invoice\n- No PII stored beyond the session`,
  },
  {
    id: "plan",
    title: "Plan",
    icon: Map,
    command: "/speckit.plan",
    shortDesc: "Create technical implementation plan with your tech stack",
    input: "Use Python + FastAPI backend, Azure Document Intelligence for OCR, Azure OpenAI gpt-4o for field extraction, React frontend with shadcn/ui.",
    output: "Architecture decisions, component breakdown, file structure, and integration points.",
    sdlcPhase: "Development",
    sdlcColor: "blue",
    maqSolutions: ["Code Standards Reviewer", "Architecture Guide"],
    sample: `# Implementation Plan\n\n## Architecture\n┌──────────┐    ┌──────────────┐    ┌───────────┐\n│  React   │───▶│  FastAPI      │───▶│ Azure Doc │\n│  Frontend│    │  /api/extract │    │ Intel.    │\n└──────────┘    └──────┬───────┘    └───────────┘\n                       │\n                ┌──────▼───────┐\n                │ Azure OpenAI │\n                │ gpt-4o       │\n                └──────────────┘\n\n## File Structure\nbackend/\n  app.py              # FastAPI app + routes\n  services/\n    ocr.py            # Document Intelligence client\n    extractor.py      # LLM extraction + validation\n    models.py         # Pydantic schemas\nfrontend/\n  src/components/\n    UploadZone.tsx     # Drag-drop file upload\n    ResultsTable.tsx   # Extracted data display\n    ConfidenceBadge.tsx # Per-field confidence`,
  },
  {
    id: "tasks",
    title: "Tasks",
    icon: ListChecks,
    command: "/speckit.tasks",
    shortDesc: "Generate actionable task list from your implementation plan",
    input: "(Automatically derived from the plan above)",
    output: "Ordered task list with dependencies, effort estimates, and acceptance criteria per task.",
    sdlcPhase: "Development",
    sdlcColor: "blue",
    maqSolutions: ["Code Standards Reviewer"],
    sample: `# Task Breakdown\n\n## Phase 1: Core Backend\n[x] T-001: Set up FastAPI project scaffold\n    Depends on: none | Effort: 1h\n[x] T-002: Implement Azure Doc Intelligence OCR service\n    Depends on: T-001 | Effort: 3h\n[x] T-003: Build LLM extraction chain with gpt-4o\n    Depends on: T-002 | Effort: 4h\n[ ] T-004: Add confidence scoring per field\n    Depends on: T-003 | Effort: 2h\n\n## Phase 2: API + Validation\n[ ] T-005: Create POST /api/extract endpoint\n    Depends on: T-003 | Effort: 2h\n[ ] T-006: Add multi-currency parsing (USD/EUR/GBP/INR)\n    Depends on: T-003 | Effort: 2h\n[ ] T-007: Input validation + file size limits\n    Depends on: T-005 | Effort: 1h\n\n## Phase 3: Frontend\n[ ] T-008: Build UploadZone with drag-drop\n    Depends on: none | Effort: 2h\n[ ] T-009: Build ResultsTable with editable cells\n    Depends on: T-005 | Effort: 3h\n[ ] T-010: Add batch upload + CSV export\n    Depends on: T-009 | Effort: 2h`,
  },
  {
    id: "issues",
    title: "Issues",
    icon: Ticket,
    command: "/speckit.taskstoissues",
    shortDesc: "Convert tasks into trackable GitHub Issues",
    input: "(Automatically converts tasks to issues)",
    output: "GitHub Issues with labels, milestones, and cross-references — ready for sprint planning.",
    sdlcPhase: "CI/CD",
    sdlcColor: "violet",
    maqSolutions: ["Coming Soon"],
    sample: `# Generated GitHub Issues\n\n## Issue #12: Implement Azure Doc Intelligence OCR\n  Labels: [backend] [ocr] [priority:high]\n  Milestone: Sprint 1 — Core Backend\n  Assignee: @dev-team\n  Linked to: T-002\n  Acceptance: OCR returns text + bounding boxes\n             for PDF, PNG, JPG, TIFF inputs\n\n## Issue #13: Build LLM extraction chain\n  Labels: [backend] [ai] [priority:high]\n  Milestone: Sprint 1 — Core Backend\n  Assignee: @dev-team\n  Linked to: T-003, blocks T-004, T-005, T-006\n  Acceptance: Returns structured JSON matching\n             InvoiceSchema for 5 sample invoices\n\n## Issue #15: Build UploadZone component\n  Labels: [frontend] [ui] [priority:medium]\n  Milestone: Sprint 2 — Frontend\n  Acceptance: Drag-drop + click upload, preview,\n             file type validation, 10MB limit`,
  },
  {
    id: "implement",
    title: "Implement",
    icon: Zap,
    command: "/speckit.implement",
    shortDesc: "AI agents execute all tasks and build the feature",
    input: "(Agents follow the plan + tasks autonomously)",
    output: "Production-ready code, tests, and documentation — built exactly to spec.",
    sdlcPhase: "Development + Testing",
    sdlcColor: "emerald",
    maqSolutions: ["Solution Builder", "Test Case Recommender", "Eval Framework"],
    sample: `# Generated Code — extractor.py (excerpt)\n\nasync def extract_invoice(file: UploadFile) -> InvoiceResult:\n    """Extract structured data from an invoice file."""\n    # Step 1: OCR via Azure Document Intelligence\n    ocr_result = await ocr_service.analyze(file)\n\n    # Step 2: LLM extraction via gpt-4o\n    prompt = build_extraction_prompt(ocr_result.text)\n    response = await llm.chat(\n        model="gpt-4o",\n        messages=[{"role": "system", "content": SYSTEM},\n                  {"role": "user", "content": prompt}],\n        response_format=InvoiceSchema,\n    )\n\n    # Step 3: Confidence scoring\n    result = InvoiceResult(**response.parsed)\n    result.confidence = compute_confidence(\n        ocr_result.confidence_scores,\n        response.usage\n    )\n    return result\n\n# ✅ 12 unit tests generated\n# ✅ 5 integration tests against sample invoices\n# ✅ API docs auto-generated at /docs`,
  },
];

const SDD_OPTIONAL_STEPS = [
  { id: "clarify", title: "Clarify", icon: HelpCircle, command: "/speckit.clarify", desc: "Fill underspecified gaps before planning" },
  { id: "analyze", title: "Analyze", icon: Search, command: "/speckit.analyze", desc: "Cross-artifact consistency & coverage check" },
  { id: "checklist", title: "Checklist", icon: ClipboardCheckIcon, command: "/speckit.checklist", desc: "Quality gates that validate requirements" },
];

const SDD_MAPPING_TABLE = [
  { step: "Constitution", sdlcPhase: "Planning", color: "amber", solutions: "Solution Builder" },
  { step: "Specify", sdlcPhase: "Planning", color: "amber", solutions: "Executive Copilot, PRD Builder" },
  { step: "Plan", sdlcPhase: "Development", color: "blue", solutions: "Architecture Guide, Decision Guide" },
  { step: "Tasks", sdlcPhase: "Development", color: "blue", solutions: "Code Standards Reviewer" },
  { step: "Issues", sdlcPhase: "CI/CD", color: "violet", solutions: "Coming Soon" },
  { step: "Implement", sdlcPhase: "Dev + Testing", color: "emerald", solutions: "Solution Builder, Test Recommender" },
  { step: "Verify", sdlcPhase: "Testing + Ops", color: "teal", solutions: "Eval Framework, Security Analyzer" },
];

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */
const AgenticSdlc: React.FC<AgenticSdlcProps> = ({ onSelectUseCase }) => {
  const [topTab, setTopTab] = useState<"pipeline" | "sdd">("pipeline");

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h3 className="text-lg font-bold text-foreground">Agentic DevOps</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Spec-Driven Development for AI-Native Software Delivery
        </p>
      </div>

      {/* ─── Tab Bar ─── */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        {([
          ["pipeline", "🔧 SDLC Pipeline"],
          ["sdd", "📐 Spec-Driven Development"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTopTab(key)}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
              topTab === key
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      {topTab === "pipeline" ? (
        <SdlcPipelineTab onSelectUseCase={onSelectUseCase} />
      ) : (
        <SpecDrivenTab />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   TAB 1: SDLC Pipeline (existing content)
   ═══════════════════════════════════════════════════ */
const SdlcPipelineTab: React.FC<{ onSelectUseCase?: (d: string, u: string) => void }> = ({ onSelectUseCase }) => {
  const [view, setView] = useState<"pipeline" | "timeline">("pipeline");
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const stats = getSdlcStats();

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {[
          { label: "Phases", value: stats.total, icon: Layers },
          { label: "Solutions Mapped", value: stats.solutionCount, icon: CheckCircle2 },
          { label: "Fully Covered", value: stats.mapped, icon: BarChart3 },
          { label: "TBD", value: stats.tbd, icon: Clock },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <s.icon className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-primary">{stats.coverage}%</span>
          <span className="text-xs text-primary/70">SDLC Coverage</span>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        {([["pipeline", "Pipeline View"], ["timeline", "Timeline View"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              view === key
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "pipeline" ? (
        <PipelineView
          expandedPhase={expandedPhase}
          onTogglePhase={(id) => setExpandedPhase(expandedPhase === id ? null : id)}
          onSelectUseCase={onSelectUseCase}
        />
      ) : (
        <TimelineView onSelectUseCase={onSelectUseCase} />
      )}

      <CoverageScorecard />
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   TAB 2: Spec-Driven Development
   ═══════════════════════════════════════════════════ */
const SpecDrivenTab: React.FC = () => {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyInstall = () => {
    const cmd = "uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.7.1";
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-8">
      {/* ─── Section A: Hero — Vibe Coding vs Spec-Driven ─── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h4 className="text-base font-bold text-foreground mb-1">From Vibe Coding to Spec Coding</h4>
        <p className="text-xs text-muted-foreground mb-5">A paradigm shift in how software gets built with AI</p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
          {/* Vibe Coding — Left */}
          <div className="rounded-xl border-2 border-dashed border-red-300 bg-red-50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-bold text-red-700">VIBE CODING</span>
            </div>
            <div className="space-y-3">
              {[
                { emoji: "💬", text: '"Build me a dashboard"' },
                { emoji: "🤞", text: "Hope it works" },
                { emoji: "🐛", text: "Debug for hours" },
                { emoji: "🔄", text: "Rewrite from scratch" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2">
                  <span className="text-base">{item.emoji}</span>
                  <span className="text-sm text-red-700/80">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center">
            <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">VS</span>
          </div>

          {/* Spec-Driven — Right */}
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-bold text-emerald-700">SPEC-DRIVEN</span>
            </div>
            <div className="space-y-3">
              {[
                { emoji: "📜", text: "Constitution → Specify" },
                { emoji: "🗺", text: "Plan → Tasks → Implement" },
                { emoji: "✅", text: "Predictable output" },
                { emoji: "📊", text: "Verifiable quality" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2">
                  <span className="text-base">{item.emoji}</span>
                  <span className="text-sm text-emerald-700/80">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quote */}
        <div className="mt-5 rounded-lg bg-muted/40 border border-border px-4 py-3">
          <p className="text-sm text-foreground/80 italic">
            "Specifications become executable — directly generating working implementations rather than just guiding them."
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">— GitHub Spec Kit</p>
        </div>
      </div>

      {/* ─── Section B: The 6-Step SDD Workflow ─── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h4 className="text-base font-bold text-foreground mb-1">The 6-Step SDD Workflow</h4>
        <p className="text-xs text-muted-foreground mb-5">Click any step to see inputs, outputs, and MAQ LEAP agent mapping</p>

        {/* Step Nodes — Horizontal */}
        <div className="overflow-x-auto pb-4 -mx-3 px-3 sm:px-0">
          <div className="flex min-w-[720px] items-stretch gap-2 sm:gap-3">
            {SDD_STEPS.map((step, i) => {
              const isActive = activeStep === step.id;
              const StepIcon = step.icon;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => setActiveStep(isActive ? null : step.id)}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 transition-all min-w-[120px] sm:min-w-0 ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/30 ring-offset-2"
                        : "border-border bg-card hover:bg-muted/30 hover:shadow-md"
                    }`}
                  >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isActive ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <StepIcon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`text-xs font-bold text-center leading-tight ${isActive ? "text-primary" : "text-foreground"}`}>
                    {step.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">{i + 1}</span>
                  {isActive && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 bg-primary/5 border-primary border-l-0 border-t-0 border-2" />
                  )}
                </button>
                {i < SDD_STEPS.length - 1 && (
                  <div className="flex items-center px-1 shrink-0">
                    <div className="h-0.5 w-4 bg-primary/20" />
                    <ArrowRight className="h-3 w-3 text-primary/30" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

        {/* Expanded Step Detail */}
        {activeStep && <SddStepDetail step={SDD_STEPS.find((s) => s.id === activeStep)!} />}

        {/* Optional Steps */}
        <div className="mt-6 pt-4 border-t border-border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Optional Quality Steps</span>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {SDD_OPTIONAL_STEPS.map((step) => {
              const OptIcon = step.icon;
              return (
                <div
                  key={step.id}
                  className="flex items-start gap-3 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/10 p-4"
                >
                  <OptIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">{step.title}</span>
                    <p className="text-[10px] text-muted-foreground/70">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Section C: How MAQ LEAP Maps to SDD ─── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h4 className="text-base font-bold text-foreground mb-1">How MAQ LEAP Maps to SDD</h4>
        <p className="text-xs text-muted-foreground mb-4">Traceability from spec steps to SDLC phases and deployed solutions</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">SDD Step</th>
                <th className="text-left py-2 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">SDLC Phase</th>
                <th className="text-left py-2 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">MAQ LEAP Solutions</th>
              </tr>
            </thead>
            <tbody>
              {SDD_MAPPING_TABLE.map((row) => {
                const colors = COLOR_MAP[row.color] || COLOR_MAP.blue;
                return (
                  <tr key={row.step} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2.5 px-3 text-xs font-semibold text-foreground">{row.step}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center rounded-full ${colors.light} ${colors.text} px-2.5 py-0.5 text-[10px] font-bold`}>
                        {row.sdlcPhase}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-foreground/80">{row.solutions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Section D: Architecture Modes ─── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h4 className="text-base font-bold text-foreground mb-1">Architecture Modes</h4>
        <p className="text-xs text-muted-foreground mb-4">Pick your path based on team maturity and use case complexity</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "No Code",
              color: "emerald",
              icon: "🟢",
              features: ["Copilot in IDE", "Slash commands", "Pre-built presets"],
              bestFor: "Quick prototypes, individual devs",
            },
            {
              title: "Low Code",
              color: "amber",
              icon: "🟡",
              features: ["Spec Kit + Templates", "Extension customization", "Jira / ADO integration"],
              bestFor: "Team workflows, sprint planning",
            },
            {
              title: "Pro Code",
              color: "violet",
              icon: "🟣",
              features: ["Full CLI + Custom extensions", "Multi-agent orchestration", "CI/CD guard integration"],
              bestFor: "Enterprise CI/CD, large codebases",
            },
          ].map((mode) => {
            const colors = COLOR_MAP[mode.color] || COLOR_MAP.blue;
            return (
              <div
                key={mode.title}
                className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-5 transition-all hover:shadow-md`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{mode.icon}</span>
                  <span className={`text-sm font-bold ${colors.text}`}>{mode.title}</span>
                </div>
                <ul className="space-y-2 mb-4">
                  {mode.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-foreground/80">
                      <CheckCircle2 className={`h-3 w-3 ${colors.text} shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg bg-white/60 border border-border/30 px-3 py-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Best for</span>
                  <p className="text-xs text-foreground/80 mt-0.5">{mode.bestFor}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Section E: Get Started ─── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h4 className="text-base font-bold text-foreground mb-1">Get Started</h4>
        <p className="text-xs text-muted-foreground mb-4">Install GitHub Spec Kit and initialize your first spec-driven project</p>

        {/* Terminal Card */}
        <div className="rounded-xl bg-gray-950 border border-gray-800 p-5 font-mono text-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <div className="h-3 w-3 rounded-full bg-green-500" />
            </div>
            <span className="text-gray-500 text-xs ml-2">terminal</span>
            <button
              onClick={copyInstall}
              className="ml-auto flex items-center gap-1 rounded-md bg-gray-800 px-2 py-1 text-[10px] text-gray-400 hover:text-gray-200 transition-colors"
            >
              <Copy className="h-3 w-3" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="space-y-1.5 text-gray-300">
            <p><span className="text-emerald-400">$</span> uv tool install specify-cli --from \</p>
            <p className="pl-6 text-gray-400">git+https://github.com/github/spec-kit.git@v0.7.1</p>
            <p className="mt-2"><span className="text-emerald-400">$</span> specify init my-project --ai copilot</p>
            <p className="mt-2"><span className="text-emerald-400">$</span> specify check</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { label: "Documentation", icon: BookOpen, href: "https://github.github.io/spec-kit/" },
            { label: "Video Overview", icon: Play, href: "https://www.youtube.com/watch?v=a9eR1xsfvHg" },
            { label: "88.4k on GitHub", icon: Star, href: "https://github.com/github/spec-kit" },
          ].map((link) => {
            const LinkIcon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
              >
                <LinkIcon className="h-3.5 w-3.5 text-primary" />
                {link.label}
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─── SDD Step Detail (expanded below step nodes) ─── */
const SddStepDetail: React.FC<{ step: typeof SDD_STEPS[number] }> = ({ step }) => {
  const colors = COLOR_MAP[step.sdlcColor] || COLOR_MAP.blue;

  return (
    <div className="animate-leap-fade-in-up rounded-xl border-2 border-primary/20 bg-primary/[0.02] p-5 mt-2">
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <step.icon className="h-5 w-5 text-primary" />
        <h5 className="text-sm font-bold text-foreground">Step: {step.title}</h5>
        <code className="ml-auto rounded-md bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
          {step.command}
        </code>
      </div>

      {/* Input / Output columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">What You Write</span>
          </div>
          <p className="text-xs text-blue-700/80 leading-relaxed font-mono">{step.input}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">What AI Produces</span>
          </div>
          <p className="text-xs text-emerald-700/80 leading-relaxed">{step.output}</p>
        </div>
      </div>

      {/* Sample Example — dark code block */}
      {step.sample && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Sample Output — Invoice Data Extraction Agent
            </span>
          </div>
          <div className="rounded-lg bg-gray-950 border border-gray-800 p-4 overflow-x-auto">
            <pre className="text-[11px] leading-relaxed font-mono text-gray-300 whitespace-pre-wrap">{step.sample}</pre>
          </div>
        </div>
      )}

      {/* Mapping row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Maps to SDLC Phase:</span>
          <span className={`inline-flex items-center rounded-full ${colors.light} ${colors.text} px-2.5 py-0.5 text-[10px] font-bold`}>
            {step.sdlcPhase}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">MAQ Agent:</span>
          {step.maqSolutions.map((sol) => (
            <span key={sol} className="rounded-lg border border-border bg-white px-2.5 py-0.5 text-[10px] font-semibold text-foreground">
              {sol}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Pipeline View (unchanged from original)
   ═══════════════════════════════════════════════════ */
const PipelineView: React.FC<{
  expandedPhase: string | null;
  onTogglePhase: (id: string) => void;
  onSelectUseCase?: (domainId: string, useCaseId: string) => void;
}> = ({ expandedPhase, onTogglePhase, onSelectUseCase }) => (
  <div className="space-y-5 w-full max-w-full">
    <div className="flex flex-col gap-3 pb-2 sm:flex-row">
      {SDLC_PHASES.map((phase, i) => {
        const colors = COLOR_MAP[phase.color] || COLOR_MAP.blue;
        const PhaseIcon = Icons[phase.icon as keyof typeof Icons] as React.ElementType | undefined;
        const isActive = expandedPhase === phase.id;
        const isTbd = phase.status === "tbd";

        return (
          <React.Fragment key={phase.id}>
            <button
              onClick={() => onTogglePhase(phase.id)}
              className={`relative flex flex-col items-center justify-between gap-2 rounded-2xl border-2 px-4 py-4 transition-all flex-1 min-w-0 ${
                isActive
                  ? `${colors.border} ${colors.bg} shadow-lg ring-2 ${colors.ring} ring-offset-2`
                  : isTbd
                  ? "border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40"
                  : `${colors.border} bg-card hover:${colors.bg} hover:shadow-md`
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${isTbd ? "bg-muted" : colors.light}`}>
                {PhaseIcon && <PhaseIcon className={`h-6 w-6 ${isTbd ? "text-muted-foreground" : colors.text}`} />}
              </div>
              <span className={`text-xs font-bold text-center leading-tight flex-1 flex items-center ${isTbd ? "text-muted-foreground" : "text-foreground"}`}>
                {phase.title}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {isTbd ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">TBD</span>
                ) : (
                  <span className={`rounded-full ${colors.badge} px-2 py-0.5 text-[10px] font-bold text-white`}>
                    {phase.solutions.length} {phase.solutions.length === 1 ? "solution" : "solutions"}
                  </span>
                )}
              </div>
              {isActive && (
                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 ${colors.bg} ${colors.border} border-l-0 border-t-0 border-2`} />
              )}
            </button>
            {i < SDLC_PHASES.length - 1 && (
              <div className="flex items-center px-1 shrink-0">
                <div className={`h-0.5 w-6 ${SDLC_PHASES[i + 1].status === "tbd" ? "border-t border-dashed border-muted-foreground/40" : "bg-primary/30"}`} />
                <ArrowRight className={`h-4 w-4 shrink-0 ${SDLC_PHASES[i + 1].status === "tbd" ? "text-muted-foreground/40" : "text-primary/40"}`} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>

    {expandedPhase && (
      <PhaseDetailCard phase={SDLC_PHASES.find((p) => p.id === expandedPhase)!} onSelectUseCase={onSelectUseCase} />
    )}
  </div>
);

/* ═══════════════════════════════════════════════════
   Timeline View (unchanged from original)
   ═══════════════════════════════════════════════════ */
const TimelineView: React.FC<{
  onSelectUseCase?: (domainId: string, useCaseId: string) => void;
}> = ({ onSelectUseCase }) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const togglePhase = (id: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
      <div className="space-y-6">
        {SDLC_PHASES.map((phase, i) => {
          const colors = COLOR_MAP[phase.color] || COLOR_MAP.blue;
          const PhaseIcon = Icons[phase.icon as keyof typeof Icons] as React.ElementType | undefined;
          const isTbd = phase.status === "tbd";
          const isExpanded = expandedPhases.has(phase.id);

          return (
            <div key={phase.id} className="relative">
              <div className={`absolute -left-8 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                isTbd ? "border-muted-foreground/30 bg-muted" : `${colors.border} ${colors.light}`
              }`}>
                {PhaseIcon && <PhaseIcon className={`h-3 w-3 ${isTbd ? "text-muted-foreground" : colors.text}`} />}
              </div>
              <div className="absolute -left-[4.5rem] top-3.5 text-xs font-bold text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className={`rounded-xl border w-full sm:w-3/4 ${isTbd ? "border-dashed border-muted-foreground/30 bg-muted/10" : `${colors.border} bg-card`} transition-all hover:shadow-md`}>
                <button onClick={() => togglePhase(phase.id)} className="flex items-center gap-3 w-full p-5 text-left">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${isTbd ? "bg-muted" : colors.light}`}>
                    {PhaseIcon && <PhaseIcon className={`h-5 w-5 ${isTbd ? "text-muted-foreground" : colors.text}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold ${isTbd ? "text-muted-foreground" : "text-foreground"}`}>{phase.title}</h4>
                    <span className={`text-[10px] font-semibold ${isTbd ? "text-muted-foreground" : colors.text}`}>{phase.roleOfAgents}</span>
                  </div>
                  {isTbd ? (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shrink-0">Coming Soon</span>
                  ) : (
                    <span className={`rounded-full ${colors.badge} px-2.5 py-1 text-[10px] font-bold text-white shrink-0`}>
                      {phase.solutions.length} {phase.solutions.length === 1 ? "solution" : "solutions"}
                    </span>
                  )}
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 space-y-4 animate-leap-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                        <div className="flex items-center gap-1.5 mb-1"><AlertCircle className="h-3.5 w-3.5 text-red-500" /><span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Without AI</span></div>
                        <p className="text-xs text-red-700/80 leading-relaxed">{phase.painPoint}</p>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                        <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">With MAQ AI</span></div>
                        <p className="text-xs text-emerald-700/80 leading-relaxed">{phase.agenticSolution}</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Example</span>
                      <p className="mt-0.5 text-xs text-foreground/80">{phase.example}</p>
                    </div>
                    {phase.solutions.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Mapped Solutions</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {phase.solutions.map((sol) => (
                            <SolutionChip key={sol.id} solution={sol} phaseColor={phase.color} onSelectUseCase={onSelectUseCase} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">KPIs</span>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {phase.kpis.map((kpi) => (
                          <span key={kpi} className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground">
                            <BarChart3 className="h-3 w-3 text-primary" />{kpi}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Phase Detail Card
   ═══════════════════════════════════════════════════ */
const PhaseDetailCard: React.FC<{
  phase: SdlcPhase;
  onSelectUseCase?: (domainId: string, useCaseId: string) => void;
}> = ({ phase, onSelectUseCase }) => {
  const colors = COLOR_MAP[phase.color] || COLOR_MAP.blue;
  const PhaseIcon = Icons[phase.icon as keyof typeof Icons] as React.ElementType | undefined;
  const isTbd = phase.status === "tbd";

  return (
    <div className={`animate-leap-fade-in-up rounded-xl border-2 ${colors.border} ${colors.bg} p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.light}`}>
          {PhaseIcon && <PhaseIcon className={`h-5 w-5 ${colors.text}`} />}
        </div>
        <div>
          <h4 className="text-base font-bold text-foreground">{phase.title}</h4>
          <p className={`text-xs font-medium ${colors.text}`}>{phase.roleOfAgents}</p>
        </div>
        {isTbd && <span className="ml-auto rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">Coming Soon</span>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="rounded-lg border border-red-200 bg-white px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5"><AlertCircle className="h-4 w-4 text-red-500" /><span className="text-[11px] font-bold text-red-600 uppercase tracking-wide">Without AI</span></div>
          <p className="text-sm text-red-700/80 leading-relaxed">{phase.painPoint}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">With MAQ AI</span></div>
          <p className="text-sm text-emerald-700/80 leading-relaxed">{phase.agenticSolution}</p>
        </div>
      </div>
      <div className="mb-5 rounded-lg bg-white/60 border border-border/50 px-4 py-3">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Example</span>
        <p className="mt-1 text-sm text-foreground/80">{phase.example}</p>
      </div>
      {phase.solutions.length > 0 && (
        <div className="mb-5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Mapped Solutions</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {phase.solutions.map((sol) => (
              <SolutionChip key={sol.id} solution={sol} phaseColor={phase.color} onSelectUseCase={onSelectUseCase} />
            ))}
          </div>
        </div>
      )}
      {isTbd && (
        <div className="mb-5 rounded-lg border border-dashed border-muted-foreground/30 bg-white/40 p-4 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No agents mapped yet — opportunity to build</p>
        </div>
      )}
      <div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Key Performance Indicators</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {phase.kpis.map((kpi) => (
            <span key={kpi} className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />{kpi}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Solution Chip
   ═══════════════════════════════════════════════════ */
const SolutionChip: React.FC<{
  solution: { id: string; type: string; domainId?: string; architecture?: string };
  phaseColor: string;
  onSelectUseCase?: (domainId: string, useCaseId: string) => void;
}> = ({ solution, phaseColor, onSelectUseCase }) => {
  const colors = COLOR_MAP[phaseColor] || COLOR_MAP.blue;
  const archStyle = solution.architecture ? ARCH_STYLE[solution.architecture] || "" : "";
  const isClickable = solution.type === "agent" && solution.domainId && onSelectUseCase;
  const label = solution.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <button
      onClick={() => isClickable && onSelectUseCase!(solution.domainId!, solution.id)}
      className={`group flex items-center gap-2 rounded-lg border bg-white px-3 py-2 transition-all ${
        isClickable ? `${colors.border} hover:shadow-md hover:border-primary/40 cursor-pointer` : "border-border cursor-default"
      }`}
    >
      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{label}</span>
      {solution.architecture && (
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${archStyle}`}>{solution.architecture}</span>
      )}
      {isClickable && <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />}
    </button>
  );
};

/* ═══════════════════════════════════════════════════
   Coverage Scorecard
   ═══════════════════════════════════════════════════ */
const CoverageScorecard: React.FC = () => {
  const stats = getSdlcStats();

  return (
    <div className="rounded-xl border border-border bg-card p-5 w-full max-w-full">
      <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        MAQ AI SDLC Coverage
      </h4>
      <div className="space-y-3 mb-5">
        {SDLC_PHASES.map((phase) => {
          const colors = COLOR_MAP[phase.color] || COLOR_MAP.blue;
          const isTbd = phase.status === "tbd";
          const pct = isTbd ? 0 : phase.status === "partial" ? 50 : 100;

          return (
            <div key={phase.id} className="flex items-center gap-3">
          <span className={`min-w-[8rem] text-xs font-medium ${isTbd ? "text-muted-foreground" : "text-foreground"}`}>{phase.title}</span>
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all ${isTbd ? "bg-muted-foreground/20" : colors.badge}`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`min-w-[5rem] text-right text-[11px] font-semibold ${isTbd ? "text-muted-foreground" : colors.text}`}>
                {isTbd ? "TBD" : `${phase.solutions.length} ${phase.solutions.length === 1 ? "solution" : "solutions"}`}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
        {[
          { label: "Phases Automated", value: `${stats.mapped}/${stats.total}` },
          { label: "Solutions Deployed", value: String(stats.solutionCount) },
          { label: "SDLC Coverage", value: `${stats.coverage}%` },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgenticSdlc;