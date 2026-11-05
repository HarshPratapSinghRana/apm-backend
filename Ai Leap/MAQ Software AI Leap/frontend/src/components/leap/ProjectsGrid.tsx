import { FC } from "react";
import { ArrowRight, BarChart3 } from "lucide-react";
import { Project } from "@/types/project";
import { projects } from "@/data/projects";

interface ProjectsGridProps {
  onProjectSelect: (projectId: string) => void;
}

export const ProjectsGrid: FC<ProjectsGridProps> = ({ onProjectSelect }) => {
  return (
    <div className="space-y-6 animate-leap-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 cards-grid-symmetric">
        {projects.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={index}
            onClick={() => onProjectSelect(project.id)}
          />
        ))}
      </div>
    </div>
  );
};

/* ─── Project Card ────────────────────────────────────── */
interface ProjectCardProps {
  project: Project;
  index: number;
  onClick: () => void;
}

const ProjectCard: FC<ProjectCardProps> = ({ project, index, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="block group text-left w-full h-full"
      style={{
        animationDelay: `${index * 80}ms`,
        animation: "fadeInUp 0.6s ease-out both",
      }}
    >
      <div className="relative domain-card p-3 h-full overflow-hidden">
        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

        <div className="flex flex-col h-full relative z-10">
          {/* Status + Industry badges */}
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                project.status === "Active"
                  ? "bg-emerald-100 text-emerald-700"
                  : project.status === "Pilot"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {project.status}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
              {project.industry}
            </span>
          </div>

          {/* Icon */}
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl mb-5 bg-gradient-to-br from-primary/0 to-primary/10 backdrop-blur-sm group-hover:scale-110 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/30 flex-shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <BarChart3 className="relative z-10 w-5 h-5 text-primary group-hover:text-primary/90 transition-colors duration-300" />
          </div>

          {/* Content */}
          <div className="flex flex-col justify-between flex-1">
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold text-card-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-1">
                  {project.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                  {project.description}
                </p>
              </div>

              {/* Key metric highlight */}
              <div className="flex items-center gap-3 pt-1">
                {project.detail.keyMetrics.slice(0, 2).map((metric, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-bold text-primary">{metric.value}</span>{" "}
                    <span className="text-muted-foreground">{metric.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 mt-4">
              <span className="text-xs text-muted-foreground">
                {project.function}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom border animation */}
        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-500" />
      </div>
    </button>
  );
};
