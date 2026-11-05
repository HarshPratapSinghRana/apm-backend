import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Home } from "lucide-react";
import * as Icons from "lucide-react";
import Header from "@/components/Header";
import UseCaseSidebar from "@/components/UseCaseSidebar";
import TabContent from "@/components/TabContent";
import DomainSwitcher from "@/components/DomainSwitcher";
import ViewToggle from "@/components/ui/ViewToggle";
import agentsData from "@/data/agents.json";
import { compareUseCasesByPriority } from "@/lib/useCaseOrdering";

const DomainDetails = () => {
  const { domainId } = useParams();
  const navigate = useNavigate();
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [headerStyle, setHeaderStyle] = useState<"classic" | "modern">(
    () => (localStorage.getItem("leap-domain-header") as "classic" | "modern") || "modern"
  );

  const domain = agentsData.domains.find((d) => d.id === domainId);

  useEffect(() => {
    if (domain && domain.use_cases.length > 0) {
      const enabledOnes = domain.use_cases.filter((uc: any) => !uc.disabled);
      const sorted = [...(enabledOnes.length > 0 ? enabledOnes : domain.use_cases)].sort(compareUseCasesByPriority);
      setSelectedUseCaseId(sorted[0].id);
    }
  }, [domain]);

  const toggleHeaderStyle = (v: "classic" | "modern") => {
    localStorage.setItem("leap-domain-header", v);
    setHeaderStyle(v);
  };

  if (!domain) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Domain Not Found</h1>
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const selectedUseCase = domain.use_cases.find((uc) => uc.id === selectedUseCaseId) || null;

  /* ── Classic header (original) ── */
  const classicHeader = (
    <div className="pt-4 bg-card border-b border-border">
      <div className="px-0 py-1">
        <div className="mx-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link to="/" className="p-2 hover:bg-hover rounded-lg transition-colors" title="Home">
                <Home className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{domain.domain}</h1>
                <p className="text-muted-foreground">{domain.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ViewToggle current="classic" onChange={toggleHeaderStyle} />
              <div className="hidden md:block">
                <DomainSwitcher currentDomainId={domainId!} />
              </div>
            </div>
          </div>
          <div className="md:hidden">
            <DomainSwitcher currentDomainId={domainId!} />
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Modern header (Option C: domain tabs) ── */
  const modernHeader = (
    <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center h-12 px-4 gap-4">
        {/* Back button */}
        <Link to="/" className="p-1.5 hover:bg-hover rounded-lg transition-colors flex-shrink-0" title="Home">
          <Home className="w-4 h-4" />
        </Link>

        {/* Domain tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto flex-1 scrollbar-hide">
          {agentsData.domains.map((d) => {
            const isActive = d.id === domainId;
            const DomainIcon = Icons[d.icon as keyof typeof Icons] as React.ElementType | undefined;
            return (
              <button
                key={d.id}
                onClick={() => navigate(`/domain/${d.id}`)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-hover hover:text-foreground"
                }`}
              >
                {DomainIcon && <DomainIcon className="h-3.5 w-3.5" />}
                {d.domain}
                <span className={`ml-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none ${
                  isActive
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {d.use_cases.length}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Toggle + Knowledge link */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ViewToggle current="modern" onChange={toggleHeaderStyle} />
        </div>
      </div>
    </div>
  );

  const headerHeight = headerStyle === "modern" ? "48px" : "106px";

  return (
    <div className="min-h-[96vh] bg-background">
      {headerStyle === "classic" ? classicHeader : modernHeader}

      {/* Main Layout */}
      <div className="flex" style={{ height: `calc(100vh - ${headerHeight} - var(--banner-height, 0px))` }}>
        {/* Sidebar */}
        <UseCaseSidebar
          useCases={domain.use_cases}
          selectedUseCaseId={selectedUseCaseId}
          onSelectUseCase={setSelectedUseCaseId}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content */}
        <TabContent useCase={selectedUseCase} onTabChange={(tab) => setIsSidebarCollapsed(tab === "codebase")} />
      </div>
    </div>
  );
};

export default DomainDetails;