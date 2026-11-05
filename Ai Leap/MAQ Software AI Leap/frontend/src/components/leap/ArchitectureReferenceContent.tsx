import { FC } from "react";
import {
  Server,
  Layers,
  Shield,
  Activity,
  GitBranch,
  BarChart3,
  Network,
  Target,
  CheckCircle2,
  Cloud,
  Lock,
  Eye,
  Database,
  FileCode,
  Brain,
  AlertTriangle,
  Gauge,
  TrendingUp,
  Cpu,
  Settings,
  BookOpen,
  ShoppingCart,
  Scale,
  DollarSign,
  Users,
  Briefcase,
  Sparkles,
  FileSearch,
  Zap,
  ShieldCheck,
} from "lucide-react";

/* ─── Shared Section Card ─── */
const InfoCard: FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  items?: string[];
  tag?: string;
}> = ({ icon: Icon, title, description, items, tag }) => (
  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-card-border p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-foreground text-sm">{title}</h4>
          {tag && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {tag}
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed mb-2">
          {description}
        </p>
        {items && items.length > 0 && (
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);

/* ─── Section Header ─── */
const SectionHeader: FC<{
  icon: React.ElementType;
  title: string;
  subtitle: string;
}> = ({ icon: Icon, title, subtitle }) => (
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   1. Standard Services
   ═══════════════════════════════════════════════════════ */
export const StandardServicesContent: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    <SectionHeader
      icon={Server}
      title="Standard Services"
      subtitle="Services powering our AI agents, accelerators, and platform solutions"
    />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoCard
        icon={Brain}
        title="Azure OpenAI Service"
        description="LLM backbone for agents like Enterprise Knowledge Bot, Legal Intake, Voice FAQ, and Code Security Scanner."
        items={[
          "Used by: RAG component, DocuSphere, Prompt Playbook",
          "Powers all conversational & generative agent use cases",
        ]}
        tag="GenAI"
      />
      <InfoCard
        icon={FileSearch}
        title="Azure AI Document Intelligence"
        description="Extracts structured data from invoices, receipts, contracts — used by Finance and Compliance domains."
        items={[
          "Used by: Invoice Extraction, POE Scanner, Vendor Receipt Scanner",
          "Reusable Component: Document Intelligence",
        ]}
        tag="Document AI"
      />
      <InfoCard
        icon={Database}
        title="Azure AI Search"
        description="Semantic and vector search for RAG patterns across knowledge bots and FAQ agents."
        items={[
          "Used by: Enterprise Knowledge Bot, Voice FAQ Agent",
          "Reusable Component: RAG",
        ]}
        tag="Search"
      />
      <InfoCard
        icon={Network}
        title="Azure Machine Learning"
        description="Model training and managed endpoints for Retail Demand Forecaster, Fraud Detection, and Smart Retail Analytics."
        items={[
          "Used by: Retail Pulse, Personalization Engine, Expense Forecaster",
          "Linked to: AI & ML product category",
        ]}
        tag="ML Platform"
      />
      <InfoCard
        icon={BarChart3}
        title="Power BI Embedded"
        description="Core service behind our BI accelerators — EmbedFAST, CertyFAST, LoadFAST, and MigrateFAST."
        items={[
          "Used by: Reporting & Visualization service",
          "Used by: All FAST-suite accelerators",
        ]}
        tag="BI"
      />
      <InfoCard
        icon={Sparkles}
        title="Azure AI Foundry"
        description="Prompt flow and model catalog used for building agents across all 6 industry domains."
        items={[
          "Used by: COE Agentic AI Training curriculum",
          "Used by: Responsible AI Agent for evaluation",
        ]}
        tag="AI Platform"
      />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   2. Reference Architectures & Reusable Patterns
   ═══════════════════════════════════════════════════════ */
export const ReferenceArchitecturesContent: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    <SectionHeader
      icon={Layers}
      title="Reference Architectures"
      subtitle="Proven patterns used by our solutions and reusable components"
    />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoCard
        icon={Database}
        title="RAG Pattern"
        description="Used by Enterprise Knowledge Bot, Voice FAQ Agent, and DocuSphere for grounded answers from enterprise data."
        items={[
          "OpenAI + AI Search + Cosmos DB",
          "Reusable Component: RAG (Solutions → Reusable Components)",
          "Chunking & embedding via Document Intelligence component",
        ]}
        tag="Reusable"
      />
      <InfoCard
        icon={Network}
        title="Multi-Agent Orchestration"
        description="Legal Intake routes across document classification, entity extraction, and workflow agents."
        items={[
          "Semantic Kernel for agent coordination",
          "Used by: Compliance Agent, Executive Copilot Agent",
          "Shared memory for context across agent steps",
        ]}
        tag="Pattern"
      />
      <InfoCard
        icon={FileSearch}
        title="Document Processing Pipeline"
        description="Standard pipeline for Invoice Extraction, POE Scanner, and Vendor Receipt Scanner."
        items={[
          "Ingest → Classify → Extract → Validate → Output",
          "Queue-based async processing for batch uploads",
          "Human review loop for low-confidence results",
        ]}
        tag="Pipeline"
      />
      <InfoCard
        icon={ShoppingCart}
        title="Retail Analytics Pattern"
        description="Architecture behind Retail Pulse, Demand Forecaster, and Inventory Overview agents."
        items={[
          "Real-time data ingestion + ML scoring",
          "Power BI dashboards via EmbedFAST",
          "Smart Retail Analytics product integration",
        ]}
        tag="Pattern"
      />
      <InfoCard
        icon={BarChart3}
        title="BI Embedding Pattern"
        description="Standard architecture for EmbedFAST, CertyFAST, LoadFAST, and MigrateFAST accelerators."
        items={[
          "Power BI Embedded + API layer + RBAC",
          "Multi-tenant embedding with row-level security",
          "Performance monitoring via LoadFAST metrics",
        ]}
        tag="Accelerator"
      />
      <InfoCard
        icon={ShieldCheck}
        title="Responsible AI Pattern"
        description="Evaluation and compliance architecture used by the Responsible AI Agent."
        items={[
          "Fairness, transparency, and content safety checks",
          "Automated bias detection across agent outputs",
          "Audit trail and model card generation",
        ]}
        tag="Governance"
      />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   3. AI Landing Zone
   ═══════════════════════════════════════════════════════ */
export const AILandingZoneContent: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    <SectionHeader
      icon={Cloud}
      title="AI Landing Zone"
      subtitle="Enterprise-ready Azure foundation for deploying AI workloads"
    />

    <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5">
      <p className="text-sm text-muted-foreground leading-relaxed">
        A pre-configured Azure environment with networking, identity, and security controls for safe AI deployment.
        Follows the Cloud Adoption Framework (CAF) with AI-specific extensions.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoCard
        icon={Network}
        title="Network Topology"
        description="Hub-spoke with private endpoints for OpenAI, AI Search, and Storage."
        items={[
          "VNet integration for ML compute clusters",
          "Private DNS zones for service resolution",
        ]}
      />
      <InfoCard
        icon={Lock}
        title="Identity & Access"
        description="Entra ID with managed identities and custom RBAC roles."
        items={[
          "Data Scientist / ML Engineer / AI Admin roles",
          "Conditional access and PIM for prod environments",
        ]}
      />
      <InfoCard
        icon={Layers}
        title="Resource Organization"
        description="Subscription strategy separating AI workloads by environment."
        items={[
          "Dev / Staging / Prod separation",
          "Tagging for cost allocation per domain (Finance, Retail, HR, etc.)",
        ]}
      />
      <InfoCard
        icon={Settings}
        title="Compute & Infrastructure"
        description="Right-sized compute for training and inference workloads."
        items={[
          "GPU clusters for model training, managed endpoints for serving",
          "Container deployments (AKS / ACA) for agent hosting",
        ]}
      />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   4. Governance & Security
   ═══════════════════════════════════════════════════════ */
export const GovernanceSecurityContent: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    <SectionHeader
      icon={Shield}
      title="Governance & Security"
      subtitle="Practices from our Compliance domain and Responsible AI Agent applied platform-wide"
    />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoCard
        icon={ShieldCheck}
        title="Responsible AI"
        description="Practices embedded in the RAI Agent — fairness, transparency, content safety."
        items={[
          "Bias detection on agent outputs",
          "Content safety filters for all GenAI use cases",
          "Model cards documenting capabilities & limits",
        ]}
      />
      <InfoCard
        icon={Lock}
        title="Data Security"
        description="Applied across Invoice Extraction, Legal Intake, and all document pipelines."
        items={[
          "Encryption at rest (CMK) and in transit (TLS 1.2+)",
          "Key Vault for API keys and connection strings",
          "Private endpoints for data-in-motion isolation",
        ]}
      />
      <InfoCard
        icon={Eye}
        title="Access Control"
        description="RBAC model used by EmbedFAST for multi-tenant Power BI embedding."
        items={[
          "Row-level security for tenant data isolation",
          "Managed identity service-to-service auth",
          "Just-in-time access for production resources",
        ]}
      />
      <InfoCard
        icon={BookOpen}
        title="Compliance"
        description="Aligned with the Compliance domain — frameworks for regulated industries."
        items={[
          "Security Risk Analyzer Agent for automated compliance checks",
          "Audit trails on model decisions (Finance, Legal use cases)",
          "Compliance Agent for continuous policy monitoring",
        ]}
      />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   5. Monitoring & Alerting
   ═══════════════════════════════════════════════════════ */
export const MonitoringAlertingContent: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    <SectionHeader
      icon={Activity}
      title="Monitoring & Alerting"
      subtitle="Observability for AI agents, data pipelines, and accelerator products"
    />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoCard
        icon={Gauge}
        title="Agent Performance"
        description="Track accuracy, latency, and throughput for all 27 deployed use cases."
        items={[
          "Per-agent inference latency (P50 / P95)",
          "Response quality scoring with RAI checks",
          "Data drift detection for ML-based agents",
        ]}
      />
      <InfoCard
        icon={Activity}
        title="Pipeline Health"
        description="Monitor document processing and data ingestion pipelines."
        items={[
          "Invoice Extraction pipeline success rate",
          "RAG indexing freshness for Knowledge Bots",
          "Failed step alerts with root-cause context",
        ]}
      />
      <InfoCard
        icon={BarChart3}
        title="Product Dashboards"
        description="Operational dashboards for FAST-suite accelerators."
        items={[
          "LoadFAST: Power BI capacity & load metrics",
          "EmbedFAST: API call volume & error rates",
          "AI-DataLens: Query volume & response times",
        ]}
      />
      <InfoCard
        icon={AlertTriangle}
        title="Alerting Strategy"
        description="Severity-based alerts routed to domain-specific teams."
        items={[
          "P0: Agent down / pipeline failures → immediate",
          "P1: Model drift / quality degradation → 1hr SLA",
          "P2: Cost spikes / resource warnings → daily review",
        ]}
      />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   6. Versioning Standards
   ═══════════════════════════════════════════════════════ */
export const VersioningStandardsContent: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    <SectionHeader
      icon={GitBranch}
      title="Versioning Standards"
      subtitle="How we version models, data, and code across the platform"
    />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-card/80 rounded-2xl border border-card-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Models</h3>
        </div>
        <ul className="space-y-2">
          {[
            "Semantic versioning (major.minor.patch)",
            "Azure ML model registry with stage gates",
            "Model cards per version",
            "Linked to training data snapshot",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-card/80 rounded-2xl border border-card-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Data</h3>
        </div>
        <ul className="space-y-2">
          {[
            "Dataset snapshots with timestamps",
            "Schema versioning with backward compat",
            "Delta Lake / DVC for large datasets",
            "Lineage from source to feature store",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-card/80 rounded-2xl border border-card-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileCode className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Code</h3>
        </div>
        <ul className="space-y-2">
          {[
            "Git-based (Azure DevOps / GitHub)",
            "main / develop / feature / release branches",
            "Tagged releases linked to model versions",
            "IaC versioned alongside app code",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   7. Use Case Architectures
   ═══════════════════════════════════════════════════════ */
export const UseCaseArchitecturesContent: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    <SectionHeader
      icon={Layers}
      title="Use Case Architectures"
      subtitle="Architecture for active use cases across all 6 domains"
    />

    <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Ongoing</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Architecture diagrams are being added for each of the 27 use cases across Compliance, Finance, HR, Legal, Productivity, and Retail domains.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoCard
        icon={DollarSign}
        title="Invoice Extraction Agent"
        description="Document Intelligence → classification → field extraction → ERP output."
        items={[
          "Pre-built invoice model + custom validation rules",
          "Also covers: POE Scanner, Vendor Receipt Scanner",
        ]}
        tag="Finance"
      />
      <InfoCard
        icon={Scale}
        title="Legal Intake & Routing"
        description="Chat interface → document upload → entity extraction → case routing."
        items={[
          "Multi-agent: classifier agent + extractor agent + router",
          "Conversation state in Cosmos DB",
        ]}
        tag="Legal"
      />
      <InfoCard
        icon={Briefcase}
        title="Voice FAQ Agent"
        description="Speech-to-text → RAG retrieval → LLM response → text-to-speech."
        items={[
          "Azure Speech Services + OpenAI + AI Search",
          "Reuses RAG component from Solutions",
        ]}
        tag="Productivity"
      />
      <InfoCard
        icon={ShieldCheck}
        title="Security Risk Analyzer"
        description="Code input → static analysis → LLM-based review → prioritized findings."
        items={[
          "OWASP rule integration + custom patterns",
          "CI/CD integration for automated scanning",
        ]}
        tag="Compliance"
      />
      <InfoCard
        icon={ShoppingCart}
        title="Retail Pulse"
        description="POS data ingestion → ML scoring → real-time dashboard → alerts."
        items={[
          "Links to: Smart Retail Analytics, Inventory Overview",
          "EmbedFAST for dashboard embedding",
        ]}
        tag="Retail"
      />
      <InfoCard
        icon={Users}
        title="Hiring Support Agent"
        description="Resume parsing → skill matching → interview scheduling → feedback loop."
        items={[
          "Document Intelligence for resume extraction",
          "LLM for skill-to-JD matching and ranking",
        ]}
        tag="HR"
      />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   8. Key Metrics
   ═══════════════════════════════════════════════════════ */
export const KeyMetricsContent: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    <SectionHeader
      icon={BarChart3}
      title="Key Metrics"
      subtitle="How we measure success across agents, accelerators, and services"
    />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoCard
        icon={Target}
        title="Agent Accuracy"
        description="Primary metric for all 27 agent use cases."
        items={[
          "Smart Invoice Processor: 92% extraction accuracy",
          "Compliance Guardian: policy match accuracy",
          "Per-domain precision / recall / F1 tracking",
        ]}
        tag="Quality"
      />
      <InfoCard
        icon={Zap}
        title="Processing Speed"
        description="Latency and throughput across pipelines and endpoints."
        items={[
          "Inference latency: P50, P95, P99 per agent",
          "Document pipeline: docs processed per minute",
          "LoadFAST: Power BI report render times",
        ]}
        tag="Performance"
      />
      <InfoCard
        icon={TrendingUp}
        title="Business Impact"
        description="ROI and efficiency gains measured per project."
        items={[
          "Smart Invoice Processor: 73% time reduction",
          "HR Onboarding Assistant: 60% faster onboarding",
          "Retail Demand Forecaster: 35% waste reduction",
        ]}
        tag="Business"
      />
      <InfoCard
        icon={Users}
        title="Adoption & Engagement"
        description="Track usage across products and agents."
        items={[
          "Active users per accelerator (EmbedFAST, AI-DataLens)",
          "Agent interactions per domain per week",
          "Training completion rate (COE, Workshops)",
        ]}
        tag="Adoption"
      />
      <InfoCard
        icon={Gauge}
        title="Operational Health"
        description="Uptime and reliability for production agents and services."
        items={[
          "System uptime / SLA compliance per agent",
          "Pipeline success rate and data freshness",
          "MTTR (mean time to recovery) for incidents",
        ]}
        tag="Operations"
      />
      <InfoCard
        icon={Shield}
        title="Compliance & Quality"
        description="Responsible AI and regulatory compliance metrics."
        items={[
          "RAI Agent: bias scores across demographics",
          "Content safety filter trigger rate",
          "Audit compliance pass rate (Finance, Legal)",
        ]}
        tag="Compliance"
      />
    </div>
  </div>
);
