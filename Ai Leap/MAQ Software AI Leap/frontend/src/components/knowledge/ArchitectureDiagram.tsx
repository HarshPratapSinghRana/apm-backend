import React from "react";

interface ArchitectureDiagramProps {
  data: {
    style: "single-agent" | "multi-agent";
    llm_provider: string;
    // single-agent (layered)
    layers?: { name: string; items: string[] }[];
    // multi-agent
    supervisor?: { name: string; role: string };
    agents?: { name: string; tools: string[] }[];
    data_stores?: string[];
    monitoring?: string[];
    security?: string[];
  };
}

const AGENT_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", accent: "bg-blue-500" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", accent: "bg-emerald-500" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", accent: "bg-amber-500" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", accent: "bg-violet-500" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", accent: "bg-rose-500" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", accent: "bg-teal-500" },
];

const LAYER_COLORS = [
  { bg: "bg-slate-50", border: "border-slate-200", accent: "text-slate-700" },
  { bg: "bg-sky-50", border: "border-sky-200", accent: "text-sky-700" },
  { bg: "bg-indigo-50", border: "border-indigo-200", accent: "text-indigo-700" },
  { bg: "bg-emerald-50", border: "border-emerald-200", accent: "text-emerald-700" },
  { bg: "bg-amber-50", border: "border-amber-200", accent: "text-amber-700" },
];

const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({ data }) => {
  if (data.style === "multi-agent") {
    return <MultiAgentDiagram data={data} />;
  }
  return <SingleAgentDiagram data={data} />;
};

/* ─── Multi-Agent (Image 2 style) ─── */
const MultiAgentDiagram: React.FC<{ data: ArchitectureDiagramProps["data"] }> = ({ data }) => {
  const agents = data.agents || [];
  const dataStores = data.data_stores || [];
  const monitoring = data.monitoring || [];
  const security = data.security || [];

  return (
    <div className="space-y-4">
      {/* LLM Provider */}
      <div className="flex justify-center">
        <div className="rounded-xl border-2 border-sky-200 bg-sky-50 px-6 py-3 text-center">
          <div className="text-[10px] font-medium uppercase tracking-wider text-sky-500">LLM Provider</div>
          <div className="text-sm font-bold text-sky-700">{data.llm_provider}</div>
          <div className="text-[10px] text-sky-600">GPT Models</div>
        </div>
      </div>

      {/* Connector line */}
      <div className="flex justify-center">
        <div className="w-px h-6 bg-border" />
      </div>

      {/* Supervisor */}
      {data.supervisor && (
        <>
          <div className="flex justify-center">
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-8 py-3 text-center max-w-sm">
              <div className="text-[10px] font-medium uppercase tracking-wider text-primary/60">Orchestrator</div>
              <div className="text-sm font-bold text-foreground">{data.supervisor.name}</div>
              <div className="text-[10px] text-muted-foreground">{data.supervisor.role}</div>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-px h-4 bg-border" />
          </div>
          {/* Branching lines */}
          <div className="flex justify-center px-8">
            <div className="flex-1 h-px bg-border/60 max-w-lg" />
          </div>
        </>
      )}

      {/* Agents Grid */}
      <div className={`grid gap-3 ${agents.length <= 2 ? "grid-cols-2" : agents.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
        {agents.map((agent, i) => {
          const color = AGENT_COLORS[i % AGENT_COLORS.length];
          return (
            <div key={i} className={`rounded-xl border ${color.border} ${color.bg} p-3`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-2 w-2 rounded-full ${color.accent}`} />
                <span className={`text-xs font-bold ${color.text}`}>{agent.name}</span>
              </div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Tools</div>
              <div className="space-y-0.5">
                {agent.tools.map((tool, j) => (
                  <div key={j} className="flex items-center gap-1 text-[11px] text-foreground">
                    <span className={`h-1 w-1 rounded-full ${color.accent}`} />
                    {tool}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connector */}
      <div className="flex justify-center">
        <div className="flex-1 h-px bg-border/60 max-w-lg" />
      </div>

      {/* Data & Storage */}
      {dataStores.length > 0 && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-teal-600 mb-2">Data & Storage</div>
          <div className="flex flex-wrap gap-2">
            {dataStores.map((store, i) => (
              <span key={i} className="rounded-md border border-teal-200 bg-white px-2.5 py-1 text-[11px] font-medium text-teal-700">
                {store}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Security & Monitoring */}
      <div className="grid grid-cols-2 gap-3">
        {security.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Security</div>
            <div className="space-y-0.5">
              {security.map((s, i) => (
                <div key={i} className="text-[11px] text-foreground">{s}</div>
              ))}
            </div>
          </div>
        )}
        {monitoring.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Monitoring</div>
            <div className="space-y-0.5">
              {monitoring.map((m, i) => (
                <div key={i} className="text-[11px] text-foreground">{m}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Single Agent (Image 3 style — layered left-to-right) ─── */
const SingleAgentDiagram: React.FC<{ data: ArchitectureDiagramProps["data"] }> = ({ data }) => {
  const layers = data.layers || [];

  return (
    <div className="space-y-3">
      {/* LLM Provider small badge */}
      <div className="flex justify-end">
        <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
          {data.llm_provider}
        </span>
      </div>

      {/* Layered flow */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {layers.map((layer, i) => {
          const color = LAYER_COLORS[i % LAYER_COLORS.length];
          return (
            <React.Fragment key={i}>
              <div className={`flex-1 min-w-[120px] rounded-xl border ${color.border} ${color.bg} p-3`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${color.accent} mb-2`}>
                  {layer.name}
                </div>
                <div className="space-y-1">
                  {layer.items.map((item, j) => (
                    <div key={j} className="rounded-md bg-white border border-border/40 px-2 py-1 text-[11px] text-foreground text-center">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              {i < layers.length - 1 && (
                <div className="flex items-center shrink-0">
                  <div className="w-4 h-px bg-border" />
                  <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-border" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ArchitectureDiagram;
