import { useState } from "react";
import { Sparkles, Loader2, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface StarterProjectGeneratorProps {
  useCase: {
    id: string;
    title: string;
    description: string;
    key_features: string[];
    architecture?: string;
  };
  compact?: boolean;
}

const StarterProjectGenerator = ({ useCase }: StarterProjectGeneratorProps) => {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!query.trim()) return;
    setIsGenerating(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/generate-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_query: query.trim(),
          title: useCase.title,
          description: useCase.description,
          key_features: useCase.key_features,
          architecture: useCase.architecture || "Pro Code",
        }),
      });

      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setReport(null);
    setQuery("");
    setError(null);
  };

  /* ── Report view ── */
  if (report) {
    return (
      <div className="space-y-3">
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Try another use case
        </button>

        <div
          className="flex flex-col overflow-hidden bg-slate-50"
          style={{ height: 'calc(100vh - 24rem)' }}
        >
          <div className="flex-1 flex flex-col bg-slate-900 text-white overflow-hidden m-3 rounded-lg shadow-lg">
            {/* Terminal header — matches README viewer exactly */}
            <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-slate-300 ml-3 font-mono">
                  project-fit-report.md
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {report.split("\n").length} lines
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-auto">
              <pre className="p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap">
                <code className="text-slate-100">{report}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Input form ── */
  return (
    <div className="bg-card rounded-xl border border-card-border p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">
            Project Fit Report
          </h3>
          <p className="text-sm text-muted-foreground">
            Describe your use case — we'll tell you how well{" "}
            <span className="font-medium text-primary">{useCase.title}</span>{" "}
            fits your needs.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-card-foreground">
          What are you trying to build?
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder={`e.g. "Describe your use case and how you plan to leverage this solution in your project..."`}
          rows={3}
          className="w-full rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Press Enter or click the button to generate your fit report.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !query.trim()}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-md transition-colors w-full justify-center sm:w-auto disabled:opacity-60 disabled:pointer-events-none"
      >
        {isGenerating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing fit…</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Generate Fit Report</>
        )}
      </button>
    </div>
  );
};

export default StarterProjectGenerator;