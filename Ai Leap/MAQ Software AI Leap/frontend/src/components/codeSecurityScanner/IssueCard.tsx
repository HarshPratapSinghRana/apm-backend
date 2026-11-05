import { AlertTriangle, CheckCircle, Code, Copy } from "lucide-react";
import type { IssueCardProps } from "../types/types";

export const IssueCard = ({ issue, index, onCopyCode }:IssueCardProps) => (
  <div 
    className={`border rounded-xl p-5 transform hover:scale-[1.02] transition-all duration-200 ${
      issue.type === 'critical' 
        ? 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30 shadow-lg shadow-red-500/10' 
        : 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/30 shadow-lg shadow-yellow-500/10'
    }`}
  >
    {/* Issue Header */}
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start">
        <div className={`p-2 rounded-lg mr-3 ${
          issue.type === 'critical' ? 'bg-red-500/20' : 'bg-yellow-500/20'
        }`}>
          <AlertTriangle className={`w-5 h-5 ${
            issue.type === 'critical' ? 'text-red-400' : 'text-yellow-400'
          }`} />
        </div>
        <div>
          <h3 className="font-semibold text-white text-lg">{issue.category}</h3>
          <div className="flex items-center space-x-3 mt-1">
            <span className="text-sm text-slate-300 bg-slate-700/50 px-2 py-1 rounded">
              Line {issue.line}
            </span>
            <span className={`text-sm px-2 py-1 rounded font-medium ${
              issue.riskLevel === 'High' 
                ? 'bg-red-500/20 text-red-300' 
                : 'bg-yellow-500/20 text-yellow-300'
            }`}>
              {issue.riskLevel} Risk
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
          #{index + 1}
        </span>
        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
          issue.type === 'critical' 
            ? 'bg-red-500/20 text-red-300 border-red-500/30' 
            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
        }`}>
          {issue.type.toUpperCase()}
        </span>
      </div>
    </div>

    {/* Issue Content */}
    <div className="space-y-4">
      {/* Code Block */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-2 flex items-center">
          <Code className="w-4 h-4 mr-1" />
          Problematic Code:
        </p>
        <div className="bg-slate-900/80 rounded-lg border border-slate-600 p-3 relative group">
          <pre className="text-sm text-red-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {issue.code}
          </pre>
          <button
            onClick={() => onCopyCode(issue.code)}
            className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-all"
            title="Copy code"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Issue Explanation */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-2 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-1" />
          Security Risk:
        </p>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-600">
          <p className="text-sm text-slate-300 leading-relaxed">{issue.explanation}</p>
        </div>
      </div>

      {/* Suggestion */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-2 flex items-center">
          <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
          Recommended Fix:
        </p>
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-3 relative group">
          <pre className="text-sm text-green-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {issue.suggestion}
          </pre>
          <button
            onClick={() => onCopyCode(issue.suggestion)}
            className="absolute top-2 right-2 p-1.5 text-green-400 hover:text-green-300 bg-green-900/30 hover:bg-green-900/50 rounded opacity-0 group-hover:opacity-100 transition-all"
            title="Copy suggestion"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
);