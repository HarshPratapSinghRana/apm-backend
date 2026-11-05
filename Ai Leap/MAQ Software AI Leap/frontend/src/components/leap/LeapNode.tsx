import { FC } from "react";
import { Zap } from "lucide-react";

interface LeapNodeProps {
  expanded: boolean;
  onClick: () => void;
}

export const LeapNode: FC<LeapNodeProps> = ({ expanded, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative group cursor-pointer transition-all duration-700 ease-in-out outline-none"
      style={{ WebkitTapHighlightColor: "transparent", outline: "none", boxShadow: "none" }}
      onMouseDown={(e) => e.preventDefault()}
      aria-label="Expand LEAP navigation"
    >
      {/* Pulsing aura */}
      <div
        className={`absolute rounded-full transition-all duration-700 ${
          expanded
            ? "inset-[-10px] animate-leap-pulse-soft"
            : "inset-[-16px] sm:inset-[-20px] md:inset-[-24px] animate-leap-pulse-aura"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(128, 24, 24, 0.3) 0%, rgba(128, 24, 24, 0) 70%)",
        }}
      />

      {/* Secondary aura - subtle darker tint */}
      {!expanded && (
        <div
          className="absolute inset-[-28px] sm:inset-[-32px] md:inset-[-40px] rounded-full animate-leap-pulse-soft"
          style={{
            background:
              "radial-gradient(circle, rgba(153, 31, 31, 0.08) 0%, transparent 70%)",
            animationDelay: "1.5s",
          }}
        />
      )}

      {/* Outer glow ring - only when not expanded */}
      {!expanded && (
        <>
          <div className="absolute inset-[-10px] sm:inset-[-12px] md:inset-[-14px] rounded-full border-2 border-red-400/20 group-hover:border-red-400/30 transition-all duration-700 group-hover:scale-110" />
          {/* Inner highlight ring */}
          <div className="absolute inset-[-4px] rounded-full border border-white/10 group-hover:border-white/15 transition-all duration-700" />
        </>
      )}

      {/* Core gradient circle */}
      <div
        data-leap-node
        className={`relative rounded-full flex items-center justify-center transition-all duration-700 ${
          expanded
            ? "w-32 h-32 md:w-40 md:h-40"
            : "group-hover:scale-[1.03]"
        }`}
        style={{
          ...(!expanded ? { width: "clamp(8rem, 17vw, 14rem)", height: "clamp(8rem, 17vw, 14rem)" } : {}),
          background:
            "linear-gradient(135deg, #c43c3c 0%, #a52a2a 20%, #801818 55%, #5c1212 85%, #400d0d 100%)",
          boxShadow: expanded
            ? "0 0 30px rgba(128, 24, 24, 0.4), 0 0 60px rgba(128, 24, 24, 0.2), inset 0 0 40px rgba(255, 255, 255, 0.1)"
            : "0 0 60px rgba(128, 24, 24, 0.45), 0 0 120px rgba(128, 24, 24, 0.25), 0 0 200px rgba(128, 24, 24, 0.1), inset 0 0 80px rgba(255, 255, 255, 0.12)",
        }}
      >
        {/* Inner circuit-like pattern overlay */}
        {!expanded && (
          <div
            className="absolute inset-0 rounded-full opacity-[0.04]"
            style={{
              backgroundImage: `
                radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 1px, transparent 1px),
                radial-gradient(circle at 70% 70%, rgba(255,255,255,0.6) 1px, transparent 1px),
                radial-gradient(circle at 50% 15%, rgba(255,255,255,0.5) 1px, transparent 1px),
                radial-gradient(circle at 20% 70%, rgba(255,255,255,0.4) 1px, transparent 1px),
                radial-gradient(circle at 80% 30%, rgba(255,255,255,0.4) 1px, transparent 1px)
              `,
              backgroundSize: "100% 100%",
            }}
          />
        )}

        <div className="flex flex-col items-center gap-1 relative z-10">
          <Zap
            className={`text-white drop-shadow-lg transition-all duration-700 ${
              expanded ? "w-6 h-6 md:w-7 md:h-7" : "w-[clamp(1.25rem,2vw,2rem)] h-[clamp(1.25rem,2vw,2rem)]"
            }`}
          />
          <span
            className={`font-bold tracking-wider text-white transition-all duration-700 ${
              expanded ? "text-xl md:text-2xl" : "text-[clamp(1.25rem,2.8vw,2.5rem)]"
            }`}
            style={{
              textShadow:
                "0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(255, 255, 255, 0.3)",
            }}
          >
            LEAP
          </span>
        </div>
      </div>

      {/* Click prompt - only when not expanded */}
      {!expanded && (
        <div className="absolute -bottom-12 sm:-bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap flex flex-col items-center gap-1.5 mt-[10px]">
          <svg width="12" height="8" viewBox="0 0 12 8" className="text-foreground animate-bounce">
            <path d="M1 7L6 2L11 7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
          <span className="text-xs text-black tracking-widest uppercase animate-pulse font-bold">
            Click to Explore
          </span>
        </div>
      )}
    </button>
  );
};
