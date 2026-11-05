export interface ProductBenefit {
  title: string;
  description: string;
  icon: string; // lucide icon name
}

export interface ProductFeature {
  title: string;
  description: string;
}

export interface ProductStep {
  step: number;
  title: string;
  description: string;
}

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  highlights: string[];
}

export interface ProductDetail {
  id: string;
  name: string;
  tagline: string;
  heroDescription: string;
  benefits: ProductBenefit[];
  features: ProductFeature[];
  steps: ProductStep[];
  pricing?: PricingTier[];
  ctaLabel: string;
  ctaUrl: string;
  gradient: string; // tailwind gradient classes
}

import { productCategories } from "@/data/product-categories";

// CTA for "flattened" product-category cards (AI/ML + Generative AI use cases).
const GENERATED_CTA_URL = "https://maq-ai-ml-platform.azurewebsites.net/#/Industries/Automotive";
const GENERATED_CTA_LABEL = "Learn more";

const benefitIcons = ["CheckCircle2", "Zap", "ShieldCheck", "Search", "Sparkles", "BrainCircuit"];

const toGeneratedProductDetail = (args: {
  categoryId: string;
  categoryLabel: string;
  item: { id: string; title: string; description: string; key_features: string[]; impact: string };
}): ProductDetail => {
  const { categoryLabel, item } = args;
  // Use the same "red" (theme primary) gradient everywhere for flattened cards.
  const gradient = "from-primary to-primary/70";

  const benefitCount = Math.min(3, item.key_features.length);
  const benefits: ProductBenefit[] = item.key_features.slice(0, benefitCount).map((feature, i) => ({
    title: feature,
    description: item.impact,
    icon: benefitIcons[i % benefitIcons.length],
  }));

  const features: ProductFeature[] = item.key_features.map((feature) => ({
    title: feature,
    description: `Capability: ${feature}`,
  }));

  const steps: ProductStep[] = [
    {
      step: 1,
      title: "Explore the workflow",
      description: "Review the core capabilities and supported scenarios for this solution.",
    },
    {
      step: 2,
      title: "Connect your data or inputs",
      description: "Integrate the required sources (documents, tickets, logs, or knowledge bases).",
    },
    {
      step: 3,
      title: "Deploy and iterate",
      description: "Roll out to users, capture feedback, and improve results over time.",
    },
  ];

  return {
    id: item.id,
    name: item.title,
    tagline: categoryLabel,
    heroDescription: item.description,
    benefits,
    features,
    steps,
    ctaLabel: GENERATED_CTA_LABEL,
    ctaUrl: GENERATED_CTA_URL,
    gradient,
  };
};

const generatedProductDetails: Record<string, ProductDetail> = Object.fromEntries(
  productCategories.flatMap((category) =>
    category.products.map((item) => [
      item.id,
      toGeneratedProductDetail({
        categoryId: category.id,
        categoryLabel: category.label,
        item,
      }),
    ])
  )
);

const baseProductsDetail: Record<string, ProductDetail> = {
  datalens: {
    id: "datalens",
    name: "AI-DataLens",
    tagline: "Intelligent Data Interaction",
    heroDescription:
      "Transform how users interact with data by enabling natural language queries and delivering instant, intelligent insights. AI-DataLens lets you chat with structured data, generate automated visuals, and get AI-powered narrative insights - all without writing a single query.",
    benefits: [
      {
        title: "Informed Decisions",
        description:
          "Make smarter, data-driven decisions faster with instant natural language insights from your structured data.",
        icon: "BrainCircuit",
      },
      {
        title: "Streamlined Operations",
        description:
          "Reduce manual data processing overhead by enabling anyone to query, visualize, and understand data effortlessly.",
        icon: "Workflow",
      },
      {
        title: "Plug-and-Play Extensibility",
        description:
          "Integrate AI-DataLens with your existing data platforms and BI tools using flexible APIs and connectors.",
        icon: "Puzzle",
      },
    ],
    features: [
      {
        title: "Chat with Structured Data",
        description:
          "Ask questions in plain English and get accurate answers from your databases and spreadsheets instantly.",
      },
      {
        title: "User Guidance",
        description:
          "Intelligent prompts and suggestions guide users toward meaningful data exploration paths.",
      },
      {
        title: "Semantic Relevance",
        description:
          "Advanced NLP ensures semantically accurate query interpretation for precise data retrieval.",
      },
      {
        title: "Automated Visual Generation",
        description:
          "Automatically creates the most appropriate charts and graphs based on your query results.",
      },
      {
        title: "Insight Generation",
        description:
          "AI-powered narrative insights explain data trends, anomalies, and patterns in plain language.",
      },
      {
        title: "Metadata Agent & Column Pruning",
        description:
          "Intelligent metadata agents optimize query performance by pruning irrelevant columns automatically.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Connect Your Data",
        description:
          "Link your structured data sources - databases, spreadsheets, or data warehouses - to AI-DataLens.",
      },
      {
        step: 2,
        title: "Ask Questions Naturally",
        description:
          "Type your data questions in plain English. AI-DataLens translates them into optimized queries.",
      },
      {
        step: 3,
        title: "Get Instant Insights",
        description:
          "Receive auto-generated visuals, narrative summaries, and actionable insights in seconds.",
      },
    ],
    ctaLabel: "Explore AI-DataLens",
    ctaUrl: "https://maqsoftware.com/AI-DataLens",
    gradient: "from-primary to-primary/70",
  },

  embedfast: {
    id: "embedfast",
    name: "EmbedFAST",
    tagline: "Effortless Power BI Embedding",
    heroDescription:
      "Effortlessly embed Power BI into your apps without writing code. Achieve faster time to market with seamless integration, fully customizable APIs, simplified access control, scalable architecture, and automatic updates.",
    benefits: [
      {
        title: "Seamless Integration",
        description:
          "Embed Power BI reports and dashboards into your applications with minimal effort and zero custom code.",
        icon: "Layers",
      },
      {
        title: "Fully Customizable",
        description:
          "Tailor the embedded experience with flexible APIs that match your brand and application design.",
        icon: "Palette",
      },
      {
        title: "Cut Licensing Costs",
        description:
          "Reduce Power BI licensing overhead by leveraging efficient embedding strategies and shared capacity.",
        icon: "BadgeDollarSign",
      },
      {
        title: "Simplified Access Control",
        description:
          "Manage user permissions and row-level security without complex configuration or custom middleware.",
        icon: "ShieldCheck",
      },
      {
        title: "Scalable & Secure",
        description:
          "Enterprise-grade security and auto-scaling ensure reliable performance at any user volume.",
        icon: "ServerCog",
      },
      {
        title: "Automatic Updates",
        description:
          "Reports and data refresh automatically, ensuring your embedded analytics always show the latest insights.",
        icon: "RefreshCcw",
      },
    ],
    features: [
      {
        title: "No-Code Embedding",
        description:
          "Embed Power BI reports into any web application without writing a single line of custom code.",
      },
      {
        title: "White-Label Ready",
        description:
          "Fully brand and customize the embedded Power BI experience to match your application's look and feel.",
      },
      {
        title: "Row-Level Security",
        description:
          "Enforce data access policies at the row level, ensuring each user sees only their authorized data.",
      },
      {
        title: "API-First Architecture",
        description:
          "RESTful APIs allow programmatic control over embedding, filtering, and navigation.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Connect Your Reports",
        description:
          "Link your Power BI workspace and select the reports you want to embed in your application.",
      },
      {
        step: 2,
        title: "Configure Access",
        description:
          "Set up user roles, permissions, and row-level security policies for embedded content.",
      },
      {
        step: 3,
        title: "Embed & Customize",
        description:
          "Integrate the embedding component into your app and customize the look, filters, and interactivity.",
      },
    ],
    pricing: [
      {
        name: "API Only",
        price: "$2,500/mo",
        description: "EmbedFAST API access for custom integrations.",
        highlights: [
          "Full API access",
          "Row-level security",
          "Auto refresh",
          "Email support",
        ],
      },
      {
        name: "API + UI",
        price: "$3,500/mo",
        description: "Complete solution with hosted UI and API access.",
        highlights: [
          "Everything in API Only",
          "Pre-built UI components",
          "White-label customization",
          "Priority support",
        ],
      },
      {
        name: "Code Share",
        price: "$250,000",
        description: "Full source code ownership for enterprise deployment.",
        highlights: [
          "Complete source code",
          "Self-hosted deployment",
          "Unlimited customization",
          "Dedicated onboarding",
        ],
      },
    ],
    ctaLabel: "Get Started with EmbedFAST",
    ctaUrl: "https://maqsoftware.com/embedFAST",
    gradient: "from-primary to-primary/70",
  },

  certyfast: {
    id: "certyfast",
    name: "CertyFAST",
    tagline: "Power BI Quality Assurance",
    heroDescription:
      "Streamline Power BI model development with automated error detection, DAX measure formatting, and simplified documentation. CertyFAST ensures top-quality reports and adherence to best practices, eliminating manual review overhead.",
    benefits: [
      {
        title: "Automate Review",
        description:
          "Automatically detect errors, inconsistencies, and best-practice violations across your Power BI models.",
        icon: "ScanSearch",
      },
      {
        title: "Error-Free Reporting",
        description:
          "Catch formatting issues, broken references, and DAX errors before publishing reports to production.",
        icon: "ShieldCheck",
      },
      {
        title: "Accurate Uniform Reports",
        description:
          "Enforce consistent naming conventions, formatting standards, and documentation across all reports.",
        icon: "FileCheck",
      },
    ],
    features: [
      {
        title: "Automated Error Detection",
        description:
          "Scan Power BI models for calculation errors, broken references, and performance issues automatically.",
      },
      {
        title: "DAX Formatting",
        description:
          "Auto-format DAX measures for consistency and readability across your entire data model.",
      },
      {
        title: "Best Practice Validation",
        description:
          "Validate models against a curated set of Power BI best practices and industry standards.",
      },
      {
        title: "Documentation Generation",
        description:
          "Auto-generate comprehensive model documentation including measures, relationships, and data sources.",
      },
      {
        title: "Batch Processing",
        description:
          "Analyze multiple Power BI files simultaneously for large-scale quality assurance.",
      },
      {
        title: "GitHub Integration",
        description:
          "Download and integrate CertyFAST directly from GitHub into your CI/CD pipeline.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Analyze Report",
        description:
          "Upload your Power BI file (.pbix) and CertyFAST automatically scans every aspect of your model.",
      },
      {
        step: 2,
        title: "Review Insights",
        description:
          "Get a detailed breakdown of errors, warnings, and improvement suggestions organized by severity.",
      },
      {
        step: 3,
        title: "Optimize & Deploy",
        description:
          "Apply fixes, format DAX measures, generate documentation, and deploy with confidence.",
      },
    ],
    ctaLabel: "Download from GitHub",
    ctaUrl: "https://maqsoftware.com/certyFAST",
    gradient: "from-primary to-primary/70",
  },

  loadfast: {
    id: "loadfast",
    name: "LoadFAST",
    tagline: "Power BI Performance Optimization",
    heroDescription:
      "Optimize your Power BI environments for greater efficiency and lower costs. LoadFAST helps you identify ideal capacity setups, track user interactions, simulate real-world usage, and analyze system performance at scale.",
    benefits: [
      {
        title: "Optimize Capacity",
        description:
          "Identify the ideal Power BI capacity configuration for your workload to maximize performance and minimize costs.",
        icon: "Gauge",
      },
      {
        title: "Manage Collections",
        description:
          "Organize and manage test collections across environments for comprehensive load testing coverage.",
        icon: "FolderOpen",
      },
      {
        title: "Track User Interactions",
        description:
          "Record and replay real user interaction patterns to accurately simulate production workloads.",
        icon: "MousePointerClick",
      },
      {
        title: "Automate Accuracy",
        description:
          "Run automated load tests that faithfully replicate real-world usage for reliable results.",
        icon: "Bot",
      },
      {
        title: "Analyze Performance",
        description:
          "Get detailed performance metrics, bottleneck identification, and optimization recommendations.",
        icon: "BarChart3",
      },
      {
        title: "Simulate Real Usage",
        description:
          "Create realistic load simulations that mirror your actual user behavior patterns and data volumes.",
        icon: "Users",
      },
    ],
    features: [
      {
        title: "Load Test Collections",
        description:
          "Create, organize, and manage collections of load tests for different Power BI environments and scenarios.",
      },
      {
        title: "User Interaction Recording",
        description:
          "Capture real user interactions with Power BI reports to replay as realistic load test scenarios.",
      },
      {
        title: "Capacity Recommendations",
        description:
          "AI-driven recommendations for optimal Power BI capacity sizing based on your workload patterns.",
      },
      {
        title: "Performance Dashboards",
        description:
          "Rich visual dashboards showing load test results, performance trends, and optimization opportunities.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Create Collection",
        description:
          "Set up a test collection by connecting to your Power BI environment and selecting reports to test.",
      },
      {
        step: 2,
        title: "Define User Actions",
        description:
          "Record or configure user interaction patterns including page views, filter changes, and drill-throughs.",
      },
      {
        step: 3,
        title: "Get Results",
        description:
          "Run the load test and receive detailed performance reports with capacity optimization recommendations.",
      },
    ],
    pricing: [
      {
        name: "Free",
        price: "$0 + Azure costs",
        description: "Get started with basic load testing capabilities.",
        highlights: [
          "Basic load testing",
          "Up to 5 concurrent users",
          "Performance reports",
          "Community support",
        ],
      },
      {
        name: "Pro",
        price: "$1,500 + Azure costs",
        description: "Full-featured load testing for enterprise teams.",
        highlights: [
          "Unlimited concurrent users",
          "Advanced analytics",
          "Capacity recommendations",
          "Priority support",
        ],
      },
    ],
    ctaLabel: "Try LoadFAST",
    ctaUrl: "https://maqsoftware.com/loadFAST",
    gradient: "from-primary to-primary/70",
  },

  migratefast: {
    id: "migratefast",
    name: "MigrateFAST",
    tagline: "Accelerate Fabric Migration",
    heroDescription:
      "Accelerate your migration journey to Microsoft Fabric. MigrateFAST simplifies large-scale data and reporting platform migration - from Tableau to Power BI - with AI-powered tools that deliver up to 40% cost savings.",
    benefits: [
      {
        title: "Large-Scale Migration",
        description:
          "Handle enterprise-scale migrations with automated inventory analysis, mapping, and conversion tools.",
        icon: "ArrowRightLeft",
      },
      {
        title: "40% Cost Savings",
        description:
          "Reduce migration costs significantly through automation, eliminating manual conversion and rework.",
        icon: "PiggyBank",
      },
      {
        title: "AI-Powered Optimization",
        description:
          "Leverage AI to optimize converted reports, models, and data flows for Microsoft Fabric's architecture.",
        icon: "Sparkles",
      },
    ],
    features: [
      {
        title: "Inventory Analysis",
        description:
          "Automatically catalog and analyze all existing reports, data sources, and dependencies for migration planning.",
      },
      {
        title: "Effort Estimation",
        description:
          "AI-driven complexity scoring and effort estimation for each migration item to plan resources accurately.",
      },
      {
        title: "Automated Conversion",
        description:
          "Convert Tableau workbooks, data models, and calculated fields to Power BI equivalents automatically.",
      },
      {
        title: "Governance Framework",
        description:
          "Built-in governance and compliance checks ensure migrated assets meet organizational standards.",
      },
      {
        title: "Center of Excellence",
        description:
          "Establish a migration Center of Excellence with templates, best practices, and reusable patterns.",
      },
      {
        title: "Progress Tracking",
        description:
          "Real-time migration dashboards track progress, blockers, and completion across all workstreams.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Inventory Analysis",
        description:
          "Scan and catalog your existing Tableau environment including reports, data sources, and user access.",
      },
      {
        step: 2,
        title: "Estimation & Planning",
        description:
          "Get AI-powered effort estimates and a prioritized migration roadmap for all discovered assets.",
      },
      {
        step: 3,
        title: "Model Creation",
        description:
          "Automatically convert data models, calculations, and visualizations to Power BI format.",
      },
      {
        step: 4,
        title: "Review & Validate",
        description:
          "Compare converted reports with originals for accuracy, performance, and visual fidelity.",
      },
      {
        step: 5,
        title: "Governance Setup",
        description:
          "Configure governance policies, access controls, and compliance rules for the migrated environment.",
      },
      {
        step: 6,
        title: "Center of Excellence",
        description:
          "Establish a CoE with documentation, training, and ongoing support for the migrated platform.",
      },
    ],
    ctaLabel: "Start Your Migration",
    ctaUrl: "https://maqsoftware.com/migrateFAST",
    gradient: "from-primary to-primary/70",
  },

  /* ─── Retail Pulse ─── */
  "retail-pulse": {
    id: "retail-pulse",
    name: "Retail Pulse",
    tagline: "AI-Powered Retail Analytics",
    heroDescription:
      "An AI-powered retail analytics agent that monitors store performance, tracks sales trends, and delivers real-time actionable insights to optimize operations and boost revenue across your retail network.",
    benefits: [
      {
        title: "Real-Time Store Monitoring",
        description:
          "Track live store performance metrics including footfall, conversion rates, and basket sizes across all locations.",
        icon: "Activity",
      },
      {
        title: "Sales Trend Analysis",
        description:
          "Identify sales patterns, seasonal trends, and product performance to make data-driven merchandising decisions.",
        icon: "TrendingUp",
      },
      {
        title: "Actionable Insights",
        description:
          "Receive AI-generated recommendations to optimize pricing, inventory levels, and promotional strategies.",
        icon: "Lightbulb",
      },
      {
        title: "Multi-Store Visibility",
        description:
          "Compare performance across locations and regions with unified dashboards and automated benchmarking.",
        icon: "BarChart3",
      },
    ],
    features: [
      {
        title: "Intelligent Sales Forecasting",
        description:
          "AI-driven forecasting models that predict sales volumes, demand patterns, and revenue projections with high accuracy.",
      },
      {
        title: "Inventory Optimization",
        description:
          "Automated stock-level monitoring and reorder recommendations to prevent stockouts and reduce overstock costs.",
      },
      {
        title: "Customer Behavior Analytics",
        description:
          "Analyze shopping patterns, dwell times, and purchase journeys to enhance store layouts and customer experience.",
      },
      {
        title: "Promotional Impact Measurement",
        description:
          "Measure the ROI of promotions and campaigns in real time, with A/B testing insights and attribution modeling.",
      },
      {
        title: "Automated Reporting",
        description:
          "Schedule and distribute daily, weekly, and monthly performance reports to stakeholders automatically.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Connect Data Sources",
        description:
          "Integrate your POS systems, inventory databases, and e-commerce platforms with Retail Pulse.",
      },
      {
        step: 2,
        title: "Configure Metrics & KPIs",
        description:
          "Define the key performance indicators and thresholds that matter most to your retail operations.",
      },
      {
        step: 3,
        title: "Monitor & Optimize",
        description:
          "View real-time dashboards, receive AI-driven alerts, and take action on recommendations to boost performance.",
      },
    ],
    ctaLabel: "View on Marketplace",
    ctaUrl: "https://marketplace.microsoft.com/en-us/product/WA200010029",
    gradient: "from-primary to-primary/70",
  },

  /* ─── Responsible AI Agent ─── */
  "rai-agent": {
    id: "rai-agent",
    name: "Responsible AI Agent",
    tagline: "Automated AI Governance & Compliance",
    heroDescription:
      "The RAI Agent is an automated solution designed to help organizations implement Responsible AI standards across their AI systems. It provides continuous, context-aware guidance, evaluation, and mitigation to ensure AI outputs remain aligned with legal, ethical, and organizational requirements.",
    benefits: [
      {
        title: "Ethical AI Compliance",
        description:
          "Ensures AI systems comply with legal and ethical standards, supporting governance, auditing, and regulatory compliance for AI models.",
        icon: "Scale",
      },
      {
        title: "Reduced Risk Exposure",
        description:
          "Reduces exposure to harmful, misleading, or unsafe content generated by AI systems through automated oversight.",
        icon: "ShieldCheck",
      },
      {
        title: "Automated Oversight",
        description:
          "Provides developers and enterprises with automated oversight for AI deployments — no manual review bottleneck.",
        icon: "Eye",
      },
      {
        title: "Developer-Friendly SDK",
        description:
          "Python SDK (maqraisdk) for reviewing and updating prompts and generating test cases for faster Copilot development with RAI compliance.",
        icon: "Code",
      },
    ],
    features: [
      {
        title: "Harmful Content Detection",
        description:
          "Identifies prompts that could produce illegal or unsafe content, including hate speech, violence, or abusive material.",
      },
      {
        title: "Groundedness Verification",
        description:
          "Checks that AI responses are supported by credible input sources, reducing ungrounded or misleading outputs.",
      },
      {
        title: "Jailbreak Mitigation",
        description:
          "Detects attempts to bypass AI safeguards or instructions and prevents the generation of risky content.",
      },
      {
        title: "Cross-Prompt Injection Protection (XPIA)",
        description:
          "Guards against malicious instructions embedded in user or system inputs that could manipulate AI behavior.",
      },
      {
        title: "Test Case Generation",
        description:
          "Automatically generates test cases to validate AI behavior against Responsible AI standards before deployment.",
      },
      {
        title: "Prompt Review & Update",
        description:
          "Reviews existing prompts for compliance risks and suggests updates to align with responsible AI best practices.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Install the SDK",
        description:
          "Install the maqraisdk Python package and configure it with your AI platform credentials.",
      },
      {
        step: 2,
        title: "Review & Generate Tests",
        description:
          "Run automated prompt reviews and generate comprehensive test cases for your AI system's prompts and outputs.",
      },
      {
        step: 3,
        title: "Monitor & Mitigate",
        description:
          "Deploy continuous monitoring for harmful content, jailbreak attempts, and prompt injection — with real-time mitigation.",
      },
    ],
    ctaLabel: "View on Marketplace",
    ctaUrl: "https://marketplace.microsoft.com/en-us/product/maqsoftware.rai_agent?tab=Overview",
    gradient: "from-primary to-primary/70",
  },
};

export const productsDetail: Record<string, ProductDetail> = {
  ...baseProductsDetail,
  ...generatedProductDetails,
};
