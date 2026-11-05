import { FC, useState } from "react";
import { Project } from "@/types/project";
import {
  ArrowLeft, Play, FileText, Lightbulb, Layers, Users, Calendar,
  CheckCircle2, BarChart3,
} from "lucide-react";

interface ProjectDetailPanelProps {
  project: Project;
  onBack: () => void;
}

export const ProjectDetailPanel: FC<ProjectDetailPanelProps> = ({
  project,
  onBack,
}) => {
  const { detail } = project;
  const [activeTab, setActiveTab] = useState<"overview" | "architecture" | "demo">("overview");

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: FileText },
    { id: "architecture" as const, label: "Architecture", icon: Layers },
    { id: "demo" as const, label: "Demo Video", icon: Play },
  ];

  return (
    <div className="animate-leap-fade-in-up">
      {/* Project Header */}
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {project.title}
              </h1>
              <span
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  project.status === "Active"
                    ? "bg-emerald-100 text-emerald-700"
                    : project.status === "Pilot"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {project.status}
              </span>
            </div>
            <p className="text-muted-foreground text-base leading-relaxed">
              {project.description}
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {detail.keyMetrics.map((metric, i) => (
            <div
              key={i}
              className="text-center p-4 rounded-xl bg-muted/50 border border-border"
            >
              <div className="text-2xl font-bold text-primary">{metric.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="animate-leap-fade-in-up">
        {activeTab === "overview" && <OverviewTab project={project} />}
        {activeTab === "architecture" && <ArchitectureTab project={project} />}
        {activeTab === "demo" && <DemoTab project={project} />}
      </div>
    </div>
  );
};

/* ─── Overview Tab ──────────────────────────────────── */
const OverviewTab: FC<{ project: Project }> = ({ project }) => {
  const { detail } = project;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main content - 2 cols */}
      <div className="lg:col-span-2 space-y-6">
        {/* Problem Statement */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-red-50">
              <Lightbulb className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">
              Problem Statement
            </h3>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {detail.problemStatement}
          </p>
        </div>

        {/* Solution */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-emerald-50">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Solution</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {detail.solution}
          </p>
        </div>

        {/* Outcomes */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-blue-50">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Outcomes</h3>
          </div>
          <ul className="space-y-3">
            {detail.outcomes.map((outcome, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sidebar - 1 col */}
      <div className="space-y-6">
        {/* Tech Stack */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {detail.techStack.map((tech, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 rounded-full font-medium bg-primary/10 text-primary"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Team</h3>
          </div>
          <ul className="space-y-3">
            {detail.team.map((member, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {member.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {member.role}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Details */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">Details</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Industry</dt>
              <dd className="font-medium text-foreground">{project.industry}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Function</dt>
              <dd className="font-medium text-foreground">{project.function}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{detail.timeline}</span>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

/* ─── Architecture Tab ──────────────────────────────── */
const ArchitectureTab: FC<{ project: Project }> = ({ project }) => {
  const { detail } = project;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-purple-50">
            <Layers className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">
            Architecture Diagram
          </h3>
        </div>
        <div className="bg-muted/30 border border-border rounded-xl p-6 overflow-x-auto">
          <pre className="text-sm text-foreground font-mono leading-relaxed whitespace-pre">
            {detail.architectureDiagram}
          </pre>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg text-foreground mb-4">
          Technology Stack
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {detail.techStack.map((tech, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  i % 3 === 0
                    ? "bg-blue-500"
                    : i % 3 === 1
                    ? "bg-emerald-500"
                    : "bg-purple-500"
                }`}
              />
              <span className="text-sm font-medium text-foreground">{tech}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Demo Video Tab ────────────────────────────────── */
const DemoTab: FC<{ project: Project }> = ({ project }) => {
  const { detail } = project;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Play className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">
            {detail.demoVideoTitle}
          </h3>
        </div>
        {detail.demoVideoUrl ? (
          <div
            className="relative w-full rounded-xl overflow-hidden border border-border bg-black"
            style={{ paddingBottom: "56.25%" }}
          >
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={detail.demoVideoUrl}
              title={detail.demoVideoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="w-full rounded-xl border border-border bg-muted/30 flex items-center justify-center py-20">
            <div className="text-center">
              <Play className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Demo video coming soon
              </p>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-4">
          Watch the full demonstration of the {project.title} solution in action.
        </p>
      </div>

      {/* Quick outcomes recap */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Key Results</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {detail.keyMetrics.map((metric, i) => (
            <div
              key={i}
              className="text-center p-4 rounded-xl bg-muted/50 border border-border"
            >
              <div className="text-xl font-bold text-primary">{metric.value}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
