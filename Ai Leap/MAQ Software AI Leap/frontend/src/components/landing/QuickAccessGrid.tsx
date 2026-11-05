import React from "react";
import { Package, GraduationCap, BarChart3, Wrench, Lightbulb, ArrowRight } from "lucide-react";

interface QuickAccessGridProps {
  onNavigate: (branch: string, child?: string) => void;
}

const cards = [
  {
    id: "products",
    branch: "solutions",
    child: "solutions-by-technology",
    icon: Package,
    title: "Products & Tools",
    description: "15+ enterprise AI products including EmbedFAST, AI-DataLens, CertyFAST, and more.",
    stat: "15+",
  },
  {
    id: "training",
    branch: "training",
    child: "coe",
    icon: GraduationCap,
    title: "Training & Workshops",
    description: "COE programs, hands-on workshops, and learning paths for GenAI and Agentic AI.",
    stat: "3 programs",
  },
  {
    id: "case-studies",
    branch: "case-studies",
    icon: BarChart3,
    title: "Case Studies",
    description: "78+ real-world success stories across Agentic AI, data modernization, and analytics.",
    stat: "78+",
  },
  {
    id: "productivity",
    branch: "productivity",
    child: "solutions-tools",
    icon: Wrench,
    title: "Productivity Tools",
    description: "SWE Agent, DocuSphere, Prompt Playbook, and reusable components for rapid development.",
    stat: "5 tools",
  },
  {
    id: "knowledge",
    branch: "knowledge-hub",
    child: "kb-architectures",
    icon: Lightbulb,
    title: "Knowledge Hub",
    description: "Architecture gallery, No Code / Low Code / Pro Code decision guide, and evaluation framework.",
    stat: "3 guides",
  },
];

const QuickAccessGrid: React.FC<QuickAccessGridProps> = ({ onNavigate }) => {
  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-bold text-foreground">Quick Access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Jump directly to platform sections
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => onNavigate(c.branch, c.child)}
                className="group flex flex-col rounded-xl border border-border bg-white p-5 text-left transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{c.stat}</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">{c.title}</h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Explore <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default QuickAccessGrid;
