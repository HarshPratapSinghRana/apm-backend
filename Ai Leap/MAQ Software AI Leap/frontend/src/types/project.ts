export interface ProjectMetric {
  value: string;
  label: string;
}

export interface TeamMember {
  name: string;
  role: string;
}

export interface ProjectDetail {
  keyMetrics: ProjectMetric[];
  problemStatement: string;
  solution: string;
  outcomes: string[];
  techStack: string[];
  team: TeamMember[];
  timeline: string;
  architectureDiagram: string;
  demoVideoTitle: string;
  demoVideoUrl: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: "Active" | "Pilot" | "Completed";
  industry: string;
  function: string;
  detail: ProjectDetail;
}
