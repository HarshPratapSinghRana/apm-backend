import { FC } from "react";
import {
  ArrowRight,
  Zap,
  Activity,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Server,
  Shield,
  Cpu,
  RefreshCw,
} from "lucide-react";

/* ─── Automation Dashboard ───────────────────────────── */

const automations = [
  {
    id: "a1",
    title: "Invoice Processing Pipeline",
    description:
      "Automated end-to-end invoice processing - from email ingestion to extraction, validation, PO matching, and ERP posting with exception routing.",
    status: "Running",
    runsToday: 847,
    successRate: 98.2,
    avgTime: "1.4 min",
    category: "Finance",
  },
  {
    id: "a2",
    title: "Employee Onboarding Workflow",
    description:
      "Orchestrates IT provisioning, badge creation, orientation scheduling, and system access setup for new hires across 6 departments.",
    status: "Running",
    runsToday: 23,
    successRate: 100,
    avgTime: "12 min",
    category: "HR",
  },
  {
    id: "a3",
    title: "Compliance Document Scanner",
    description:
      "Nightly batch scan of policy documents against latest regulatory requirements. Flags gaps and auto-generates remediation tickets.",
    status: "Scheduled",
    runsToday: 0,
    successRate: 96.5,
    avgTime: "45 min",
    category: "Compliance",
  },
  {
    id: "a4",
    title: "Customer Feedback Analyzer",
    description:
      "Processes support tickets, NPS surveys, and social mentions - classifies sentiment, extracts themes, and routes urgent items to the right team.",
    status: "Running",
    runsToday: 1250,
    successRate: 99.1,
    avgTime: "8 sec",
    category: "CX",
  },
  {
    id: "a5",
    title: "Report Generation Bot",
    description:
      "Auto-generates weekly executive dashboards by pulling data from 5 sources, running analytics, and formatting into branded PDF + email distribution.",
    status: "Paused",
    runsToday: 0,
    successRate: 97.8,
    avgTime: "3.5 min",
    category: "Analytics",
  },
  {
    id: "a6",
    title: "Data Quality Monitor",
    description:
      "Continuous monitoring of data pipelines for schema drift, null spikes, duplicate detection, and freshness SLAs across 40+ data sources.",
    status: "Running",
    runsToday: 4800,
    successRate: 99.7,
    avgTime: "2 sec",
    category: "Data",
  },
];

export const AutomationGrid: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    {/* Summary stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center p-4 rounded-xl bg-card border border-border">
        <div className="text-2xl font-bold text-primary">6,920</div>
        <div className="text-xs text-muted-foreground mt-1">Runs Today</div>
      </div>
      <div className="text-center p-4 rounded-xl bg-card border border-border">
        <div className="text-2xl font-bold text-emerald-600">98.6%</div>
        <div className="text-xs text-muted-foreground mt-1">Avg Success Rate</div>
      </div>
      <div className="text-center p-4 rounded-xl bg-card border border-border">
        <div className="text-2xl font-bold text-primary">6</div>
        <div className="text-xs text-muted-foreground mt-1">Active Workflows</div>
      </div>
      <div className="text-center p-4 rounded-xl bg-card border border-border">
        <div className="text-2xl font-bold text-primary">340 hrs</div>
        <div className="text-xs text-muted-foreground mt-1">Saved This Month</div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 cards-grid-symmetric">
      {automations.map((a, i) => (
        <div
          key={a.id}
          className="domain-card p-6 group cursor-pointer overflow-hidden"
          style={{ animationDelay: `${i * 80}ms`, animation: "fadeInUp 0.6s ease-out both" }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                  a.status === "Running" ? "bg-emerald-100 text-emerald-700" :
                  a.status === "Scheduled" ? "bg-blue-100 text-blue-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {a.status === "Running" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  {a.status}
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">{a.category}</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-base font-bold text-card-foreground mb-2 group-hover:text-primary transition-colors">{a.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2">{a.description}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="font-bold text-foreground">{a.runsToday.toLocaleString()}</div>
                <div className="text-muted-foreground">Runs</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="font-bold text-emerald-600">{a.successRate}%</div>
                <div className="text-muted-foreground">Success</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="font-bold text-foreground">{a.avgTime}</div>
                <div className="text-muted-foreground">Avg Time</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Monitoring Dashboard ───────────────────────────── */

const models = [
  { name: "Invoice Extractor v3.2", type: "Document AI", status: "Healthy", latencyP50: "120ms", latencyP99: "450ms", accuracy: "98.2%", requests: "12.4K/day", drift: "Low" },
  { name: "Compliance Analyzer v2.1", type: "NLP / Classification", status: "Healthy", latencyP50: "85ms", latencyP99: "320ms", accuracy: "95.8%", requests: "3.2K/day", drift: "Low" },
  { name: "Demand Forecaster v1.8", type: "Time Series", status: "Warning", latencyP50: "2.1s", latencyP99: "8.5s", accuracy: "94.1%", requests: "850/day", drift: "Medium" },
  { name: "Sentiment Classifier v4.0", type: "NLP / Sentiment", status: "Healthy", latencyP50: "45ms", latencyP99: "180ms", accuracy: "96.7%", requests: "25K/day", drift: "Low" },
  { name: "Image QC Detector v1.2", type: "Computer Vision", status: "Degraded", latencyP50: "340ms", latencyP99: "1.8s", accuracy: "91.3%", requests: "5.6K/day", drift: "High" },
];

export const MonitoringDashboard: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    {/* System health summary */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <div className="text-xl font-bold text-foreground">3</div>
          <div className="text-xs text-muted-foreground">Healthy</div>
        </div>
      </div>
      <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <div className="text-xl font-bold text-foreground">1</div>
          <div className="text-xs text-muted-foreground">Warning</div>
        </div>
      </div>
      <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
          <Activity className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <div className="text-xl font-bold text-foreground">1</div>
          <div className="text-xs text-muted-foreground">Degraded</div>
        </div>
      </div>
      <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Server className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <div className="text-xl font-bold text-foreground">47K</div>
          <div className="text-xs text-muted-foreground">Reqs / Day</div>
        </div>
      </div>
    </div>

    {/* Model table */}
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 font-semibold text-foreground">Model</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground">Type</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground">P50 Latency</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground">Accuracy</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground">Requests</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground">Drift</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.name} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-5 py-4 font-medium text-foreground">{m.name}</td>
                <td className="px-5 py-4 text-muted-foreground">{m.type}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    m.status === "Healthy" ? "bg-emerald-100 text-emerald-700" :
                    m.status === "Warning" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      m.status === "Healthy" ? "bg-emerald-500" :
                      m.status === "Warning" ? "bg-amber-500" :
                      "bg-red-500"
                    }`} />
                    {m.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{m.latencyP50}</td>
                <td className="px-5 py-4 text-foreground font-medium">{m.accuracy}</td>
                <td className="px-5 py-4 text-muted-foreground">{m.requests}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-medium ${
                    m.drift === "Low" ? "text-emerald-600" :
                    m.drift === "Medium" ? "text-amber-600" :
                    "text-red-600"
                  }`}>{m.drift}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

/* ─── Analytics Dashboard ────────────────────────────── */

const kpis = [
  { label: "Total AI Requests", value: "2.4M", change: "+18%", trend: "up" },
  { label: "Avg Response Time", value: "145ms", change: "-12%", trend: "down" },
  { label: "Cost per Request", value: "$0.003", change: "-8%", trend: "down" },
  { label: "User Satisfaction", value: "4.7/5", change: "+0.3", trend: "up" },
];

const topUseCases = [
  { name: "Invoice Processing", requests: "540K", growth: "+22%", efficiency: "98%" },
  { name: "Customer Support Bot", requests: "420K", growth: "+35%", efficiency: "96%" },
  { name: "Document Classification", requests: "380K", growth: "+15%", efficiency: "97%" },
  { name: "Sentiment Analysis", requests: "290K", growth: "+28%", efficiency: "95%" },
  { name: "Demand Forecasting", requests: "180K", growth: "+42%", efficiency: "94%" },
];

export const AnalyticsDashboard: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    {/* KPI cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="p-5 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-foreground mb-2">{kpi.label}</div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-foreground">{kpi.value}</span>
            <span className={`text-xs font-medium flex items-center gap-0.5 mb-0.5 ${
              kpi.trend === "up" && kpi.label !== "Avg Response Time" && kpi.label !== "Cost per Request" ? "text-emerald-600" :
              kpi.trend === "down" && (kpi.label === "Avg Response Time" || kpi.label === "Cost per Request") ? "text-emerald-600" :
              "text-emerald-600"
            }`}>
              <TrendingUp className={`w-3 h-3 ${kpi.trend === "down" ? "rotate-180" : ""}`} />
              {kpi.change}
            </span>
          </div>
        </div>
      ))}
    </div>

    {/* Top use cases table */}
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Top AI Use Cases by Volume
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-6 py-3 font-semibold text-foreground">#</th>
              <th className="text-left px-6 py-3 font-semibold text-foreground">Use Case</th>
              <th className="text-left px-6 py-3 font-semibold text-foreground">Requests (MTD)</th>
              <th className="text-left px-6 py-3 font-semibold text-foreground">Growth</th>
              <th className="text-left px-6 py-3 font-semibold text-foreground">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {topUseCases.map((uc, i) => (
              <tr key={uc.name} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                </td>
                <td className="px-6 py-4 font-medium text-foreground">{uc.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{uc.requests}</td>
                <td className="px-6 py-4">
                  <span className="text-emerald-600 font-medium text-xs flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {uc.growth}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: uc.efficiency }} />
                    </div>
                    <span className="text-xs text-foreground font-medium">{uc.efficiency}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Placeholder chart areas */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Request Volume Trend</h3>
        <div className="h-48 rounded-lg bg-muted/30 border border-border flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Chart visualization coming soon</p>
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Cost Breakdown by Service</h3>
        <div className="h-48 rounded-lg bg-muted/30 border border-border flex items-center justify-center">
          <div className="text-center">
            <Cpu className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Chart visualization coming soon</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);
