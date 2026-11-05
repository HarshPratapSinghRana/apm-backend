import { FC, useRef, useEffect, useState, useCallback } from "react";
import { BranchConfig } from "@/data/branches";

interface BranchNodeProps {
  branch: BranchConfig;
  showChildren: boolean;
  onBranchClick: (id: string) => void;
  onChildClick: (childId: string) => void;
}

export const BranchNode: FC<BranchNodeProps> = ({
  branch,
  showChildren,
  onBranchClick,
  onChildClick,
}) => {
  const Icon = branch.icon;
  const rowRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  const updateLines = useCallback(() => {
    if (!rowRef.current || !showChildren) {
      setLines([]);
      return;
    }
    const parentEl = rowRef.current.querySelector(`[data-branch-parent="${branch.id}"]`);
    if (!parentEl) return;
    const containerRect = rowRef.current.getBoundingClientRect();
    const parentRect = parentEl.getBoundingClientRect();
    const x1 = parentRect.right - containerRect.left;
    const y1 = parentRect.top + parentRect.height / 2 - containerRect.top;

    const newLines: typeof lines = [];
    branch.children.forEach((child) => {
      const childEl = rowRef.current!.querySelector(`[data-child-node="${child.id}"]`);
      if (!childEl) return;
      const childRect = childEl.getBoundingClientRect();
      const x2 = childRect.left - containerRect.left;
      const y2 = childRect.top + childRect.height / 2 - containerRect.top;
      newLines.push({ x1, y1, x2, y2 });
    });
    setLines(newLines);
  }, [branch, showChildren]);

  useEffect(() => {
    const timers = [0, 50, 150, 300, 600, 1000].map((ms) => setTimeout(updateLines, ms));
    window.addEventListener("resize", updateLines);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", updateLines);
    };
  }, [updateLines]);

  return (
    <div ref={rowRef} className="relative flex items-center gap-8">
      {/* SVG connecting lines between parent and children */}
      {lines.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          {lines.map((line, i) => {
            const midX = (line.x1 + line.x2) / 2;
            return (
              <g key={i}>
                {/* Faint dotted base */}
                <path
                  d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`}
                  fill="none"
                  stroke="rgba(136, 197, 160, 0.2)"
                  strokeWidth="1.5"
                  strokeDasharray="3 8"
                  strokeLinecap="round"
                  className="leap-line-appear"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
                {/* Animated flowing dots */}
                <path
                  d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`}
                  fill="none"
                  stroke="rgba(123, 200, 155, 0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="4 10"
                  strokeLinecap="round"
                  className="leap-flow-child"
                  style={{ animationDelay: `${i * 120 + 300}ms` }}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* Parent circular node */}
      <button
        data-branch-parent={branch.id}
        onClick={() => onBranchClick(branch.id)}
        className="relative group flex-shrink-0 flex flex-col items-center justify-center w-28 h-28 md:w-32 md:h-32 rounded-full cursor-pointer transition-all duration-400 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          background:
            "linear-gradient(135deg, #4A90E2 0%, #2E5BFF 50%, #1E3A8A 100%)",
          boxShadow:
            "0 0 30px rgba(74, 144, 226, 0.35), 0 0 60px rgba(74, 144, 226, 0.18), inset 0 0 50px rgba(255, 255, 255, 0.1)",
        }}
        aria-label={`Open ${branch.label} section`}
      >
        {/* Subtle aura */}
        <div
          className="absolute inset-[-8px] rounded-full animate-leap-pulse-soft pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(74, 144, 226, 0.2) 0%, rgba(74, 144, 226, 0) 70%)",
          }}
        />
        <Icon className="w-6 h-6 md:w-7 md:h-7 text-white mb-1 drop-shadow-lg" />
        <span
          className="font-semibold text-white text-xs md:text-sm text-center leading-tight"
          style={{ textShadow: "0 0 12px rgba(255, 255, 255, 0.4)" }}
        >
          {branch.label}
        </span>
      </button>

      {/* Child circular nodes - enlarged with tooltip */}
      {showChildren && (
        <div className="flex items-center gap-4">
          {branch.children.map((child, i) => (
            <button
              key={child.id}
              data-child-node={child.id}
              onClick={() => onChildClick(child.id)}
              className="flex-shrink-0 flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full cursor-pointer transition-all duration-300 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring animate-leap-node-appear"
              style={{
                background: "linear-gradient(135deg, #A8D5BA 0%, #7BC89B 100%)",
                boxShadow:
                  "0 4px 18px rgba(136, 197, 160, 0.35), 0 0 25px rgba(136, 197, 160, 0.15)",
                animationDelay: `${i * 100}ms`,
              }}
              aria-label={`Open ${child.label}`}
            >
              <span className="font-semibold text-[11px] md:text-sm text-[#1e4d30] text-center leading-tight px-2">
                {child.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
