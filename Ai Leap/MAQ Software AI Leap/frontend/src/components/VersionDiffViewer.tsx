import { useState, useEffect } from "react";
import { GitBranch, FileCode2, FilePlus2, FileX2, FileDiff, X, Loader2 } from "lucide-react";

interface DiffFile {
  path: string;
  status: "added" | "removed" | "modified" | "unchanged";
  diff_lines?: string[];
}

interface VersionDiffViewerProps {
  useCaseId: string;
  fromVersion: string;
  toVersion: string;
  onClose: () => void;
}

const STATUS_CONFIG = {
  added: { icon: FilePlus2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", label: "Added" },
  removed: { icon: FileX2, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20", label: "Removed" },
  modified: { icon: FileDiff, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", label: "Modified" },
  unchanged: { icon: FileCode2, color: "text-muted-foreground", bg: "bg-muted/30", label: "Unchanged" },
};

const VersionDiffViewer = ({ useCaseId, fromVersion, toVersion, onClose }: VersionDiffViewerProps) => {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<DiffFile[]>([]);
  const [error, setError] = useState("");
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiff = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/versions/${useCaseId}/diff/${fromVersion}/${toVersion}`);
        if (!res.ok) throw new Error("Failed to fetch diff");
        const data = await res.json();
        setFiles(data.files || []);
      } catch {
        setError("Could not load diff. Backend may not be running.");
      } finally {
        setLoading(false);
      }
    };
    fetchDiff();
  }, [useCaseId, fromVersion, toVersion]);

  const counts = {
    added: files.filter((f) => f.status === "added").length,
    removed: files.filter((f) => f.status === "removed").length,
    modified: files.filter((f) => f.status === "modified").length,
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-card-border shadow-2xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-card-foreground">Version Diff</h3>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{fromVersion}</span>
                <span className="mx-2">→</span>
                <span className="font-mono">{toVersion}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-card-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary bar */}
        {!loading && !error && files.length > 0 && (
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border text-xs shrink-0">
            <span className="text-emerald-600 font-medium">+{counts.added} added</span>
            <span className="text-red-500 font-medium">−{counts.removed} removed</span>
            <span className="text-amber-500 font-medium">~{counts.modified} modified</span>
            <span className="text-muted-foreground ml-auto">{files.length} files compared</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-3 text-sm text-muted-foreground">Loading diff...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-500">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">Ensure the backend is running and both versions are uploaded.</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No differences found between versions.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((f) => {
                const cfg = STATUS_CONFIG[f.status] || STATUS_CONFIG.unchanged;
                const Icon = cfg.icon;
                const isExpanded = expandedFile === f.path;

                return (
                  <div key={f.path} className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedFile(isExpanded ? null : f.path)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/30 transition-colors ${cfg.bg}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                      <span className="flex-1 font-mono text-xs text-card-foreground truncate">{f.path}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                    </button>

                    {/* Expanded diff */}
                    {isExpanded && f.diff_lines && f.diff_lines.length > 0 && (
                      <div className="bg-slate-900 overflow-x-auto">
                        <pre className="p-3 text-xs font-mono leading-relaxed">
                          {f.diff_lines.map((line, i) => {
                            let lineClass = "text-slate-300";
                            if (line.startsWith("+") && !line.startsWith("+++")) lineClass = "text-emerald-400 bg-emerald-950/30";
                            else if (line.startsWith("-") && !line.startsWith("---")) lineClass = "text-red-400 bg-red-950/30";
                            else if (line.startsWith("@@")) lineClass = "text-blue-400";
                            return (
                              <div key={i} className={`${lineClass} px-2 -mx-2`}>
                                {line}
                              </div>
                            );
                          })}
                        </pre>
                      </div>
                    )}

                    {isExpanded && f.status === "added" && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/10 px-3 py-2 text-xs text-emerald-600">
                        New file added in {toVersion}
                      </div>
                    )}
                    {isExpanded && f.status === "removed" && (
                      <div className="bg-red-50 dark:bg-red-950/10 px-3 py-2 text-xs text-red-500">
                        File removed in {toVersion}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionDiffViewer;
