import type { SummaryCardsProps } from "../types/types";

interface SummaryCardsWithFilterProps extends SummaryCardsProps {
  activeFilter: 'all' | 'critical' | 'warning';
  onFilterChange: (filter: 'all' | 'critical' | 'warning') => void;
}

const SummaryCards = ({ scanResults, activeFilter, onFilterChange }: SummaryCardsWithFilterProps) => (
  <div className="grid grid-cols-3 gap-4 mt-6">
    <div 
      className={`bg-gradient-to-br from-red-500/20 to-red-600/10 border rounded-lg p-4 text-center transform hover:scale-105 transition-all cursor-pointer ${
        activeFilter === 'critical' 
          ? 'border-red-400 bg-red-500/30 shadow-lg shadow-red-500/20' 
          : 'border-red-500/30 hover:border-red-400'
      }`}
      onClick={() => onFilterChange(activeFilter === 'critical' ? 'all' : 'critical')}
    >
      <div className="text-3xl font-bold text-red-400 mb-1">{scanResults.criticalIssues}</div>
      <div className="text-sm text-red-300 font-medium">Critical Issues</div>
      <div className="text-xs text-red-400/70 mt-1">
        {activeFilter === 'critical' ? 'Click to show all' : 'Immediate attention needed'}
      </div>
    </div>
    
    <div 
      className={`bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border rounded-lg p-4 text-center transform hover:scale-105 transition-all cursor-pointer ${
        activeFilter === 'warning' 
          ? 'border-yellow-400 bg-yellow-500/30 shadow-lg shadow-yellow-500/20' 
          : 'border-yellow-500/30 hover:border-yellow-400'
      }`}
      onClick={() => onFilterChange(activeFilter === 'warning' ? 'all' : 'warning')}
    >
      <div className="text-3xl font-bold text-yellow-400 mb-1">{scanResults.warningIssues}</div>
      <div className="text-sm text-yellow-300 font-medium">Warnings</div>
      <div className="text-xs text-yellow-400/70 mt-1">
        {activeFilter === 'warning' ? 'Click to show all' : 'Should be addressed'}
      </div>
    </div>
    
    <div 
      className={`bg-gradient-to-br from-slate-500/20 to-slate-600/10 border rounded-lg p-4 text-center transform hover:scale-105 transition-all cursor-pointer ${
        activeFilter === 'all' 
          ? 'border-slate-400 bg-slate-500/30 shadow-lg shadow-slate-500/20' 
          : 'border-slate-500/30 hover:border-slate-400'
      }`}
      onClick={() => onFilterChange('all')}
    >
      <div className="text-3xl font-bold text-slate-300 mb-1">{scanResults.totalIssues}</div>
      <div className="text-sm text-slate-300 font-medium">Total Issues</div>
      <div className="text-xs text-slate-400/70 mt-1">
        {activeFilter === 'all' ? 'Showing all issues' : 'Found in scan'}
      </div>
    </div>
  </div>
);

export default SummaryCards;