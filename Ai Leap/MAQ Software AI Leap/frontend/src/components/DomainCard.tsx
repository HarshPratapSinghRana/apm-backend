import { useState } from "react";
import { Link } from "react-router-dom";
import { LucideIcon, ArrowRight } from "lucide-react";
import * as Icons from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DomainCardProps {
  id: string;
  domain: string;
  description: string;
  icon: string;
  useCaseCount: number;
  index: number;
}

const DomainCard = ({ id, domain, description, icon, useCaseCount, index }: DomainCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const IconComponent = Icons[icon as keyof typeof Icons] as LucideIcon;

  return (
    <Link 
      to={`/domain/${id}`} 
      className="block group h-full"
      style={{ 
        animationDelay: `${index * 100}ms`,
        animation: 'fadeInUp 0.8s ease-out both'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative domain-card p-0.5 h-full min-w-[100px] max-w-xs w-full"
        style={{ padding: '6px', maxHeight: 'none', overflow: 'visible' }}
      >
        {/* Animated background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`} />

        <div className="flex flex-col h-full relative z-10">
          {/* Top row: Icon + Title + Use case count */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              {/* Icon */}
              <div className="relative flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-primary/0 to-primary/10 backdrop-blur-sm group-hover:scale-110 group-hover:border-primary/40 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/30 flex-shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {IconComponent && (
                  <IconComponent className="relative z-10 w-3 h-3 text-primary group-hover:text-primary/90 transition-colors duration-300" />
                )}
              </div>
              {/* Title */}
              <h3 className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors">
                {domain}
              </h3>
            </div>
            {/* Use case count - top right */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="w-1.5 h-1.5 bg-primary rounded-full group-hover:animate-pulse"></div>
              <span className="text-[9px] font-medium text-primary">
                {useCaseCount}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col justify-between flex-1">
            <div>
              {/* Description with tooltip on hover - single line with ellipsis */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="text-muted-foreground text-[9px] leading-tight overflow-hidden whitespace-nowrap text-ellipsis cursor-default"
                    >
                      {description}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    className="max-w-[250px] text-xs whitespace-normal"
                  >
                    {description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Footer: arrow on hover */}
            <div className="flex items-center justify-end pt-0.5 mt-1">
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 translate-x-2">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom border animation */}
        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-500" />
      </div>
    </Link>
  );
};

export default DomainCard;