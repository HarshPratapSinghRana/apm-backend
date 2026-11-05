import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Check } from "lucide-react";
import * as Icons from "lucide-react";
import agentsData from "@/data/agents.json";

interface DomainSwitcherProps {
  currentDomainId: string;
}

const DomainSwitcher = ({ currentDomainId }: DomainSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentDomain = agentsData.domains.find(d => d.id === currentDomainId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDomainSwitch = (domainId: string) => {
    setIsOpen(false);
    navigate(`/domain/${domainId}`);
  };

  const CurrentIcon = currentDomain ? Icons[currentDomain.icon as keyof typeof Icons] as any : null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-foreground">Select Domain</span>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex min-w-[260px] items-center gap-3 px-5 py-3.5 bg-card border border-border rounded-xl hover:bg-hover transition-colors"
        >
          {CurrentIcon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary">
              <CurrentIcon className="h-5 w-5 text-primary-foreground" />
            </div>
          )}  

          <div className="flex-1 text-left leading-tight">
            <div className="font-medium text-base text-foreground">
              {currentDomain?.domain || "Select Domain"}
            </div>
            {currentDomain && (
              <div className="mt-1 text-xs text-muted-foreground">
                {currentDomain.use_cases.length} use cases
              </div>
            )}
          </div>
          <ChevronDown 
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`} 
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-3 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="py-2">
              {agentsData.domains.map((domain) => {
                const DomainIcon = Icons[domain.icon as keyof typeof Icons] as any;
                const isSelected = domain.id === currentDomainId;
                
                return (
                  <button
                    key={domain.id}
                    onClick={() => handleDomainSwitch(domain.id)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-hover transition-colors ${
                      isSelected ? "bg-primary-subtle" : ""
                    }`}
                  >
                    <div className="w-7 h-7 bg-gradient-primary rounded-md flex items-center justify-center">
                      <DomainIcon className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-base text-foreground">{domain.domain}</div>
                      <div className="text-xs text-muted-foreground">
                        {domain.use_cases.length} use cases
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainSwitcher;