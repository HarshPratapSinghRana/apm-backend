import React from "react";
import { Brain, Layers, Settings2 } from "lucide-react";

interface ProblemSummaryProps {
  query: string;
  summary: string;
  detectedDomain: string | null;
  complexityHint: string | null;
}

const ProblemSummary: React.FC<ProblemSummaryProps> = ({
  query,
  summary,
  detectedDomain,
  complexityHint,
}) => {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">AI Understanding</h3>
          <p className="mt-1 text-sm text-muted-foreground">{renderMarkdownBold(summary)}</p>

          <div className="mt-3 flex flex-wrap gap-3">
            {detectedDomain && (
              <div className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm border border-border">
                <Layers className="h-3 w-3 text-primary" />
                Suggested Domain: <span className="font-semibold capitalize">{detectedDomain}</span>
              </div>
            )}
            {complexityHint && (
              <div className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm border border-border">
                <Settings2 className="h-3 w-3 text-primary" />
                Complexity: <span className="font-semibold">{complexityHint}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Render **bold** markdown segments as <strong> */
function renderMarkdownBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default ProblemSummary;
