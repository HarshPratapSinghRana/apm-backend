// Leaderboard component - commented out
// import React, { useMemo, useState, useRef, useEffect } from "react";
// import { Trophy, Medal, Star, TrendingUp, Users, Clock, ArrowRight, ChevronDown, ChevronRight, X, ExternalLink } from "lucide-react";
// import agentsData from "@/data/agents.json";

/* ─── Types ─── */
// interface Contribution {
//   title: string;
//   domain: string;
//   domainId: string;
//   date: string;
//   useCaseId: string;
// }

// interface Contributor {
//   name: string;
//   initials: string;
//   count: number;
//   topDomain: string;
//   domains: string[];
//   latestDate: string;
//   solutions: Contribution[];
// }

// interface LeaderboardProps {
//   onNavigate?: (branchId: string, childId: string | null) => void;
//   onSelectUseCase?: (domainId: string, useCaseId: string) => void;
// }

/* ─── Colors ─── */
// const RANK_COLORS = [
//   { bg: "bg-amber-50/60", border: "border-amber-200/60", text: "text-amber-600", bar: "bg-amber-400" },
//   { bg: "bg-slate-50/60", border: "border-slate-200/60", text: "text-slate-500", bar: "bg-slate-300" },
//   { bg: "bg-orange-50/60", border: "border-orange-200/60", text: "text-orange-600", bar: "bg-orange-300" },
// ];

// const DOMAIN_COLORS: Record<string, string> = {
//   Retail: "bg-blue-100 text-blue-700",
//   Finance: "bg-emerald-100 text-emerald-700",
//   Manufacturing: "bg-orange-100 text-orange-700",
//   Legal: "bg-purple-100 text-purple-700",
//   Engineering: "bg-cyan-100 text-cyan-700",
//   "Feature Showcase": "bg-pink-100 text-pink-700",
//   Healthcare: "bg-red-100 text-red-700",
//   Automotive: "bg-indigo-100 text-indigo-700",
// };

// function getInitials(name: string): string {
//   return name
//     .split(/\s+/)
//     .map((w) => w[0])
//     .join("")
//     .toUpperCase()
//     .slice(0, 2);
// }

// function timeAgo(dateStr: string): string {
//   const diff = Date.now() - new Date(dateStr).getTime();
//   const days = Math.floor(diff / 86400000);
//   if (days < 1) return "today";
//   if (days === 1) return "1 day ago";
//   if (days < 30) return `${days} days ago`;
//   const months = Math.floor(days / 30);
//   if (months === 1) return "1 month ago";
//   return `${months} months ago`;
// }

/* ─── Component ─── */
// const Leaderboard: React.FC<LeaderboardProps> = ({ onNavigate, onSelectUseCase }) => {
//   ...entire component commented out...
// };

// export default Leaderboard;
  // const [expandedContributor, setExpandedContributor] = useState<string | null>(null);
  // const [drawerContributor, setDrawerContributor] = useState<string | null>(null);
  // const rankingsRef = useRef<HTMLDivElement>(null);
  // const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  //
  // // Close drawer on outside click
  // useEffect(() => {
  //   if (!drawerContributor) return;
  //   const handler = (e: MouseEvent) => {
  //     if (rankingsRef.current && !rankingsRef.current.contains(e.target as Node)) {
  //       setDrawerContributor(null);
  //     }
  //   };
  //   document.addEventListener("mousedown", handler);
  //   return () => document.removeEventListener("mousedown", handler);
  // }, [drawerContributor]);
  //
  // const { contributors, totalSolutions, recentActivity } = useMemo(() => {
  //   const map = new Map<string, Contribution[]>();
  //
  //   for (const domain of agentsData.domains) {
  //     for (const uc of domain.use_cases) {
  //       const by = (uc as any).contributed_by as string | undefined;
  //       const date = (uc as any).contributed_date as string | undefined;
  //       if (!by) continue;
  //       if (!map.has(by)) map.set(by, []);
  //       map.get(by)!.push({
  //         title: uc.title,
  //         domain: domain.domain,
  //         domainId: domain.id,
  //         date: date || "2026-01-01",
  //         useCaseId: uc.id,
  //       });
  //     }
  //   }
  //
  //   const list: Contributor[] = [];
  //   for (const [name, solutions] of map) {
  //     const domainCounts: Record<string, number> = {};
  //     for (const s of solutions) {
  //       domainCounts[s.domain] = (domainCounts[s.domain] || 0) + 1;
  //     }
  //     const topDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0][0];
  //     const domains = [...new Set(solutions.map((s) => s.domain))];
  //     const latestDate = solutions.reduce((max, s) => (s.date > max ? s.date : max), "");
  //     list.push({ name, initials: getInitials(name), count: solutions.length, topDomain, domains, latestDate, solutions });
  //   }
  //
  //   list.sort((a, b) => b.count - a.count || a.latestDate.localeCompare(b.latestDate));
  //
  //   const totalSolutions = list.reduce((sum, c) => sum + c.count, 0);
  //
  //   // Recent activity: last 8 submissions across all contributors
  //   const allSolutions = list.flatMap((c) => c.solutions.map((s) => ({ ...s, contributor: c.name })));
  //   allSolutions.sort((a, b) => b.date.localeCompare(a.date));
  //   const recentActivity = allSolutions.slice(0, 8);
  //
  //   return { contributors: list, totalSolutions, recentActivity };
  // }, []);

  // const maxCount = contributors[0]?.count || 1;
  //
  // const groupByDomain = (solutions: Contribution[]) => {
  //   const groups: Record<string, Contribution[]> = {};
  //   for (const s of solutions) {
  //     if (!groups[s.domain]) groups[s.domain] = [];
  //     groups[s.domain].push(s);
  //   }
  //   return Object.entries(groups);
  // };
  //
  // const handleSolutionClick = (domainId: string, useCaseId: string) => {
  //   if (onSelectUseCase) {
  //     onSelectUseCase(domainId, useCaseId);
  //   } else if (onNavigate) {
  //     onNavigate("solutions", "solutions-by-industry");
  //   }
  // };
  //
  // // Scroll to a row in Full Rankings and expand/open it
  // const scrollToAndExpand = (name: string, mode: "accordion" | "drawer") => {
  //   if (mode === "accordion") {
  //     setExpandedContributor(expandedContributor === name ? null : name);
  //     setDrawerContributor(null);
  //   } else {
  //     setDrawerContributor(drawerContributor === name ? null : name);
  //     setExpandedContributor(null);
  //   }
  //   // Scroll the row into view
  //   setTimeout(() => {
  //     const row = rowRefs.current.get(name);
  //     row?.scrollIntoView({ behavior: "smooth", block: "center" });
  //   }, 50);
  // };
  //
  // // Find contributors for the A/B test
  // const rank1 = contributors[0]; // Venkat R. → Option 1 (Accordion)
  // const rank2 = contributors[1]; // Priya S. → Option 2 (Drawer)
  // const drawerPerson = drawerContributor ? contributors.find(c => c.name === drawerContributor) : null;

  // /* ─── Accordion: inline expanded solutions grouped by domain ─── */
  // const renderAccordion = (contributor: Contributor) => {
  //   const grouped = groupByDomain(contributor.solutions);
  //   return (
  //     <div className="mt-2 mb-1 ml-[4.25rem] mr-4 rounded-lg border border-border/60 bg-muted/20 overflow-hidden animate-leap-fade-in-up">
  //       {grouped.map(([domain, items], gi) => (
  //         <div key={domain}>
  //           {gi > 0 && <div className="border-t border-border/30" />}
  //           <div className="px-3 py-1.5 bg-muted/30 flex items-center gap-2">
  //             <div className={`w-1 h-4 rounded-full ${
  //               domain === "Retail" ? "bg-blue-500" :
  //               domain === "Finance" ? "bg-emerald-500" :
  //               domain === "Engineering" ? "bg-cyan-500" :
  //               domain === "Legal" ? "bg-purple-500" :
  //               domain === "Manufacturing" ? "bg-orange-500" :
  //               domain === "Healthcare" ? "bg-red-500" :
  //               domain === "Automotive" ? "bg-indigo-500" :
  //               "bg-pink-500"
  //             }`} />
  //             <span className="text-xs font-semibold text-foreground">{domain}</span>
  //             <span className="text-[10px] text-muted-foreground">({items.length})</span>
  //           </div>
  //           {items.map((s) => (
  //             <button
  //               key={s.useCaseId}
  //               onClick={(e) => { e.stopPropagation(); handleSolutionClick(s.domainId, s.useCaseId); }}
  //               className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-primary/5 transition-colors group"
  //             >
  //               <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
  //               <span className="text-sm text-foreground flex-1">{s.title}</span>
  //               <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
  //             </button>
  //           ))}
  //         </div>
  //       ))}
  //     </div>
  //   );
  // };
  //
  // return (
  //   <div className="space-y-8 animate-leap-fade-in-up w-full relative">
  //     {/* Header */}
  //     <div className="flex items-center justify-between gap-4">
  //       <div>
  //         <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
  //           <Trophy className="h-5 w-5 text-amber-500" />
  //           Contributor Leaderboard
  //         </h2>
  //         <p className="text-sm text-muted-foreground mt-1">
  //           Recognizing the team members driving AI adoption across the platform
  //         </p>
  //       </div>
  //       <div className="flex items-center gap-4">
  //         <div className="text-right">
  //           <div className="text-2xl font-bold text-foreground">{totalSolutions}</div>
  //           <div className="text-[11px] text-muted-foreground">Total Solutions</div>
  //         </div>
  //         <div className="h-8 w-px bg-border" />
  //         <div className="text-right">
  //           <div className="text-2xl font-bold text-foreground">{contributors.length}</div>
  //           <div className="text-[11px] text-muted-foreground">Contributors</div>
  //         </div>
  //       </div>
  //     </div>
  //     {/* ─── Podium: Top 3 ─── */}
  //     <div className="grid grid-cols-3 gap-4">
  //       {contributors.slice(0, 3).map((c, i) => {
  //         const rank = i + 1;
  //         const colors = RANK_COLORS[i];
  //         const medals = ["🥇", "🥈", "🥉"];
  //         const isAccordionTarget = rank === 1;
  //         const isDrawerTarget = rank === 2;
  //         const isClickable = isAccordionTarget || isDrawerTarget;
  //         return (
  //           <div key={c.name} onClick={() => { if (isAccordionTarget) scrollToAndExpand(c.name, "accordion"); else if (isDrawerTarget) scrollToAndExpand(c.name, "drawer"); }}
  //             className={`relative rounded-xl border ${colors.border} ${colors.bg} p-5 text-center transition-all ${rank === 1 ? "ring-1 ring-amber-300/20 shadow-sm" : ""} ${isClickable ? "cursor-pointer hover:shadow-md" : ""}`}>
  //             <div className="text-3xl mb-2">{medals[i]}</div>
  //             <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm ${rank === 1 ? "bg-amber-400" : rank === 2 ? "bg-slate-400" : "bg-orange-400"}`}>{c.initials}</div>
  //             <h3 className="mt-3 text-sm font-bold text-foreground">{c.name}</h3>
  //             <div className={`mt-1 text-2xl font-extrabold ${colors.text}`}>{c.count}</div>
  //             <div className="text-[11px] text-muted-foreground">solutions</div>
  //             <div className="mt-2 flex flex-wrap justify-center gap-1">
  //               {c.domains.slice(0, 3).map((d) => (<span key={d} className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${DOMAIN_COLORS[d] || "bg-gray-100 text-gray-600"}`}>{d}</span>))}
  //             </div>
  //             {isClickable && (<div className="mt-3 text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1"><ChevronDown className="w-3 h-3" /><span>View solutions</span></div>)}
  //           </div>
  //         );
  //       })}
  //     </div>
  //     {/* ─── Full Rankings ─── */}
  //     <div ref={rankingsRef} className="rounded-xl border border-border bg-card overflow-hidden relative">
  //       <div className="px-5 py-3 border-b border-border bg-muted/30">
  //         <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Full Rankings</h3>
  //       </div>
  //       <div className="flex">
  //         <div className={`divide-y divide-border transition-all duration-300 ${drawerPerson ? "w-[60%]" : "w-full"}`}>
  //           {contributors.map((c, i) => {
  //             const rank = i + 1; const barWidth = Math.round((c.count / maxCount) * 100);
  //             const isAccordionTarget = rank === 1; const isDrawerTarget = rank === 2;
  //             const isClickable = isAccordionTarget || isDrawerTarget; const isExpanded = expandedContributor === c.name;
  //             return (
  //               <div key={c.name} ref={(el) => { if (el) rowRefs.current.set(c.name, el); }}>
  //                 <div onClick={() => { if (isAccordionTarget) { setExpandedContributor(isExpanded ? null : c.name); setDrawerContributor(null); } else if (isDrawerTarget) { setDrawerContributor(drawerContributor === c.name ? null : c.name); setExpandedContributor(null); } }}
  //                   className={`flex items-center gap-4 px-5 py-3 transition-colors ${isClickable ? "cursor-pointer hover:bg-muted/30" : "hover:bg-muted/20"} ${isExpanded || drawerContributor === c.name ? "bg-primary/5" : ""}`}>
  //                   <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rank <= 3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{rank}</div>
  //                   <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${rank === 1 ? "bg-amber-500" : rank === 2 ? "bg-slate-500" : rank === 3 ? "bg-orange-500" : "bg-primary/70"}`}>{c.initials}</div>
  //                   <div className="flex-1 min-w-0">
  //                     <div className="text-sm font-medium text-foreground">{c.name}</div>
  //                     <div className="text-[11px] text-muted-foreground">Top: {c.topDomain} · {c.domains.length} domain{c.domains.length > 1 ? "s" : ""}</div>
  //                   </div>
  //                   {!drawerPerson && (<div className="w-32 hidden sm:block"><div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all ${rank <= 3 ? "bg-primary" : "bg-primary/50"}`} style={{ width: `${barWidth}%` }} /></div></div>)}
  //                   <div className="text-right shrink-0 w-20"><span className="text-sm font-bold text-foreground">{c.count}</span><span className="text-xs text-muted-foreground ml-1">sol.</span></div>
  //                   {isClickable && (<div className="shrink-0">{isAccordionTarget ? (<ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />) : (<ExternalLink className="w-4 h-4 text-muted-foreground" />)}</div>)}
  //                 </div>
  //                 {isAccordionTarget && isExpanded && (<div className="px-2 pb-2"><div className="text-[10px] text-primary/60 bg-primary/5 px-3 py-1 rounded-t-md text-center">Option A: Accordion</div>{renderAccordion(c)}</div>)}
  //               </div>
  //             );
  //           })}
  //         </div>
  //         {drawerPerson && (
  //           <div className="w-[40%] border-l border-border bg-card flex flex-col animate-leap-fade-in-up">
  //             <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
  //               <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${drawerPerson.name === rank1?.name ? "bg-amber-500" : drawerPerson.name === rank2?.name ? "bg-slate-500" : "bg-primary/70"}`}>{drawerPerson.initials}</div>
  //               <div className="flex-1 min-w-0"><div className="text-sm font-bold text-foreground">{drawerPerson.name}</div><div className="text-[11px] text-muted-foreground">{drawerPerson.count} solutions · {drawerPerson.domains.length} domains</div></div>
  //               <button onClick={() => setDrawerContributor(null)} className="p-1.5 rounded-md hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
  //             </div>
  //             <div className="text-[10px] text-primary/60 bg-primary/5 px-4 py-1 text-center border-b border-border/50">Option B: Side Panel</div>
  //             <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
  //               {groupByDomain(drawerPerson.solutions).map(([domain, items]) => (
  //                 <div key={domain}>
  //                   <div className="flex items-center gap-2 mb-1.5">
  //                     <div className={`w-1 h-4 rounded-full ${domain === "Retail" ? "bg-blue-500" : domain === "Finance" ? "bg-emerald-500" : domain === "Engineering" ? "bg-cyan-500" : domain === "Legal" ? "bg-purple-500" : domain === "Manufacturing" ? "bg-orange-500" : domain === "Healthcare" ? "bg-red-500" : domain === "Automotive" ? "bg-indigo-500" : "bg-pink-500"}`} />
  //                     <span className="text-xs font-semibold text-foreground">{domain}</span>
  //                     <span className="text-[10px] text-muted-foreground">({items.length})</span>
  //                   </div>
  //                   <div className="space-y-0.5 ml-3">
  //                     {items.map((s) => (<button key={s.useCaseId} onClick={() => handleSolutionClick(s.domainId, s.useCaseId)} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left hover:bg-primary/5 transition-colors group"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" /><span className="text-sm text-foreground flex-1">{s.title}</span><ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" /></button>))}
  //                   </div>
  //                 </div>
  //               ))}
  //             </div>
  //             <div className="px-4 py-2 border-t border-border bg-muted/20 text-center"><div className="text-[11px] text-muted-foreground">Latest: {timeAgo(drawerPerson.latestDate)}</div></div>
  //           </div>
  //         )}
  //       </div>
  //     </div>
  //     {/* ─── Recent Activity ─── */}
  //     <div className="rounded-xl border border-border bg-card overflow-hidden">
  //       <div className="px-5 py-3 border-b border-border bg-muted/30">
  //         <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Recent Activity</h3>
  //       </div>
  //       <div className="divide-y divide-border">
  //         {recentActivity.map((item, i) => (
  //           <button key={i} onClick={() => handleSolutionClick(item.domainId, item.useCaseId)} className="w-full flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-muted/20 transition-colors text-left group">
  //             <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10"><Star className="h-3 w-3 text-primary" /></div>
  //             <div className="flex-1 min-w-0"><span className="font-medium text-foreground">{(item as any).contributor}</span><span className="text-muted-foreground"> added </span><span className="font-medium text-foreground">{item.title}</span></div>
  //             <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${DOMAIN_COLORS[item.domain] || "bg-gray-100 text-gray-600"}`}>{item.domain}</span>
  //             <span className="text-[11px] text-muted-foreground shrink-0 w-16 text-right">{timeAgo(item.date)}</span>
  //             <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
  //           </button>
  //         ))}
  //       </div>
  //     </div>
  //     {/* ─── Summary ─── */}
  //     <div className="text-center text-sm text-muted-foreground pb-4">
  //       <Users className="inline h-4 w-4 mr-1 -mt-0.5" />
  //       {totalSolutions} solutions onboarded by {contributors.length} contributors across{" "}
  //       {new Set(contributors.flatMap((c) => c.domains)).size} domains
  //     </div>
  //   </div>
  // };
  //
  // export default Leaderboard;
