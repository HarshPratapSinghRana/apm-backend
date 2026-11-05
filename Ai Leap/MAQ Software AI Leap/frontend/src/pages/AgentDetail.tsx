import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Bot } from "lucide-react";
import UseCaseSidebar from "@/components/UseCaseSidebar";
import TabContent from "@/components/TabContent";
import { getAgentBySlug, getAllAgents } from "@/lib/agents";

/**
 * Dedicated, deep-linkable agent page: /agents/:agentSlug
 *
 * The URL is the single source of truth. On mount / refresh / direct link we
 * read `agentSlug` from the route, resolve the agent from agents.json, and
 * render the standard agent surface (UseCaseSidebar + TabContent). Selecting a
 * different agent in the sidebar navigates to its own URL, so back/forward and
 * bookmarking all work without any in-memory state to lose on refresh.
 */
const AgentDetail = () => {
  const { agentSlug } = useParams<{ agentSlug: string }>();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const resolved = getAgentBySlug(agentSlug);
  const allAgents = getAllAgents();

  // Collapse the sidebar when the Code tab is open (matches existing UX).
  const handleTabChange = (tab: string) => {
    setIsSidebarCollapsed(tab === "codebase");
  };

  // If the slug is unknown, surface a friendly not-found state instead of a blank screen.
  useEffect(() => {
    if (agentSlug && !resolved) {
      // No redirect — render the inline not-found UI below.
    }
  }, [agentSlug, resolved]);

  if (!resolved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Bot className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Agent not found</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          We couldn&apos;t find an agent matching{" "}
          <span className="font-mono text-foreground">{agentSlug}</span>. It may have been
          renamed or is not yet available.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to platform
        </Link>
      </div>
    );
  }

  const { useCase } = resolved;

  // Use cases for the sidebar = all agents; selecting one navigates by route.
  const sidebarUseCases = allAgents.map((a) => ({
    id: a.useCase.id,
    title: a.useCase.title,
    description: a.useCase.description,
    has_code: a.useCase.has_code ?? false,
    architecture: a.useCase.architecture,
    maturity: a.useCase.maturity,
  }));

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Slim top bar with back navigation */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2.5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Platform
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Bot className="w-4 h-4 text-primary" />
          {useCase.title}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden bg-card">
        <UseCaseSidebar
          useCases={sidebarUseCases}
          selectedUseCaseId={useCase.id}
          onSelectUseCase={(id) => navigate(`/agents/${id}`)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
          sidebarLabel="Agents"
        />
        <TabContent
          key={useCase.id}
          useCase={{
            id: useCase.id,
            title: useCase.title,
            description: useCase.description,
            key_features: useCase.key_features ?? [],
            impact: useCase.impact ?? "",
            has_video: useCase.has_video ?? false,
            architecture: useCase.architecture,
            component: useCase.component,
            has_code: useCase.has_code ?? false,
            github_repo: useCase.github_repo,
          }}
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  );
};

export default AgentDetail;
