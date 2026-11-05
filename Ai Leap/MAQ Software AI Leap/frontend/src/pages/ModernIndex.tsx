import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import agentsData from "../data/agents.json";
import HeroSection from "../components/landing/HeroSection";
import FeaturedCarousel from "../components/landing/FeaturedCarousel";
import DomainCardsRow from "../components/landing/DomainCardsRow";
import QuickAccessGrid from "../components/landing/QuickAccessGrid";
import ViewToggle from "../components/ui/ViewToggle";

interface ModernIndexProps {
  onToggle: (view: "classic" | "modern") => void;
}

const ModernIndex: React.FC<ModernIndexProps> = ({ onToggle }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut, accounts } = useAuth();

  const user = accounts[0];
  const userName = user?.name || "User";
  const userEmail = user?.username || "";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Extract featured items from agents data
  const featuredItems = useMemo(() => {
    const items: { useCase: any; domainName: string; domainId: string }[] = [];
    for (const domain of agentsData.domains) {
      for (const uc of domain.use_cases) {
        if (uc.featured || uc.component || uc.has_code) {
          items.push({
            useCase: uc,
            domainName: domain.domain,
            domainId: domain.id,
          });
        }
      }
    }
    return items;
  }, []);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      // Switch to Classic theme and open AI Advisor with this query
      localStorage.setItem("leap-view", "classic");
      localStorage.setItem("leap-nav", JSON.stringify({ branch: "ai-advisor", child: "advisor-search" }));
      localStorage.setItem("leap-advisor-pending", query.trim());
      onToggle("classic");
    }
  };

  const handleQuickNav = (branch: string, child?: string) => {
    // For now navigate to classic view through the LEAP system
    // This stores the intent and switches view
    const params = new URLSearchParams();
    params.set("branch", branch);
    if (child) params.set("child", child);
    // Switch to classic view with the intended navigation
    localStorage.setItem("leap-view", "classic");
    localStorage.setItem("leap-nav", JSON.stringify({ branch, child }));
    onToggle("classic");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-white/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-foreground">
            <span className="font-extrabold text-primary">MAQ</span> Software
          </span>
          <span className="text-sm text-muted-foreground">|</span>
          <span className="text-sm font-medium text-muted-foreground">AI LEAP Platform</span>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle current="modern" onChange={onToggle} />
          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                {userInitials}
              </div>
              <span className="text-sm font-medium text-foreground hidden md:block max-w-[120px] truncate">
                {userName}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showDropdown ? "rotate-180" : ""}`} />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-lg py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                      {userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                      <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                    </div>
                  </div>
                </div>
                <div className="px-2 pt-2">
                  <button
                    onClick={async () => { try { await signOut(); } catch (e) { console.error(e); } }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <HeroSection onSearch={handleSearch} />

      {/* Featured solutions carousel */}
      <FeaturedCarousel items={featuredItems} />

      {/* Domain cards */}
      <DomainCardsRow domains={agentsData.domains} />

      {/* Quick access grid */}
      <QuickAccessGrid onNavigate={handleQuickNav} />

      {/* Footer */}
      <footer className="border-t border-border bg-white px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          AI LEAP Platform — Building GenAI competency across the organization
        </p>
      </footer>
    </div>
  );
};

export default ModernIndex;
