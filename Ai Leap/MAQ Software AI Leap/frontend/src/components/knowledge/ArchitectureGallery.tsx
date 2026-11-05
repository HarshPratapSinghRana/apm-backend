import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { ArrowRight, Layers } from "lucide-react";
import agentsData from "@/data/agents.json";

const archColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  "No Code": { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-600" },
  "Low Code": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-600" },
  "Pro Code": { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", badge: "bg-violet-600" },
};

interface UseCaseWithDomain {
  id: string;
  title: string;
  description: string;
  architecture: string;
  icon: string;
  domainId: string;
  domainName: string;
  domainIcon: string;
  architecturePattern: string;
  hasDiagram: boolean;
}

function getAllUseCases(): UseCaseWithDomain[] {
  const result: UseCaseWithDomain[] = [];
  for (const d of agentsData.domains) {
    for (const uc of d.use_cases) {
      result.push({
        id: uc.id,
        title: uc.title,
        description: uc.description,
        architecture: uc.architecture || "Pro Code",
        icon: uc.icon || "Bot",
        domainId: d.id,
        domainName: d.domain,
        domainIcon: d.icon,
        architecturePattern: (uc as unknown as { architecture_pattern?: string }).architecture_pattern || derivePattern(uc.architecture, uc.title),
        hasDiagram: !!(uc as unknown as { architecture_diagram?: string }).architecture_diagram,
      });
    }
  }
  return result;
}

function derivePattern(arch: string, title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("voice") || lower.includes("faq")) return "RAG + Voice + AI Search";
  if (lower.includes("report") || lower.includes("monday")) return "Scheduled Agent + Email Integration";
  if (lower.includes("style") || lower.includes("personal")) return "Recommendation Engine + LLM";
  if (lower.includes("inventory") || lower.includes("forecast")) return "Predictive Analytics + Time Series";
  if (lower.includes("customer service") || lower.includes("chat")) return "Conversational AI + Knowledge Base";
  if (lower.includes("document") || lower.includes("legal") || lower.includes("contract")) return "Document Intelligence + NLP";
  if (lower.includes("risk") || lower.includes("security") || lower.includes("fraud")) return "Classification + Anomaly Detection";
  if (lower.includes("hiring") || lower.includes("resume")) return "NLP + Ranking Pipeline";
  if (lower.includes("triage") || lower.includes("patient")) return "Decision Tree + Medical NLP";
  if (lower.includes("quality") || lower.includes("inspect")) return "Computer Vision + Edge AI";
  if (arch === "No Code") return "Copilot Studio Template";
  if (arch === "Low Code") return "Power Platform + AI Builder";
  return "Custom Agent Architecture";
}

interface ArchitectureGalleryProps {
  onSelectUseCase?: (domainId: string, useCaseId: string) => void;
}

const ArchitectureGallery: React.FC<ArchitectureGalleryProps> = ({ onSelectUseCase }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string | null>(null);
  const allUseCases = getAllUseCases();

  const archCounts: Record<string, number> = {};
  for (const uc of allUseCases) {
    archCounts[uc.architecture] = (archCounts[uc.architecture] || 0) + 1;
  }

  const filtered = filter ? allUseCases.filter((uc) => uc.architecture === filter) : allUseCases;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground">Architecture Gallery</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse solution architectures categorized by complexity tier. Click any card to explore the full solution.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {[null, "No Code", "Low Code", "Pro Code"].map((arch) => {
          const label = arch || "All";
          const count = arch ? (archCounts[arch] || 0) : allUseCases.length;
          const isActive = filter === arch;
          const colors = arch ? archColors[arch] : null;
          return (
            <button
              key={label}
              onClick={() => setFilter(arch)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? colors ? `${colors.badge} text-white` : "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                isActive ? "bg-white/25" : "bg-muted"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((uc) => {
          const colors = archColors[uc.architecture] || archColors["Pro Code"];
          const DomainIcon = Icons[uc.domainIcon as keyof typeof Icons] as React.ElementType | undefined;
          const UcIcon = Icons[uc.icon as keyof typeof Icons] as React.ElementType | undefined;

          return (
            <div
              key={uc.id}
              onClick={() => onSelectUseCase ? onSelectUseCase(uc.domainId, uc.id) : navigate(`/domain/${uc.domainId}?uc=${uc.id}`)}
              className={`group cursor-pointer rounded-xl border ${colors.border} bg-card overflow-hidden transition-all hover:shadow-lg hover:border-primary/30`}
            >
              {/* Architecture pattern visual placeholder */}
              <div className={`${colors.bg} px-5 py-6 relative`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className={`h-5 w-5 ${colors.text}`} />
                    <span className={`text-xs font-semibold ${colors.text}`}>{uc.architecturePattern}</span>
                  </div>
                  <span className={`rounded-md ${colors.badge} px-2 py-0.5 text-[10px] font-bold text-white`}>
                    {uc.architecture}
                  </span>
                </div>

                {/* Placeholder diagram visualization */}
                <div className="mt-4 flex items-center justify-center gap-2 opacity-50">
                  <div className={`h-8 w-16 rounded border ${colors.border} flex items-center justify-center`}>
                    <span className="text-[8px] font-medium">Input</span>
                  </div>
                  <span className={`text-xs ${colors.text}`}>→</span>
                  <div className={`h-8 w-16 rounded border ${colors.border} flex items-center justify-center`}>
                    <span className="text-[8px] font-medium">Agent</span>
                  </div>
                  <span className={`text-xs ${colors.text}`}>→</span>
                  <div className={`h-8 w-16 rounded border ${colors.border} flex items-center justify-center`}>
                    <span className="text-[8px] font-medium">Output</span>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="p-4">
                <div className="flex items-center gap-2">
                  {UcIcon && <UcIcon className="h-4 w-4 text-muted-foreground" />}
                  <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {uc.title}
                  </h4>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {DomainIcon && <DomainIcon className="h-3 w-3" />}
                  <span>{uc.domainName}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{uc.description}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  View Solution <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ArchitectureGallery;
