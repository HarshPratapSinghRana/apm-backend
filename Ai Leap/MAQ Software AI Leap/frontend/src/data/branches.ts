import { LucideIcon, Code, BookOpen, Server, FileText, TrendingUp, Users, Wrench, Lightbulb, Layers, Briefcase, FileSearch, Sparkles, Zap, Database, BarChart3, LineChart, Brain, Cpu, FlaskConical, LayoutDashboard, Rocket, Component, Search, FileCode, Library, Trophy } from "lucide-react";

export interface CardItem {
  id: string;
  label: string;
  description: string;
  icon?: string; // Icon name from lucide-react
  nestedItems?: CardItem[];
  url?: string; // External URL for cards that link to external websites
  productCategoryId?: string; // ID linking to a product category for sidebar+detail view
  productDetailId?: string; // ID linking to a product detail page (custom UI)
  industryDomainId?: string; // Domain ID from agents.json (for Agentic AI use cases)
  industryUseCaseId?: string; // Use case ID from agents.json (for Agentic AI use cases)
  architecture?: "Pro Code" | "Low Code" | "No Code";
  disabled?: boolean; // When true, the card is non-clickable (coming soon / temporarily disabled)
}

export interface BranchChild {
  id: string;
  label: string;
  description: string;
  cards?: CardItem[];
  url?: string; // External URL for subsections that link to external websites
}

export interface BranchConfig {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  children: BranchChild[];
}

export const branches: BranchConfig[] = [
  // ...existing branches...
  // {
  //   id: "development",
  //   label: "Industry",
  //   description:
  //     "Build and deploy intelligent AI agents, robust developer tools, and production-grade APIs that power enterprise workflows.",
  //   icon: Code,
  //   children: [
  //     {
  //       id: "use-cases",
  //       label: "Use Cases",
  //       description:
  //         "Explore AI use cases across business domains with intelligent agents that automate complex workflows.",
  //     },
  //     {
  //       id: "agents",
  //       label: "Agents",
  //       description:
  //         "Discover, deploy, and manage AI agents tailored for various industry needs.",
  //       cards: [],
  //     },
  //   ],
  // },
  {
    id: "solutions",
    label: "Solutions",
    description:
      "Comprehensive suite of AI tools and solutions for enterprise use cases.",
    icon: Briefcase,
    children: [
      {
        id: "solutions-by-industry",
        label: "by Industry",
        description: "Explore solution use cases by industry domain.",
      },
      {
        id: "solutions-by-technology",
        label: "by Technology",
        description: "Browse products and agentic AI use cases by technology area.",
        cards: [
          {
            id: "intelligent-knowledge-base-bot",
            label: "Intelligent Knowledge Base Bot",
            description:
              "Unlock the power of data with our AI-powered Knowledge Base Bot. Experience swift responses, personalized interactions, and safeguarded data confidentiality.",
            icon: "Brain",
            productDetailId: "intelligent-knowledge-base-bot",
            architecture: "Pro Code",
          },
          {
            id: "smart-retail-analytics",
            label: "Smart Retail Analytics",
            description:
              "A computer vision solution leveraging deep learning to identify products on shelves, enabling precise inventory management and optimized placement.",
            icon: "Brain",
            productDetailId: "smart-retail-analytics",
            architecture: "Pro Code",
          },
          {
            id: "session-information-bot",
            label: "Session Information Bot",
            description:
              "Optimize information retrieval from past sessions with quick access, contextual search, and an interactive exploration experience.",
            icon: "Sparkles",
            productDetailId: "session-information-bot",
            architecture: "Pro Code",
          },
          {
            id: "feedback-summarizer-bot",
            label: "Feedback Summarizer Bot",
            description:
              "Consolidate feedback into actionable insights by automatically categorizing and summarizing diverse feedback sources.",
            icon: "Sparkles",
            productDetailId: "feedback-summarizer-bot",
            architecture: "Pro Code",
          },
          {
            id: "intelligent-document-processing-bot",
            label: "Intelligent Document Processing Bot",
            description:
              "Automate document processing with OCR + NLP to classify documents and extract key fields with high accuracy.",
            icon: "Sparkles",
            productDetailId: "intelligent-document-processing-bot",
            architecture: "Pro Code",
          },
          {
            id: "document-classification-bot",
            label: "Document Classification Bot",
            description:
              "Automatically categorize documents and extract relevant data with an OpenAI-powered assistant for faster retrieval and workflows.",
            icon: "Sparkles",
            productDetailId: "document-classification-bot",
            architecture: "Low Code",
          },
          {
            id: "smart-support-framework",
            label: "Smart Support Framework",
            description:
              "Automate support ticket triage with intelligent routing, priority assignment, and cross-team collaboration optimization.",
            icon: "Sparkles",
            productDetailId: "smart-support-framework",
            architecture: "Pro Code",
          },
          {
            id: "triviabot",
            label: "TriviaBot",
            description:
              "Engage users through a gamified trivia experience to gather insights and generate scorecard reporting.",
            icon: "Sparkles",
            productDetailId: "triviabot",
            architecture: "Low Code",
          },
          {
            id: "support-ticket-assistant",
            label: "Support Ticket Assistant",
            description:
              "Streamline repetitive support requests with automated processing, faster responses, and consistent resolution quality.",
            icon: "Sparkles",
            productDetailId: "support-ticket-assistant",
            architecture: "Low Code",
          },
          {
            id: "sales-assistant",
            label: "Sales Assistant",
            description:
              "Accelerate sales productivity with AI-driven client profiling and personalized solution generation from targeted questions.",
            icon: "Sparkles",
            productDetailId: "sales-assistant",
            architecture: "Pro Code",
          },
          {
            id: "test-case-recommender",
            label: "Test Case Recommender",
            description:
              "Recommend test cases by analyzing code changes and patterns to improve coverage and reduce manual effort.",
            icon: "Sparkles",
            productDetailId: "test-case-recommender",
            architecture: "Pro Code",
          },
          {
            id: "embedfast",
            label: "EmbedFAST",
            description:
              "Effortlessly embed Power BI into your apps without writing code. Achieve faster time to market with seamless integration, fully customizable APIs, simplified access control, and automatic updates.",
            icon: "LayoutDashboard",
            productDetailId: "embedfast",
            architecture: "No Code",
          },
          {
            id: "datalens",
            label: "AI-DataLens",
            description:
              "Transform how users interact with data by enabling natural language queries and delivering instant, intelligent insights. Chat with structured data, get automated visual generation, and AI-powered insight narratives.",
            icon: "Search",
            productDetailId: "datalens",
            architecture: "Low Code",
          },
          {
            id: "certyfast",
            label: "CertyFAST",
            description:
              "Streamline Power BI model development with automated error detection, DAX measure formatting, and simplified documentation. Ensure top-quality reports and adherence to best practices.",
            icon: "FlaskConical",
            productDetailId: "certyfast",
            architecture: "No Code",
          },
          {
            id: "loadfast",
            label: "LoadFAST",
            description:
              "Optimize your Power BI environments for greater efficiency and lower costs. Identify ideal capacity setup, track user interactions, simulate real usage, and analyze system performance.",
            icon: "Zap",
            productDetailId: "loadfast",
            architecture: "No Code",
          },
          {
            id: "migratefast",
            label: "MigrateFAST",
            description:
              "Accelerate your migration journey to Microsoft Fabric. Simplify data and reporting platform migration from Tableau to Power BI with AI-powered tools, achieving 40% cost savings.",
            icon: "Rocket",
            productDetailId: "migratefast",
            architecture: "Low Code",
          },
        ],
      },
    ],
  },
  {
    id: "services",
    label: "Services",
    description:
      "Core service offerings spanning AI, data analytics, and business intelligence solutions.",
    icon: Layers,
    children: [],
  },
  {
    id: "training",
    label: "Training",
    description:
      "Empower your teams with hands-on workshops and structured onboarding programs designed to accelerate AI adoption.",
    icon: BookOpen,
    children: [
      // {
      //   id: "coe",
      //   label: "COE - Agentic AI Training",
      //   description:
      //     "2-Week Agentic AI Training Plan covering Microsoft Stack - Copilot Studio, Azure AI Foundry, Semantic Kernel, and more.",
      // },
      {
        id: "workshops",
        label: "Workshops",
        description:
          "Live, instructor-led sessions with hands-on labs and real-world problem-solving exercises.",
      },
      // {
      //   id: "internal-training",
      //   label: "Internal Training / Onboarding",
      //   description:
      //     "Structured onboarding and internal training programs to upskill teams on AI tools and best practices. Includes courses, tutorials, and an LDP machine learning track.",
      // },
    ],
  },
  // {
  //   id: "resources-it",
  //   label: "Resources / IT",
  //   description:
  //     "Manage resource allocation, infrastructure planning, and IT operations for AI initiatives.",
  //   icon: Server,
  //   children: [
  //     {
  //       id: "resource-planning",
  //       label: "Resource Planning",
  //       description:
  //         "Plan and optimize resource allocation across AI projects and infrastructure.",
  //     },
  //   ],
  // },
  {
    id: "productivity",
    label: "Productivity",
    description:
      "Intelligent automation and AI solutions tailored to different personas and professional roles.",
    icon: TrendingUp,
    children: [
      {
        id: "solutions-tools",
        label: "Tools",
        description:
          "Comprehensive suite of AI tools for enterprise use cases.",
        cards: [
          {
            id: "swe-agent",
            label: "SWE Agent",
            description:
              "AI-powered software engineering assistant for Azure DevOps workflows — approach docs, test plans, PRs, notebooks, semantic models, and more.",
            icon: "Bot",
            url: "internal://swe-agent",
          },
          {
            id: "docusphere",
            label: "DocuSphere",
            description:
              "Enterprise document intelligence and processing platform powered by AI. Extract, analyze, and transform documents with precision.",
            icon: "FileSearch",
            url: "https://maq-docusphere.azurewebsites.net/",
          },
          {
            id: "promptplaybook",
            label: "Prompt Playbook",
            description:
              "Prompt engineering workflows, templates, and best practices to accelerate AI solution design.",
            icon: "FileCode",
            url: "https://promptplaybook.azurewebsites.net/",
            disabled: true,
          },
        ],
      },
      {
        id: "reusable-components",
        label: "Reusable Components",
        description: "Reusable AI components for rapid solution development.",
        cards: [
          {
            id: "rag-component",
            label: "RAG",
            description: "Retrieval-Augmented Generation component for extracting structured data from unstructured sources.",
            icon: "Database",
          },
          {
            id: "document-intelligence-component",
            label: "Document Intelligence",
            description: "Document Intelligence component for extracting information from documents.",
            icon: "FileSearch",
            url: "internal://rag",
          },
        ],
      },
      // {
      //   id: "persona",
      //   label: "Persona",
      //   description:
      //     "AI solutions tailored for different professional personas and roles.",
      //   cards: [
      //     {
      //       id: "data-engineering",
      //       label: "Data Engineering (DE)",
      //       description:
      //         "AI tools and solutions for data engineering professionals.",
      //       icon: "Database",
      //     },
      //     {
      //       id: "data-analytics",
      //       label: "Data Analytics",
      //       description:
      //         "Analytics platforms and AI-driven insights for data analysts.",
      //       icon: "BarChart3",
      //     },
      //     {
      //       id: "data-science",
      //       label: "Data Science",
      //       description:
      //         "Advanced ML and AI solutions for data scientists.",
      //       icon: "FlaskConical",
      //     },
      //     {
      //       id: "business-intelligence",
      //       label: "Business Intelligence (BI)",
      //       description:
      //         "BI tools and dashboards powered by AI insights.",
      //       icon: "LineChart",
      //     },
      //     {
      //       id: "ai",
      //       label: "AI",
      //       description:
      //         "AI-native applications and frameworks.",
      //       icon: "Cpu",
      //     },
      //     {
      //       id: "app-development",
      //       label: "App Development",
      //       description:
      //         "AI-enhanced development tools and frameworks for app developers.",
      //       icon: "Code",
      //     },
      //   ],
      // },
    ],
  },
  // {
  //   id: "architecture",
  //   label: "AI Playbook",
  //   description:
  //     "Patterns, standards, governance, and metrics for building and scaling AI/ML solutions.",
  //   icon: Library,
  //   children: [
  //     {
  //       id: "standard-services",
  //       label: "Standard Services",
  //       description:
  //         "Standard Azure and AI services mapped to common enterprise use cases, providing a quick reference for solution architects.",
  //     },
  //     {
  //       id: "reference-architectures",
  //       label: "Reference Architectures",
  //       description:
  //         "Reusable architecture patterns and reference designs for common AI/ML solution scenarios.",
  //     },
  //     {
  //       id: "ai-landing-zone",
  //       label: "AI Landing Zone",
  //       description:
  //         "Enterprise-ready landing zone setup for AI/ML workloads including networking, identity, and resource organization.",
  //     },
  //     {
  //       id: "governance-security",
  //       label: "Governance & Security",
  //       description:
  //         "Governance frameworks and security best practices to ensure compliant, safe, and responsible AI/ML solutions.",
  //     },
  //     {
  //       id: "monitoring-alerting",
  //       label: "Monitoring & Alerting",
  //       description:
  //         "Best practices for monitoring AI/ML pipelines, model performance, infrastructure health, and setting up actionable alerts.",
  //     },
  //     {
  //       id: "versioning-standards",
  //       label: "Versioning Standards",
  //       description:
  //         "Standards and strategies for versioning models, datasets, and code to ensure reproducibility and traceability.",
  //     },
  //     {
  //       id: "use-case-architectures",
  //       label: "Use Case Architectures",
  //       description:
  //         "Detailed architecture diagrams and patterns for existing and planned AI use cases across domains.",
  //     },
  //     {
  //       id: "key-metrics",
  //       label: "Key Metrics",
  //       description:
  //         "Define and track key metrics to measure outcomes, success, and ROI of AI/ML solutions.",
  //     },
  //   ],
  // },
  {
    id: "case-studies",
    label: "Case Studies",
    description: "Real-world examples and success stories showcasing our AI solutions in action.",
    icon: BookOpen,
    children: [
      // Add children as needed
    ],
  },
  /* Knowledge Hub commented out
  {
    id: "knowledge-hub",
    label: "Knowledge Hub",
    description: "Architecture patterns, decision guides, and evaluation frameworks for AI solutions.",
    icon: Library,
    children: [
      {
        id: "kb-architectures",
        label: "Architectures",
        description: "Browse solution architectures categorized by complexity tier.",
      },
      {
        id: "kb-decision-guide",
        label: "Decision Guide",
        description: "Choose the right architecture tier for your use case.",
      },
      {
        id: "kb-eval-framework",
        label: "Eval Framework",
        description: "Evaluate AI solutions with a structured scoring framework.",
      },
      {
        id: "kb-sdlc",
        label: "Agentic SDLC",
        description: "AI agents mapped across the software delivery lifecycle.",
      },
    ],
  },
  */
  // AI Advisor commented out
  // {
  //   id: "ai-advisor",
  //   label: "AI Advisor",
  //   description: "Describe a business problem and find the best matching AI solutions.",
  //   icon: Search,
  //   children: [
  //     {
  //       id: "advisor-search",
  //       label: "Search",
  //       description: "Find AI solutions by describing your business problem.",
  //     },
  //   ],
  // },
  // Leaderboard commented out
  // {
  //   id: "leaderboard",
  //   label: "Leaderboard",
  //   description: "Top contributors driving AI adoption across the platform.",
  //   icon: Trophy,
  //   children: [],
  // },
];
