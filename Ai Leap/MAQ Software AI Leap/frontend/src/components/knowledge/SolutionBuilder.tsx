import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Bot, User, Send, Loader2, RotateCcw, Compass, Download,
  Network, ShieldAlert, DollarSign, CalendarRange, Shield,
  CheckCircle2, Circle, Clock, ChevronRight, Sparkles,
  AlertTriangle, AlertCircle, Info, ArrowRight, BookOpen,
  Building2, Zap, Target, ExternalLink,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import agentsData from "@/data/agents.json";

/* ─── Types ─── */
interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

interface BlueprintData {
  architecture?: {
    summary?: string;
    pattern?: string;
    agents?: { name: string; role: string; llm: string; tools: string[] }[];
    communication?: string;
    technology_stack?: Record<string, string>;
    mermaid?: string;
    data_flow?: string;
  };
  risks?: {
    risks?: { risk: string; severity: string; likelihood: string; mitigation: string }[];
    failure_modes?: { component: string; failure: string; fallback: string }[];
    compliance_notes?: string[];
  };
  security?: {
    threat_model?: { threat: string; category: string; mitigation: string }[];
    auth_requirements?: string;
    data_protection?: Record<string, string>;
    prompt_security?: Record<string, string>;
    checklist?: string[];
  };
  costs?: {
    token_costs?: { component: string; model: string; monthly_tokens: string; monthly_cost: string }[];
    infrastructure?: { service: string; tier: string; monthly_cost: string }[];
    total_monthly?: string;
    total_annual?: string;
    roi_timeline?: string;
    comparison?: { pay_as_you_go: string; reserved: string; savings: string };
  };
  plan?: {
    phases?: { phase: string; duration: string; tasks: string[]; deliverables: string[] }[];
    team_structure?: { role: string; count: number; focus: string }[];
    testing_strategy?: Record<string, string>;
    go_live_checklist?: string[];
    total_timeline?: string;
  };
}

interface ContextMatch {
  id: string;
  title: string;
  domain: string;
  domainId: string;
  score: number;
  description: string;
}

type BlueprintTab = "architecture" | "risks" | "security" | "costs" | "plan";

const AGENT_LABELS: Record<string, { label: string; color: string }> = {
  discovery: { label: "Discovery", color: "text-blue-500" },
  architecture: { label: "Architecture", color: "text-violet-500" },
  risks: { label: "Risk Assessment", color: "text-amber-500" },
  security: { label: "Security Review", color: "text-red-500" },
  costs: { label: "Cost Estimation", color: "text-emerald-500" },
  plan: { label: "Implementation", color: "text-cyan-500" },
  complete: { label: "Complete", color: "text-emerald-500" },
};

const BLUEPRINT_TABS: { id: BlueprintTab; label: string; icon: React.ReactNode }[] = [
  { id: "architecture", label: "Architecture", icon: <Network className="h-3.5 w-3.5" /> },
  { id: "risks", label: "Risks", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { id: "security", label: "Security", icon: <Shield className="h-3.5 w-3.5" /> },
  { id: "costs", label: "Costs", icon: <DollarSign className="h-3.5 w-3.5" /> },
  { id: "plan", label: "Plan", icon: <CalendarRange className="h-3.5 w-3.5" /> },
];

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

/* ─── SolutionBuilder Component ─── */
interface SolutionBuilderProps {
  onSelectUseCase?: (domainId: string, useCaseId: string) => void;
}

const SolutionBuilder: React.FC<SolutionBuilderProps> = ({ onSelectUseCase }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState("discovery");
  const [completedAgents, setCompletedAgents] = useState<string[]>([]);
  const [blueprint, setBlueprint] = useState<BlueprintData>({});
  const [contextMatches, setContextMatches] = useState<ContextMatch[]>([]);
  const [activeTab, setActiveTab] = useState<BlueprintTab>("architecture");
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const hasBlueprint = Object.keys(blueprint).some(
    (k) => blueprint[k as keyof BlueprintData] != null
  );

  /* ─── Send message ─── */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMsg = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/solution-builder/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), session_id: sessionId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setSessionId(data.session_id);
      setActiveAgent(data.active_agent);
      setCompletedAgents(data.completed_agents || []);
      setMessages((prev) => [...prev, { role: "assistant", text: data.message }]);

      // Merge blueprint
      if (data.blueprint) {
        setBlueprint(data.blueprint);
      }

      // Context matches
      if (data.context_matches?.solutions?.length) {
        setContextMatches(data.context_matches.solutions);
      }

      // Auto-switch to first populated tab
      if (data.blueprint_updates) {
        const tabKeys = Object.keys(data.blueprint_updates) as BlueprintTab[];
        if (tabKeys.length > 0 && BLUEPRINT_TABS.some((t) => t.id === tabKeys[0])) {
          setActiveTab(tabKeys[0]);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId]);

  // Auto-send pre-seeded query from AI Advisor (runs once on mount)
  const didAutoSend = useRef(false);
  useEffect(() => {
    if (didAutoSend.current) return;
    const pending = localStorage.getItem("leap-builder-query");
    if (pending && messages.length === 0) {
      didAutoSend.current = true;
      localStorage.removeItem("leap-builder-query");
      sendMessage(pending);
    }
  }, [sendMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  const handleReset = async () => {
    if (sessionId) {
      try {
        await fetch("/api/solution-builder/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "", session_id: sessionId }),
        });
      } catch {}
    }
    setMessages([]);
    setSessionId(null);
    setActiveAgent("discovery");
    setCompletedAgents([]);
    setBlueprint({});
    setContextMatches([]);
    setInput("");
  };

  /* ─── Training resources (static) ─── */
  const trainingResources = useMemo(() => [
    { title: "Agent Architecture Patterns", type: "Article", url: "#" },
    { title: "Prompt Engineering Best Practices", type: "Course", url: "#" },
    { title: "Azure AI Foundry Workshop", type: "Workshop", url: "#" },
    { title: "Semantic Kernel Quick Start", type: "Tutorial", url: "#" },
  ], []);

  const services = useMemo(() => [
    { title: "Solution Architecture Review", duration: "2-day engagement" },
    { title: "AI Agent Development Sprint", duration: "4-week sprint" },
    { title: "Production Readiness Audit", duration: "1-week assessment" },
  ], []);

  return (
    <div className="space-y-4">
      {/* Reset button */}
      {messages.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5"
          >
            <RotateCcw className="h-3 w-3" /> New Session
          </button>
        </div>
      )}

      {/* 3-Panel Layout */}
      <div className="grid grid-cols-12 gap-3" style={{ height: "calc(100vh - 230px)" }}>
        {/* ═══ Panel 1: Chat (30%) ═══ */}
        <div className="col-span-4 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/20">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">AI Consultant</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Bot className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  How can I help you build your AI solution?
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                  Describe your business problem and I'll design an architecture with risk assessment, security review, cost estimates, and implementation plan.
                </p>
                <div className="mt-5 space-y-2">
                  {[
                    "I need to automate invoice processing",
                    "Build a customer support chatbot",
                    "Create a document review pipeline",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="block w-full text-left rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors"
                    >
                      <ChevronRight className="h-3 w-3 inline mr-1 text-primary/60" />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-white"
                      : "bg-muted/60 text-foreground border border-border/40"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>
                        ),
                        li: ({ children }) => <li>{children}</li>,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    msg.text
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-xl bg-muted/60 border border-border/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handleSend();
                }}
                placeholder="Describe your business problem..."
                disabled={isLoading}
                className="flex-1 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══ Panel 2: Blueprint Canvas (45%) ═══ */}
        <div className="col-span-5 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-border bg-muted/20 px-1">
            {BLUEPRINT_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const hasData = blueprint[tab.id] != null;
              return (
                <button
                  key={tab.id}
                  onClick={() => hasData && setActiveTab(tab.id)}
                  disabled={!hasData}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                    isActive
                      ? "border-primary text-primary"
                      : hasData
                        ? "border-transparent text-muted-foreground hover:text-foreground"
                        : "border-transparent text-muted-foreground/40 cursor-not-allowed"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {hasData && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {!hasBlueprint ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                    <Network className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground max-w-[220px]">
                    Your solution blueprint will appear here as the AI agents
                    analyze your requirements.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {activeTab === "architecture" && blueprint.architecture && (
                  <ArchitectureTab data={blueprint.architecture} />
                )}
                {activeTab === "risks" && blueprint.risks && (
                  <RisksTab data={blueprint.risks} />
                )}
                {activeTab === "security" && blueprint.security && (
                  <SecurityTab data={blueprint.security} />
                )}
                {activeTab === "costs" && blueprint.costs && (
                  <CostsTab data={blueprint.costs} />
                )}
                {activeTab === "plan" && blueprint.plan && (
                  <PlanTab data={blueprint.plan} />
                )}
              </>
            )}
          </div>
        </div>

        {/* ═══ Panel 3: Context (25%) ═══ */}
        <div className="col-span-3 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
            <span className="text-sm font-semibold text-foreground">Context</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
            {/* Matching Solutions */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Matching Solutions
              </h4>
              {contextMatches.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">
                  Solutions will appear as we learn about your requirements.
                </p>
              ) : (
                <div className="space-y-2">
                  {contextMatches.map((sol) => (
                    <button
                      key={sol.id}
                      onClick={() => onSelectUseCase?.(sol.domainId, sol.id)}
                      className="w-full text-left rounded-lg border border-border/60 p-2.5 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {sol.title}
                        </span>
                        <span className="text-[10px] font-bold text-primary">{sol.score}%</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{sol.domain}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Training Resources */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Training Resources
              </h4>
              <div className="space-y-1.5">
                {trainingResources.map((r) => (
                  <div
                    key={r.title}
                    className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs text-foreground block truncate">{r.title}</span>
                      <span className="text-[10px] text-muted-foreground">{r.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Professional Services */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Professional Services
              </h4>
              <div className="space-y-1.5">
                {services.map((s) => (
                  <div
                    key={s.title}
                    className="rounded-lg border border-border/60 p-2.5"
                  >
                    <span className="text-xs font-medium text-foreground block">{s.title}</span>
                    <span className="text-[10px] text-muted-foreground">{s.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Agent Status Bar ═══ */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Agents
        </span>
        <div className="flex items-center gap-1.5 flex-1">
          {Object.entries(AGENT_LABELS)
            .filter(([k]) => k !== "complete")
            .map(([key, info]) => {
              const isCompleted = completedAgents.includes(key);
              const isActive = activeAgent === key;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${
                    isActive && !isCompleted
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : isCompleted
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-muted/50 text-muted-foreground/50"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : isActive ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                  {info.label}
                </div>
              );
            })}
        </div>
        {hasBlueprint && (
          <div className="flex items-center gap-1.5">
            <button className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 transition-colors">
              <Download className="h-3 w-3" /> Export PDF
            </button>
            <button className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 transition-colors">
              <Download className="h-3 w-3" /> Export PPTX
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   Blueprint Tab Sub-components
   ═══════════════════════════════════════════════════════════════════ */

/* ── Architecture Tab ── */
const ArchitectureTab: React.FC<{ data: BlueprintData["architecture"] }> = ({ data }) => {
  if (!data) return null;
  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Network className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Architecture Summary</span>
          {data.pattern && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {data.pattern}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{data.summary}</p>
      </div>

      {/* Agents */}
      {data.agents && data.agents.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-3">Agent Pipeline</h4>
          <div className="space-y-2">
            {data.agents.map((agent, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 text-xs font-bold">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{agent.name}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      {agent.llm}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{agent.role}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {agent.tools.map((t, j) => (
                      <span
                        key={j}
                        className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                {i < (data.agents?.length ?? 0) - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technology Stack */}
      {data.technology_stack && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Technology Stack</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.technology_stack).map(([key, val]) => (
              <div key={key} className="rounded-lg border border-border p-2.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                  {key.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-foreground font-medium">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Flow */}
      {data.data_flow && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Data Flow</h4>
          <p className="text-xs text-muted-foreground leading-relaxed rounded-lg bg-muted/30 p-3 border border-border/50">
            {data.data_flow}
          </p>
        </div>
      )}
    </div>
  );
};

/* ── Risks Tab ── */
const RisksTab: React.FC<{ data: BlueprintData["risks"] }> = ({ data }) => {
  if (!data) return null;

  const getSeverityIcon = (severity: string) => {
    if (severity === "Critical") return <AlertCircle className="h-3.5 w-3.5" />;
    if (severity === "High") return <AlertTriangle className="h-3.5 w-3.5" />;
    return <Info className="h-3.5 w-3.5" />;
  };

  return (
    <div className="space-y-5">
      {/* Risk Matrix Summary */}
      <div className="grid grid-cols-4 gap-2">
        {["Critical", "High", "Medium", "Low"].map((sev) => {
          const count = data.risks?.filter((r) => r.severity === sev).length ?? 0;
          return (
            <div
              key={sev}
              className={`rounded-lg border p-2.5 text-center ${SEVERITY_COLORS[sev]}`}
            >
              <span className="text-lg font-bold block">{count}</span>
              <span className="text-[10px] font-medium">{sev}</span>
            </div>
          );
        })}
      </div>

      {/* Risk List */}
      {data.risks && (
        <div className="space-y-2">
          {data.risks.map((risk, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="flex items-start gap-2">
                <div className={`shrink-0 mt-0.5 ${SEVERITY_COLORS[risk.severity]?.split(" ")[1] || "text-gray-500"}`}>
                  {getSeverityIcon(risk.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">{risk.risk}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${SEVERITY_COLORS[risk.severity]}`}>
                      {risk.severity}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      Likelihood: {risk.likelihood}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    <strong>Mitigation:</strong> {risk.mitigation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compliance Notes */}
      {data.compliance_notes && data.compliance_notes.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Compliance Notes</h4>
          <ul className="space-y-1">
            {data.compliance_notes.map((note, i) => (
              <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ── Security Tab ── */
const SecurityTab: React.FC<{ data: BlueprintData["security"] }> = ({ data }) => {
  if (!data) return null;
  return (
    <div className="space-y-5">
      {/* Threat Model */}
      {data.threat_model && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Threat Model (STRIDE)</h4>
          <div className="space-y-2">
            {data.threat_model.map((t, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs font-semibold text-foreground">{t.threat}</span>
                  <span className="rounded-full bg-red-50 border border-red-200 px-1.5 py-0.5 text-[9px] font-medium text-red-600">
                    {t.category}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground ml-6">{t.mitigation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Protection */}
      {data.data_protection && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Data Protection</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.data_protection).map(([key, val]) => (
              <div key={key} className="rounded-lg border border-border p-2.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                  {key.replace(/_/g, " ")}
                </span>
                <span className="text-[11px] text-foreground">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Checklist */}
      {data.checklist && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Security Checklist</h4>
          <div className="space-y-1">
            {data.checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="h-4 w-4 rounded border border-border flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Costs Tab ── */
const CostsTab: React.FC<{ data: BlueprintData["costs"] }> = ({ data }) => {
  if (!data) return null;
  return (
    <div className="space-y-5">
      {/* Cost Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <span className="text-[10px] text-muted-foreground block">Monthly</span>
          <span className="text-lg font-bold text-primary">{data.total_monthly}</span>
        </div>
        <div className="rounded-xl border border-border p-3 text-center">
          <span className="text-[10px] text-muted-foreground block">Annual</span>
          <span className="text-lg font-bold text-foreground">{data.total_annual}</span>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
          <span className="text-[10px] text-muted-foreground block">ROI Timeline</span>
          <span className="text-lg font-bold text-emerald-600">{data.roi_timeline}</span>
        </div>
      </div>

      {/* Token Costs */}
      {data.token_costs && data.token_costs.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">LLM Token Costs</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 text-[10px] text-muted-foreground font-semibold">
                  <td className="px-3 py-2">Component</td>
                  <td className="px-3 py-2">Model</td>
                  <td className="px-3 py-2">Monthly Tokens</td>
                  <td className="px-3 py-2 text-right">Cost</td>
                </tr>
              </thead>
              <tbody>
                {data.token_costs.map((row, i) => (
                  <tr key={i} className="border-t border-border/50 text-xs">
                    <td className="px-3 py-2 font-medium text-foreground">{row.component}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.model}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.monthly_tokens}</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">{row.monthly_cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Infrastructure */}
      {data.infrastructure && data.infrastructure.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Infrastructure</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 text-[10px] text-muted-foreground font-semibold">
                  <td className="px-3 py-2">Service</td>
                  <td className="px-3 py-2">Tier</td>
                  <td className="px-3 py-2 text-right">Cost</td>
                </tr>
              </thead>
              <tbody>
                {data.infrastructure.map((row, i) => (
                  <tr key={i} className="border-t border-border/50 text-xs">
                    <td className="px-3 py-2 font-medium text-foreground">{row.service}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.tier}</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">{row.monthly_cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pricing Comparison */}
      {data.comparison && (
        <div className="rounded-lg border border-border p-3">
          <h4 className="text-xs font-bold text-foreground mb-2">Pricing Comparison</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <span className="text-[10px] text-muted-foreground block">Pay-as-you-go</span>
              <span className="text-sm font-semibold text-foreground">{data.comparison.pay_as_you_go}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-muted-foreground block">Reserved</span>
              <span className="text-sm font-semibold text-emerald-600">{data.comparison.reserved}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-muted-foreground block">Savings</span>
              <span className="text-sm font-bold text-primary">{data.comparison.savings}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Plan Tab ── */
const PlanTab: React.FC<{ data: BlueprintData["plan"] }> = ({ data }) => {
  if (!data) return null;
  return (
    <div className="space-y-5">
      {/* Timeline summary */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground block">Total Timeline</span>
          <span className="text-lg font-bold text-primary">{data.total_timeline}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">Phases</span>
          <span className="text-lg font-bold text-foreground">{data.phases?.length ?? 0}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">Team Size</span>
          <span className="text-lg font-bold text-foreground">
            {data.team_structure?.reduce((s, t) => s + t.count, 0) ?? "—"}
          </span>
        </div>
      </div>

      {/* Phases */}
      {data.phases && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-3">Implementation Phases</h4>
          <div className="space-y-3">
            {data.phases.map((phase, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">{phase.phase}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {phase.duration}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground block mb-1">Tasks</span>
                    <ul className="space-y-0.5">
                      {phase.tasks.map((task, j) => (
                        <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-1">
                          <Circle className="h-2 w-2 shrink-0 mt-1 text-primary/40" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground block mb-1">Deliverables</span>
                    <ul className="space-y-0.5">
                      {phase.deliverables.map((d, j) => (
                        <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-1">
                          <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5 text-emerald-400" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Structure */}
      {data.team_structure && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Team Structure</h4>
          <div className="grid grid-cols-2 gap-2">
            {data.team_structure.map((member, i) => (
              <div key={i} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{member.role}</span>
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    ×{member.count}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">{member.focus}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Go-Live Checklist */}
      {data.go_live_checklist && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Go-Live Checklist</h4>
          <div className="space-y-1">
            {data.go_live_checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="h-4 w-4 rounded border border-border flex items-center justify-center shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SolutionBuilder;
