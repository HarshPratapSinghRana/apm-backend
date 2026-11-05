import { Eye, EyeOff, FileSpreadsheet, Shield, X } from "lucide-react";
import { useState } from "react";
import SummaryCards from "./SummaryCards";
import { IssueCard } from "./IssueCard";
import type { ResultsPanelProps } from "../types/types";
import { exportToExcel } from "../../api/api";

export const ResultsPanel = ({ scanResults, showResults, onToggleResults, onClearResults, onCopyCode }: ResultsPanelProps) => {
    const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'warning'>('all');

    const handleExportToExcel = async () => {
        // Create workbook and worksheet
        console.log("Exporting to Excel...");
        const response = await exportToExcel(scanResults ? scanResults.issues : []);
        console.log("Exported:", response);
    };

    const handleFilterChange = (filter: 'all' | 'critical' | 'warning') => {
        setActiveFilter(filter);
    };

    // Filter issues based on active filter
    const getFilteredIssues = () => {
        if (!scanResults) return [];
        
        switch (activeFilter) {
            case 'critical':
                return scanResults.issues.filter(issue => issue.type === 'critical');
            case 'warning':
                return scanResults.issues.filter(issue => issue.type === 'warning');
            case 'all':
            default:
                return scanResults.issues;
        }
    };

    const filteredIssues = getFilteredIssues();

    if (!scanResults) {
        return (
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700 border-dashed p-12 text-center hover:border-slate-600 transition-colors">
                <div className="animate-pulse">
                    <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-slate-400 mb-2">Ready to Scan</h3>
                <p className="text-slate-500">Upload a file or paste your code to start security analysis</p>
                <div className="flex items-center justify-center mt-4 space-x-4 text-xs text-slate-600">
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
                {/* Sticky Header */}
                <div className="sticky top-0 bg-slate-800/90 backdrop-blur-sm border-b border-slate-700 p-6 z-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-blue-400" />
                            Scan Results
                            {activeFilter !== 'all' && (
                                <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                                    {activeFilter === 'critical' ? 'Critical Only' : 'Warnings Only'}
                                </span>
                            )}
                        </h2>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleExportToExcel}
                                className="group relative p-2 text-slate-400 hover:text-white hover:bg-green-500/10 hover:border-green-500/30 rounded-lg border border-transparent transition-all duration-200 hover:scale-105 cursor-pointer"
                                title="Export to Excel"
                            >
                                <FileSpreadsheet className="w-4 h-4 group-hover:text-green-400 transition-colors" />
                                {/* Tooltip */}
                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                                    Export to Excel
                                </div>
                            </button>
                            <button
                                onClick={onToggleResults}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                title={showResults ? "Hide Results" : "Show Results"}
                            >
                                {showResults ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={onClearResults}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Clear Results"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {showResults && (
                        <SummaryCards 
                            scanResults={scanResults} 
                            activeFilter={activeFilter}
                            onFilterChange={handleFilterChange}
                        />
                    )}
                </div>

                {/* Scrollable Content Area */}
                {showResults && (
                    <div className="max-h-[600px] overflow-y-auto results-scroll-container">
                        <div className="p-6 pt-0">
                            {/* Filter Status */}
                            {filteredIssues.length !== scanResults.issues.length && (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-blue-300 text-sm">
                                            Showing {filteredIssues.length} of {scanResults.issues.length} issues
                                        </span>
                                        <button
                                            onClick={() => setActiveFilter('all')}
                                            className="text-blue-400 text-sm hover:text-blue-300 underline"
                                        >
                                            Show all
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Issues List */}
                            <div className="space-y-6 mt-6">
                                {filteredIssues.map((issue, index) => (
                                    <IssueCard
                                        key={issue.id}
                                        issue={issue}
                                        index={index}
                                        onCopyCode={onCopyCode}
                                    />
                                ))}
                            </div>

                            {filteredIssues.length === 0 && activeFilter !== 'all' && (
                                <div className="text-center py-12">
                                    <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-medium text-slate-400 mb-2">
                                        No {activeFilter} issues found
                                    </h3>
                                    <p className="text-slate-500">
                                        Try selecting a different filter or view all issues
                                    </p>
                                </div>
                            )}

                            {/* Scroll indicator at bottom */}
                            {filteredIssues.length > 0 && (
                                <div className="text-center mt-6 pb-2">
                                    <div className="inline-flex items-center text-xs text-slate-500">
                                        <div className="w-2 h-2 bg-slate-600 rounded-full mr-2"></div>
                                        End of scan results
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .results-scroll-container::-webkit-scrollbar {
                    width: 8px;
                }
                
                .results-scroll-container::-webkit-scrollbar-track {
                    background: #1e293b;
                    border-radius: 6px;
                }
                
                .results-scroll-container::-webkit-scrollbar-thumb {
                    background: #475569;
                    border-radius: 6px;
                    border: 1px solid #1e293b;
                }
                
                .results-scroll-container::-webkit-scrollbar-thumb:hover {
                    background: #64748b;
                }
                
                .results-scroll-container::-webkit-scrollbar-corner {
                    background: #1e293b;
                }

                /* Firefox scrollbar styling */
                .results-scroll-container {
                    scrollbar-width: thin;
                    scrollbar-color: #475569 #1e293b;
                }
            `}</style>
        </>
    );
}