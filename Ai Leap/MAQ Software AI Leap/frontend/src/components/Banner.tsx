import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { getBannerConfig, type BannerConfig } from "@/api/api";

export const Banner = () => {
  const [config, setConfig] = useState<BannerConfig | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hiddenByModal, setHiddenByModal] = useState(false);

  useEffect(() => {
    getBannerConfig()
      .then((res) => {
        setConfig(res);
      })
      .catch((err) => {
        console.error("Error loading banner config:", err);
      });
  }, []);

  // Allow other components (e.g. the Contribute popup) to temporarily hide the
  // banner by dispatching a `app:banner-visibility` event with { open }.
  useEffect(() => {
    const onVisibility = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setHiddenByModal(Boolean(detail?.open));
    };
    window.addEventListener("app:banner-visibility", onVisibility);
    return () =>
      window.removeEventListener("app:banner-visibility", onVisibility);
  }, []);

  const agents = config?.agents || (config?.agent ? [config.agent] : []);
  const showBanner =
    config?.enabled && agents.length > 0 && !isDismissed && !hiddenByModal;

  useEffect(() => {
    if (showBanner) {
      document.documentElement.style.setProperty("--banner-height", "40px");
    } else {
      document.documentElement.style.setProperty("--banner-height", "0px");
    }
    // Cleanup if component unmounts
    return () => {
      document.documentElement.style.setProperty("--banner-height", "0px");
    };
  }, [showBanner]);

  if (!showBanner) return null;

  const renderAgentItems = (keyPrefix: string) => {
    return (
      <div className="flex items-center gap-12 shrink-0">
        {agents.map((agent, index) => {
          const agentUrl = `/?branch=solutions&child=solutions-by-industry&domain=${agent.domainId}&project=${agent.id}`;
          return (
            <div key={`${keyPrefix}-${agent.id}-${index}`} className="flex items-center gap-3">
              <span className="inline-flex items-center bg-[#FBEBEC] text-[#B01E28] font-semibold px-[9px] py-[3px] rounded-[6px] text-[11px] tracking-[0.03em] select-none">
                NEW
              </span>
              <span className="text-[#3A3A3A] font-normal whitespace-nowrap">
                <Link
                  to={agentUrl}
                  className="text-[#3A3A3A] hover:text-[#B01E28] hover:underline transition-colors cursor-pointer"
                >
                  {agent.title}
                </Link>
                {" "}has been recently added.
              </span>
              {/* Bullet separator between marquee items */}
              <span className="text-gray-300 font-light select-none px-2">•</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-10 w-full bg-white flex items-center justify-between px-4 text-[#3A3A3A] text-[13px] font-normal z-[100] relative select-none border-b border-[#E6E6E6] overflow-hidden">
      {/* Marquee Container */}
      <div className="flex-1 overflow-hidden relative flex items-center z-10 mx-4">
        <div className="animate-marquee flex items-center">
          {renderAgentItems("set-1")}
          {renderAgentItems("set-2")}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="text-[#9B9B9B] hover:text-[#3A3A3A] p-1 rounded-full hover:bg-gray-100 transition-colors z-10 focus:outline-none shrink-0"
        aria-label="Close banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Banner;
