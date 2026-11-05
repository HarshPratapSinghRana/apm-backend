import { FC, useEffect, useState, useCallback } from "react";
import { BranchConfig } from "@/data/branches";

interface SvgConnectionsProps {
  branches: BranchConfig[];
  showChildren: Record<string, boolean>;
}

type PathType = "leap-to-branch" | "branch-to-child";

interface PathData {
  d: string;
  type: PathType;
  delay: number; // stagger delay in ms
}

export const SvgConnections: FC<SvgConnectionsProps> = ({
  branches,
  showChildren,
}) => {
  const [paths, setPaths] = useState<PathData[]>([]);

  const updatePaths = useCallback(() => {
    const newPaths: PathData[] = [];

    branches.forEach((branch, branchIdx) => {
      const branchEl = document.querySelector(
        `[data-branch-parent="${branch.id}"]`
      );
      if (!branchEl) return;

      const branchRect = branchEl.getBoundingClientRect();
      const branchCenterY = branchRect.top + branchRect.height / 2;
      const branchRightX = branchRect.right;

      // Lines from branch to children
      if (showChildren[branch.id]) {
        branch.children.forEach((child, childIdx) => {
          const childEl = document.querySelector(
            `[data-child-node="${child.id}"]`
          );
          if (!childEl) return;

          const childRect = childEl.getBoundingClientRect();
          const childLeftX = childRect.left;
          const childCenterY = childRect.top + childRect.height / 2;

          const midX2 = (branchRightX + childLeftX) / 2;
          newPaths.push({
            d: `M ${branchRightX} ${branchCenterY} C ${midX2} ${branchCenterY}, ${midX2} ${childCenterY}, ${childLeftX} ${childCenterY}`,
            type: "branch-to-child",
            delay: branchIdx * 200 + 300 + childIdx * 150,
          });
        });
      }
    });

    setPaths(newPaths);
  }, [branches, showChildren]);

  useEffect(() => {
    // Update paths multiple times during animations to stay in sync
    const timers = [0, 50, 100, 200, 400, 600, 800, 1000, 1500, 2000].map(
      (ms) => setTimeout(updatePaths, ms)
    );

    const handleResize = () => updatePaths();
    window.addEventListener("resize", handleResize);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", handleResize);
    };
  }, [updatePaths]);

  return (
    <svg
      className="fixed inset-0 w-screen h-screen pointer-events-none"
      style={{ zIndex: 1 }}
    >
      {/* Glow filter for the paths */}
      <defs>
        <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Gradient for the flowing dots - LEAP to branch */}
        <linearGradient id="flow-gradient-main" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(74, 144, 226, 0.6)" />
          <stop offset="50%" stopColor="rgba(46, 91, 255, 0.8)" />
          <stop offset="100%" stopColor="rgba(74, 144, 226, 0.4)" />
        </linearGradient>
        {/* Gradient for child connections */}
        <linearGradient id="flow-gradient-child" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(74, 144, 226, 0.4)" />
          <stop offset="50%" stopColor="rgba(46, 91, 255, 0.5)" />
          <stop offset="100%" stopColor="rgba(74, 144, 226, 0.25)" />
        </linearGradient>
      </defs>

      {paths.map((path, i) => {
        const isMain = path.type === "leap-to-branch";
        return (
          <g key={i}>
            {/* Static dotted base line */}
            <path
              d={path.d}
              fill="none"
              stroke={isMain ? "rgba(74, 144, 226, 0.15)" : "rgba(74, 144, 226, 0.08)"}
              strokeWidth={isMain ? 2 : 1.5}
              strokeLinecap="round"
              strokeDasharray={isMain ? "4 10" : "3 8"}
              className="leap-line-appear"
              style={{ animationDelay: `${path.delay}ms` }}
            />

            {/* Animated flowing dots layer */}
            <path
              d={path.d}
              fill="none"
              stroke={isMain ? "url(#flow-gradient-main)" : "url(#flow-gradient-child)"}
              strokeWidth={isMain ? 2.5 : 1.5}
              strokeLinecap="round"
              strokeDasharray={isMain ? "6 14" : "4 12"}
              filter={isMain ? "url(#line-glow)" : undefined}
              className={isMain ? "leap-flow-main" : "leap-flow-child"}
              style={{ animationDelay: `${path.delay + 400}ms` }}
            />

            {/* Bright leading particle dot (only for main lines) */}
            {isMain && (
              <circle r="3" fill="rgba(74, 180, 255, 0.9)" filter="url(#line-glow)">
                <animateMotion
                  dur="3s"
                  repeatCount="indefinite"
                  begin={`${path.delay / 1000 + 0.5}s`}
                  path={path.d}
                />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
};
