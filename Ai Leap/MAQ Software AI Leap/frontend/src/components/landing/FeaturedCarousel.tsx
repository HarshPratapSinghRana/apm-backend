import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Play, Code, Sparkles } from "lucide-react";

interface UseCase {
  id: string;
  title: string;
  description: string;
  architecture?: string;
  component?: string;
  has_code?: boolean;
  maturity?: string;
  tags?: string[];
}

interface FeaturedItem {
  useCase: UseCase;
  domainName: string;
  domainId: string;
}

interface FeaturedCarouselProps {
  items: FeaturedItem[];
}

const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ items }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="bg-primary/[0.02] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Featured Solutions</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Try interactive demos and download code for these highlighted agents
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white transition-colors hover:bg-hover"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white transition-colors hover:bg-hover"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="mt-6 flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map(({ useCase, domainName, domainId }) => (
            <div
              key={useCase.id}
              onClick={() => navigate(`/domain/${domainId}?uc=${useCase.id}`)}
              className="group flex w-72 flex-shrink-0 cursor-pointer flex-col rounded-xl border border-border bg-white p-5 transition-all hover:border-primary/30 hover:shadow-md"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                  {domainName}
                </span>
                {useCase.maturity && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    useCase.maturity === "Production"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {useCase.maturity}
                  </span>
                )}
              </div>

              {/* Title & description */}
              <h3 className="mt-3 text-sm font-semibold text-foreground">{useCase.title}</h3>
              <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                {useCase.description}
              </p>

              {/* Architecture badge */}
              {useCase.architecture && (
                <div className="mt-3">
                  <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${
                    useCase.architecture === "Pro Code"
                      ? "bg-violet-100 text-violet-700"
                      : useCase.architecture === "Low Code"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {useCase.architecture}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                {useCase.component && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/domain/${domainId}?uc=${useCase.id}&tab=try`); }}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Play className="h-3 w-3" />
                    Try It
                  </button>
                )}
                {useCase.has_code && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/domain/${domainId}?uc=${useCase.id}&tab=code`); }}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-hover"
                  >
                    <Code className="h-3 w-3" />
                    Code
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCarousel;
