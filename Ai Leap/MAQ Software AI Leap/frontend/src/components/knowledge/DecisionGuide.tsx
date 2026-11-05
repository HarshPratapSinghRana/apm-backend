import React, { useState, useMemo, useEffect } from "react";
import {
  Clock, Users, Wrench, ArrowRight, ArrowLeft, CheckCircle2, XCircle,
  HelpCircle, Zap, Building2, Brain, Target, Gauge, Settings2,
  Rocket, ChevronRight, RotateCcw, Sparkles, MessageSquare, ListChecks,
} from "lucide-react";
import agentsData from "@/data/agents.json";
import { scoreSolutions, type ScoredSolution } from "@/lib/scoreSolutions";
import SolutionBuilder from "./SolutionBuilder";

/* ─── Architecture Tiers ─── */
const tiers = [
  {
    key: "No Code",
    color: "emerald",
    accent: "bg-emerald-600",
    lightBg: "bg-emerald-50",
    border: "border-emerald-200",
    textColor: "text-emerald-700",
    tagLine: "Build without writing a single line of code",
    bestFor: [
      "Quick wins & standard workflows",
      "Non-technical / business users",
      "Proof-of-concept in hours",
      "Copilot Studio, Power Platform",
    ],
    notFor: [
      "Custom ML models or fine-tuning",
      "Complex multi-step orchestration",
      "High-volume, low-latency pipelines",
    ],
    timeline: "Hours to Days",
    skills: "Business Analyst, Domain Expert",
    tools: "Copilot Studio, Power Automate, AI Builder",
    costProfile: "Low — subscription-based",
  },
  {
    key: "Low Code",
    color: "amber",
    accent: "bg-amber-600",
    lightBg: "bg-amber-50",
    border: "border-amber-200",
    textColor: "text-amber-700",
    tagLine: "Customize with minimal coding effort",
    bestFor: [
      "Custom workflows with some logic",
      "Power users & citizen developers",
      "Moderate customization needs",
      "Logic Apps, Power Automate + custom connectors",
    ],
    notFor: [
      "Full custom models from scratch",
      "Extremely complex business logic",
      "Bare-metal performance requirements",
    ],
    timeline: "Days to Weeks",
    skills: "Power Platform Developer, Business Technologist",
    tools: "Logic Apps, Power Automate, Azure AI Foundry",
    costProfile: "Medium — pay-per-use + licensing",
  },
  {
    key: "Pro Code",
    color: "violet",
    accent: "bg-violet-600",
    lightBg: "bg-violet-50",
    border: "border-violet-200",
    textColor: "text-violet-700",
    tagLine: "Full control with code-first development",
    bestFor: [
      "Complex multi-agent orchestration",
      "Custom ML models & fine-tuning",
      "Full API / microservice architecture",
      "Production-grade, scalable systems",
    ],
    notFor: [
      "Simple FAQ bots (overkill)",
      "When time-to-market < 1 week",
      "Teams without dev resources",
    ],
    timeline: "Weeks to Months",
    skills: "Python / .NET Developer, ML Engineer, DevOps",
    tools: "Semantic Kernel, LangChain, Azure AI Foundry SDK",
    costProfile: "Higher — compute + development hours",
  },
];

/* ─── Wizard Steps ─── */
interface WizardAnswer {
  domain: string | null;
  problemType: string | null;
  teamSkill: string | null;
  timeline: string | null;
  scale: string | null;
  customization: string | null;
}

const PROBLEM_TYPES = [
  { id: "automation", label: "Process Automation", icon: Zap, desc: "Automate repetitive tasks & workflows" },
  { id: "analytics", label: "Data & Analytics", icon: Gauge, desc: "Insights, reporting, and dashboards" },
  { id: "customer", label: "Customer Engagement", icon: Users, desc: "Chatbots, support, and personalization" },
  { id: "documents", label: "Document Processing", icon: Target, desc: "Extract, classify, and summarize documents" },
  { id: "knowledge", label: "Knowledge Management", icon: Brain, desc: "Search, Q&A, and knowledge bases" },
  { id: "quality", label: "Quality & Compliance", icon: CheckCircle2, desc: "Inspection, auditing, and governance" },
];

const TEAM_SKILLS = [
  { id: "business", label: "Business Users", desc: "No coding experience", weight: 0 },
  { id: "citizen", label: "Citizen Developers", desc: "Some low-code/Power Platform", weight: 1 },
  { id: "developers", label: "Software Engineers", desc: "Python, .NET, or similar", weight: 2 },
  { id: "ml-engineers", label: "ML / AI Engineers", desc: "Model training & MLOps", weight: 3 },
];

const TIMELINES = [
  { id: "days", label: "Days", desc: "Need it this week", weight: 0 },
  { id: "weeks", label: "1-4 Weeks", desc: "Short project cycle", weight: 1 },
  { id: "months", label: "1-3 Months", desc: "Full development cycle", weight: 2 },
  { id: "quarters", label: "3+ Months", desc: "Enterprise initiative", weight: 3 },
];

const SCALES = [
  { id: "pilot", label: "Pilot / PoC", desc: "Small team, testing ideas", weight: 0 },
  { id: "team", label: "Team / Department", desc: "10-100 users", weight: 1 },
  { id: "org", label: "Organization-wide", desc: "100-1000+ users", weight: 2 },
  { id: "enterprise", label: "Enterprise / Multi-org", desc: "Global scale, multi-tenant", weight: 3 },
];

const CUSTOMIZATIONS = [
  { id: "ootb", label: "Out of the box", desc: "Standard templates & prebuilt", weight: 0 },
  { id: "configure", label: "Some configuration", desc: "Customize prompts & workflows", weight: 1 },
  { id: "extend", label: "Extend & integrate", desc: "Custom connectors & APIs", weight: 2 },
  { id: "build", label: "Build from scratch", desc: "Fully custom architecture", weight: 3 },
];

const STEPS = [
  { key: "domain", title: "Industry", subtitle: "What domain are you working in?", icon: Building2 },
  { key: "problemType", title: "Problem", subtitle: "What type of problem are you solving?", icon: Target },
  { key: "teamSkill", title: "Team", subtitle: "What's your team's technical capability?", icon: Users },
  { key: "timeline", title: "Timeline", subtitle: "How quickly do you need a solution?", icon: Clock },
  { key: "scale", title: "Scale", subtitle: "How broadly will this be deployed?", icon: Gauge },
  { key: "customization", title: "Customization", subtitle: "How much customization do you need?", icon: Settings2 },
] as const;

function computeRecommendation(answers: WizardAnswer) {
  // Score each tier based on answers
  const scores = { "No Code": 0, "Low Code": 0, "Pro Code": 0 };

  // Team skills
  const skill = TEAM_SKILLS.find((t) => t.id === answers.teamSkill);
  if (skill) {
    if (skill.weight <= 0) { scores["No Code"] += 4; scores["Low Code"] += 1; }
    else if (skill.weight === 1) { scores["Low Code"] += 4; scores["No Code"] += 2; }
    else if (skill.weight === 2) { scores["Pro Code"] += 3; scores["Low Code"] += 2; }
    else { scores["Pro Code"] += 5; }
  }

  // Timeline
  const tl = TIMELINES.find((t) => t.id === answers.timeline);
  if (tl) {
    if (tl.weight === 0) { scores["No Code"] += 4; }
    else if (tl.weight === 1) { scores["Low Code"] += 3; scores["No Code"] += 1; }
    else if (tl.weight === 2) { scores["Pro Code"] += 2; scores["Low Code"] += 2; }
    else { scores["Pro Code"] += 4; }
  }

  // Scale
  const sc = SCALES.find((t) => t.id === answers.scale);
  if (sc) {
    if (sc.weight <= 0) { scores["No Code"] += 2; scores["Low Code"] += 1; }
    else if (sc.weight === 1) { scores["Low Code"] += 2; scores["No Code"] += 1; }
    else if (sc.weight === 2) { scores["Pro Code"] += 2; scores["Low Code"] += 2; }
    else { scores["Pro Code"] += 4; }
  }

  // Customization
  const cust = CUSTOMIZATIONS.find((t) => t.id === answers.customization);
  if (cust) {
    if (cust.weight === 0) { scores["No Code"] += 4; }
    else if (cust.weight === 1) { scores["Low Code"] += 3; scores["No Code"] += 1; }
    else if (cust.weight === 2) { scores["Pro Code"] += 2; scores["Low Code"] += 3; }
    else { scores["Pro Code"] += 5; }
  }

  // Find best tier
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const primary = sorted[0][0];
  const secondary = sorted[1][0];
  const total = sorted[0][1] + sorted[1][1] + sorted[2][1];

  return {
    primary,
    secondary,
    confidence: total > 0 ? Math.round((sorted[0][1] / total) * 100) : 50,
    scores,
  };
}

function buildSearchQuery(answers: WizardAnswer): string {
  const parts: string[] = [];
  if (answers.domain) {
    const d = agentsData.domains.find((dd) => dd.id === answers.domain);
    if (d) parts.push(d.domain);
  }
  const pt = PROBLEM_TYPES.find((p) => p.id === answers.problemType);
  if (pt) parts.push(pt.label);
  return parts.join(" ") || "AI solutions";
}

/* ─── Roadmap Phases ─── */
function getRoadmap(primary: string) {
  if (primary === "No Code") return [
    { phase: "Quick Win", desc: "Deploy a prebuilt template or Copilot Studio agent", time: "1-3 days", color: "bg-emerald-500" },
    { phase: "Customize", desc: "Tune prompts, add connectors, adjust workflows", time: "1-2 weeks", color: "bg-emerald-400" },
    { phase: "Scale", desc: "Roll out to more teams, monitor & iterate", time: "2-4 weeks", color: "bg-emerald-300" },
  ];
  if (primary === "Low Code") return [
    { phase: "Prototype", desc: "Build initial flow with Logic Apps or Power Automate", time: "1-2 weeks", color: "bg-amber-500" },
    { phase: "Integrate", desc: "Connect APIs, add custom connectors and business logic", time: "2-4 weeks", color: "bg-amber-400" },
    { phase: "Optimize", desc: "Performance tuning, monitoring, and team training", time: "1-2 months", color: "bg-amber-300" },
  ];
  return [
    { phase: "Design", desc: "Architecture design, tech stack selection, PoC", time: "2-4 weeks", color: "bg-violet-500" },
    { phase: "Build", desc: "Core development, model integration, testing", time: "1-3 months", color: "bg-violet-400" },
    { phase: "Deploy", desc: "CI/CD pipeline, monitoring, production rollout", time: "2-4 weeks", color: "bg-violet-300" },
  ];
}

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */
interface DecisionGuideProps {
  onSelectUseCase?: (domainId: string, useCaseId: string) => void;
}

const DecisionGuide: React.FC<DecisionGuideProps> = ({ onSelectUseCase }) => {
  const [mode, setMode] = useState<"builder" | "quick">("quick");
  const [wizardStep, setWizardStep] = useState(-1); // -1 = show comparison, 0+ = wizard
  const [answers, setAnswers] = useState<WizardAnswer>({
    domain: null, problemType: null, teamSkill: null,
    timeline: null, scale: null, customization: null,
  });
  const [showResult, setShowResult] = useState(false);

  // Auto-switch to Builder Mode when redirected from AI Advisor
  useEffect(() => {
    if (localStorage.getItem("leap-builder-query")) {
      setMode("builder");
    }
  }, []);

  // Count use cases per architecture
  const archCounts: Record<string, number> = {};
  for (const d of agentsData.domains) {
    for (const uc of d.use_cases) {
      archCounts[uc.architecture] = (archCounts[uc.architecture] || 0) + 1;
    }
  }

  const domains = agentsData.domains.map((d) => ({ id: d.id, name: d.domain, icon: d.icon }));

  const recommendation = useMemo(() => {
    if (!showResult) return null;
    return computeRecommendation(answers);
  }, [answers, showResult]);

  const matchingSolutions: ScoredSolution[] = useMemo(() => {
    if (!showResult || !recommendation) return [];
    const query = buildSearchQuery(answers);
    const result = scoreSolutions(query);
    // Filter to recommended architecture, take top 5
    const primary = result.solutions.filter((s) => s.architecture === recommendation.primary);
    const secondary = result.solutions.filter((s) => s.architecture === recommendation.secondary);
    return [...primary.slice(0, 3), ...secondary.slice(0, 2)];
  }, [answers, showResult, recommendation]);

  const roadmap = useMemo(() => {
    if (!recommendation) return [];
    return getRoadmap(recommendation.primary);
  }, [recommendation]);

  const handleAnswer = (key: keyof WizardAnswer, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (wizardStep < STEPS.length - 1) {
      setWizardStep(wizardStep + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleBack = () => {
    if (showResult) { setShowResult(false); return; }
    if (wizardStep > 0) setWizardStep(wizardStep - 1);
    else setWizardStep(-1);
  };

  const resetWizard = () => {
    setWizardStep(-1);
    setShowResult(false);
    setAnswers({ domain: null, problemType: null, teamSkill: null, timeline: null, scale: null, customization: null });
  };

  const tierInfo = recommendation ? tiers.find((t) => t.key === recommendation.primary) : null;

  return (
    <div className="space-y-10">
      {/* ─── Section 1: Architecture Comparison (always visible) ─── */}
      <div>
        <h3 className="text-lg font-bold text-foreground">When to use each approach</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the right architecture tier based on your team's skills, timeline, and complexity requirements.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {tiers.map((tier) => (
            <div key={tier.key} className={`rounded-xl border ${tier.border} ${tier.lightBg} p-5`}>
              <div className="flex items-center justify-between">
                <span className={`rounded-lg ${tier.accent} px-3 py-1 text-sm font-bold text-white`}>
                  {tier.key}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {archCounts[tier.key] || 0} solutions
                </span>
              </div>
              <p className={`mt-2 text-sm font-medium ${tier.textColor}`}>{tier.tagLine}</p>

              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Best for</h4>
                <ul className="mt-2 space-y-1.5">
                  {tier.bestFor.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${tier.textColor}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Not ideal for</h4>
                <ul className="mt-2 space-y-1.5">
                  {tier.notFor.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 space-y-2 border-t border-border/50 pt-4">
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Timeline:</span>
                  <span className="font-medium text-foreground">{tier.timeline}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Skills:</span>
                  <span className="font-medium text-foreground">{tier.skills}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Tools:</span>
                  <span className="font-medium text-foreground">{tier.tools}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Section 2: Solution Builder with Mode Toggle ─── */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Solution Builder
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "quick"
                ? "Answer 6 questions and get a personalized architecture recommendation with matching solutions."
                : "AI-powered blueprint generator — describe your problem and get a full solution design."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {mode === "quick" && wizardStep >= 0 && (
              <button onClick={resetWizard} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw className="h-3 w-3" /> Start over
              </button>
            )}
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-1">
              <button
                onClick={() => setMode("quick")}
                className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-all ${
                  mode === "quick"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListChecks className="h-3.5 w-3.5" />
                Quick Mode
              </button>
              <button
                onClick={() => setMode("builder")}
                className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-all ${
                  mode === "builder"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Builder Mode
              </button>
            </div>
          </div>
        </div>

        {/* ─── Builder Mode ─── */}
        {mode === "builder" && (
          <div className="mt-6">
            <SolutionBuilder onSelectUseCase={onSelectUseCase} />
          </div>
        )}

        {/* ─── Quick Mode (Wizard) ─── */}
        {mode === "quick" && (
        <>
        {/* Start CTA */}
        {wizardStep === -1 && !showResult && (
          <div className="mt-6 rounded-xl border border-border bg-card p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <h4 className="mt-4 text-base font-semibold text-foreground">Build your solution approach</h4>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Tell us about your project requirements and we'll recommend the right architecture, matching solutions, and a phased implementation roadmap.
            </p>
            <button
              onClick={() => setWizardStep(0)}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Start Solution Builder
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Wizard Steps */}
        {wizardStep >= 0 && !showResult && (
          <div className="mt-6">
            {/* Progress bar */}
            <div className="flex items-center gap-1 mb-6">
              {STEPS.map((step, i) => {
                const StepIcon = step.icon;
                const isActive = i === wizardStep;
                const isDone = i < wizardStep;
                return (
                  <React.Fragment key={step.key}>
                    <button
                      onClick={() => i < wizardStep && setWizardStep(i)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-primary text-white shadow-sm"
                          : isDone
                          ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                          : "bg-muted/50 text-muted-foreground/50"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-3 w-3" /> : <StepIcon className="h-3 w-3" />}
                      <span className="hidden sm:inline">{step.title}</span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <ChevronRight className={`h-3 w-3 flex-shrink-0 ${i < wizardStep ? "text-primary/40" : "text-muted-foreground/20"}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Question card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <span className="text-xs text-muted-foreground">
                  Step {wizardStep + 1} of {STEPS.length}
                </span>
              </div>
              <h4 className="text-base font-semibold text-foreground mt-2">{STEPS[wizardStep].subtitle}</h4>

              {/* Domain selector */}
              {STEPS[wizardStep].key === "domain" && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {domains.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleAnswer("domain", d.id)}
                      className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-all hover:border-primary/40 hover:shadow-sm ${
                        answers.domain === d.id ? "border-primary bg-primary/5 font-medium" : "border-border bg-card"
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Problem type selector */}
              {STEPS[wizardStep].key === "problemType" && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROBLEM_TYPES.map((pt) => {
                    const Icon = pt.icon;
                    return (
                      <button
                        key={pt.id}
                        onClick={() => handleAnswer("problemType", pt.id)}
                        className={`rounded-lg border px-3 py-3 text-left transition-all hover:border-primary/40 hover:shadow-sm ${
                          answers.problemType === pt.id ? "border-primary bg-primary/5" : "border-border bg-card"
                        }`}
                      >
                        <Icon className="h-4 w-4 text-primary mb-1" />
                        <div className="text-sm font-medium text-foreground">{pt.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{pt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Team skills */}
              {STEPS[wizardStep].key === "teamSkill" && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {TEAM_SKILLS.map((ts) => (
                    <button
                      key={ts.id}
                      onClick={() => handleAnswer("teamSkill", ts.id)}
                      className={`rounded-lg border px-4 py-3 text-left transition-all hover:border-primary/40 hover:shadow-sm ${
                        answers.teamSkill === ts.id ? "border-primary bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      <div className="text-sm font-medium text-foreground">{ts.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{ts.desc}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Timeline */}
              {STEPS[wizardStep].key === "timeline" && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIMELINES.map((tl) => (
                    <button
                      key={tl.id}
                      onClick={() => handleAnswer("timeline", tl.id)}
                      className={`rounded-lg border px-3 py-3 text-center transition-all hover:border-primary/40 hover:shadow-sm ${
                        answers.timeline === tl.id ? "border-primary bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      <div className="text-sm font-medium text-foreground">{tl.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{tl.desc}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Scale */}
              {STEPS[wizardStep].key === "scale" && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {SCALES.map((sc) => (
                    <button
                      key={sc.id}
                      onClick={() => handleAnswer("scale", sc.id)}
                      className={`rounded-lg border px-4 py-3 text-left transition-all hover:border-primary/40 hover:shadow-sm ${
                        answers.scale === sc.id ? "border-primary bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      <div className="text-sm font-medium text-foreground">{sc.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{sc.desc}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Customization */}
              {STEPS[wizardStep].key === "customization" && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {CUSTOMIZATIONS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleAnswer("customization", c.id)}
                      className={`rounded-lg border px-4 py-3 text-left transition-all hover:border-primary/40 hover:shadow-sm ${
                        answers.customization === c.id ? "border-primary bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      <div className="text-sm font-medium text-foreground">{c.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{c.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Results ─── */}
        {showResult && recommendation && tierInfo && (
          <div className="mt-6 space-y-6 animate-leap-fade-in-up">
            {/* Back + restart */}
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" /> Adjust answers
              </button>
              <button onClick={resetWizard} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw className="h-3 w-3" /> Start over
              </button>
            </div>

            {/* Recommendation card */}
            <div className={`rounded-xl border-2 ${tierInfo.border} ${tierInfo.lightBg} p-6`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-lg ${tierInfo.accent} px-3 py-1 text-sm font-bold text-white`}>
                      {recommendation.primary}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {recommendation.confidence}% confidence
                    </span>
                  </div>
                  <h4 className="mt-2 text-lg font-bold text-foreground">
                    Recommended: {recommendation.primary}
                  </h4>
                  <p className={`mt-1 text-sm ${tierInfo.textColor}`}>{tierInfo.tagLine}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted-foreground">Also consider</div>
                  <div className="mt-0.5 text-sm font-medium text-foreground">{recommendation.secondary}</div>
                </div>
              </div>

              {/* Quick facts */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-white/60 border border-border/30 p-3 text-center">
                  <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
                  <div className="mt-1 text-xs font-semibold text-foreground">{tierInfo.timeline}</div>
                  <div className="text-[10px] text-muted-foreground">Estimated timeline</div>
                </div>
                <div className="rounded-lg bg-white/60 border border-border/30 p-3 text-center">
                  <Users className="h-4 w-4 text-muted-foreground mx-auto" />
                  <div className="mt-1 text-xs font-semibold text-foreground">{tierInfo.skills.split(",")[0]}</div>
                  <div className="text-[10px] text-muted-foreground">Key role</div>
                </div>
                <div className="rounded-lg bg-white/60 border border-border/30 p-3 text-center">
                  <Wrench className="h-4 w-4 text-muted-foreground mx-auto" />
                  <div className="mt-1 text-xs font-semibold text-foreground">{tierInfo.costProfile.split("—")[0].trim()}</div>
                  <div className="text-[10px] text-muted-foreground">Cost profile</div>
                </div>
              </div>
            </div>

            {/* Implementation Roadmap */}
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Rocket className="h-4 w-4 text-primary" />
                Implementation Roadmap
              </h4>
              <div className="mt-3 flex gap-3">
                {roadmap.map((phase, i) => (
                  <div key={i} className="flex-1 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-2 w-2 rounded-full ${phase.color}`} />
                      <span className="text-xs font-bold text-foreground">Phase {i + 1}: {phase.phase}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{phase.desc}</p>
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {phase.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Matching Solutions */}
            {matchingSolutions.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-primary" />
                  Top Matching Solutions
                </h4>
                <div className="mt-3 space-y-2">
                  {matchingSolutions.map((sol) => {
                    const archStyle = sol.architecture === "No Code"
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                      : sol.architecture === "Low Code"
                      ? "bg-amber-500/10 text-amber-700 border-amber-200"
                      : "bg-violet-500/10 text-violet-700 border-violet-200";
                    return (
                      <div key={sol.id} onClick={() => onSelectUseCase?.(sol.domainId, sol.id)} className={`flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 ${onSelectUseCase ? 'cursor-pointer' : ''} hover:border-primary/30 hover:shadow-sm transition-all`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{sol.title}</span>
                            <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${archStyle}`}>
                              {sol.architecture}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{sol.domainName} — {sol.description}</p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary shrink-0">
                          {sol.score}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommended Tech Stack */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="text-sm font-bold text-foreground">Recommended Tech Stack</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {tierInfo.tools.split(", ").map((tool) => (
                  <span key={tool} className="rounded-md bg-card border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                    {tool}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium">Team:</span> {tierInfo.skills}
              </p>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default DecisionGuide;
