import React, { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Home, LayoutGrid, Compass, ClipboardCheck } from "lucide-react";
import ArchitectureGallery from "@/components/knowledge/ArchitectureGallery";
import DecisionGuide from "@/components/knowledge/DecisionGuide";
import EvalFramework from "@/components/knowledge/EvalFramework";

const tabs = [
  { id: "architectures", label: "Architectures", icon: LayoutGrid },
  { id: "guide", label: "Decision Guide", icon: Compass },
  { id: "eval", label: "Eval Framework", icon: ClipboardCheck },
] as const;

type TabId = (typeof tabs)[number]["id"];

const Knowledge: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "architectures";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center h-12 px-4 gap-4">
          <Link to="/" className="p-1.5 hover:bg-hover rounded-lg transition-colors flex-shrink-0" title="Home">
            <Home className="w-4 h-4" />
          </Link>
          <h1 className="text-sm font-semibold text-foreground">
            AI LEAP <span className="text-primary">Knowledge Hub</span>
          </h1>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === "architectures" && <ArchitectureGallery />}
        {activeTab === "guide" && <DecisionGuide />}
        {activeTab === "eval" && <EvalFramework />}
      </main>
    </div>
  );
};

export default Knowledge;
