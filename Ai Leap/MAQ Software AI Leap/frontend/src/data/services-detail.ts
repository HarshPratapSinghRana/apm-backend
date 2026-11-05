export interface ServiceCapability {
  title: string;
  description: string;
}

export interface ServiceOutcome {
  title: string;
  description: string;
  icon: string; // lucide icon name
}

export interface ServiceCaseStudy {
  title: string;
  url: string;
}

export interface ServiceInsight {
  title: string;
  url: string;
}

export interface ServiceDetail {
  id: string;
  name: string;
  tagline: string;
  heroDescription: string;
  capabilities: ServiceCapability[];
  outcomes: ServiceOutcome[];
  caseStudies: ServiceCaseStudy[];
  insights: ServiceInsight[];
  relatedProducts: { name: string; url: string }[];
  ctaLabel: string;
  ctaUrl: string;
}

export const servicesDetail: Record<string, ServiceDetail> = {
  "agentic-ai-ml": {
    id: "agentic-ai-ml",
    name: "Agentic AI & Machine Learning",
    tagline: "Automate and Innovate",
    heroDescription:
      "Unlock hidden patterns and automate tasks with agentic AI and machine learning. Create innovative solutions using advanced LLM models.",
    capabilities: [
      {
        title: "Agentic AI",
        description:
          "Harness advanced LLM models to create innovative solutions, from content generation to automated design. Build autonomous AI agents that reason, plan, and execute complex tasks.",
      },
      {
        title: "Advanced Analytics",
        description:
          "Apply sophisticated statistical and machine learning techniques to uncover patterns, predict outcomes, and drive data-backed strategic decisions.",
      },
      {
        title: "Intelligent Automation",
        description:
          "Automate complex business processes using AI-powered workflows that learn, adapt, and improve over time - reducing manual effort and errors.",
      },
      {
        title: "MLOps",
        description:
          "Implement robust ML operations pipelines for model training, deployment, monitoring, and lifecycle management to ensure reliable AI in production.",
      },
    ],
    outcomes: [
      {
        title: "Enhanced Decision-Making",
        description:
          "Use AI-driven insights to make smarter, data-backed decisions that propel your business forward.",
        icon: "BrainCircuit",
      },
      {
        title: "Automated Efficiency",
        description:
          "Automate repetitive tasks with intelligent systems, freeing up resources for more strategic initiatives.",
        icon: "Workflow",
      },
      {
        title: "Innovation Acceleration",
        description:
          "Accelerate your innovation cycles by integrating cutting-edge AI and ML technologies into your business processes.",
        icon: "Rocket",
      },
    ],
    caseStudies: [
      {
        title: "Modernizing the software development lifecycle with GitHub Copilot",
        url: "https://blog.maqsoftware.com/2025/11/modernizing-software-development.html",
      },
      {
        title: "Scaling AI for every customer and every developer with MAQ Software",
        url: "https://blog.maqsoftware.com/2025/08/scaling-ai-for-every-customer-and-every.html",
      },
      {
        title: "Reshaping industries with agentic AI solutions",
        url: "https://blog.maqsoftware.com/2025/08/reshaping-industries-with-agentic-ai.html",
      },
      {
        title: "Empowering self-service using Custom Copilot agent with Power BI Embedded",
        url: "https://blog.maqsoftware.com/2025/03/empowering-self-service-using-custom.html",
      },
    ],
    insights: [
      {
        title: "Empowering businesses with AI: Frameworks that deliver results",
        url: "https://blog.maqsoftware.com/2024/08/empowering-businesses-with-ai.html",
      },
      {
        title: "Building a secure Copilot: Addressing key security challenges",
        url: "https://blog.maqsoftware.com/2024/08/building-secure-copilot-addressing-key.html",
      },
      {
        title: "Designing UI for Copilot: Key principles and practices",
        url: "https://blog.maqsoftware.com/2024/08/designing-ui-for-copilot-key-principles.html",
      },
    ],
    relatedProducts: [
      { name: "AI-DataLens", url: "https://maqsoftware.com/AI-DataLens" },
      { name: "MigrateFAST", url: "https://maqsoftware.com/migrateFAST" },
    ],
    ctaLabel: "Get Started",
    ctaUrl: "https://maqsoftware.com/services/artificial-intelligence-and-machine-learning",
  },

  "data-analytics": {
    id: "data-analytics",
    name: "Data & Analytics",
    tagline: "Data-Driven Insights",
    heroDescription:
      "Transform your data into strategic insights for business growth. Modernize your platform and build a roadmap for data-driven success.",
    capabilities: [
      {
        title: "Data & Analytics Strategy",
        description:
          "Develop a comprehensive data strategy aligned with your business goals. Identify key data sources, establish governance frameworks, and create a roadmap for data-driven success.",
      },
      {
        title: "Data Modernization using Microsoft Fabric",
        description:
          "Migrate and modernize your data estate with Microsoft Fabric - unifying data engineering, analytics, and governance in a single platform.",
      },
      {
        title: "Real-Time Intelligence using Microsoft Fabric",
        description:
          "Implement real-time data streaming and intelligence pipelines using Microsoft Fabric for instant insights and event-driven decision-making.",
      },
      {
        title: "Data Migration",
        description:
          "Seamlessly migrate data across platforms and cloud environments with minimal downtime, ensuring data integrity and compliance throughout.",
      },
      {
        title: "Platform Optimization",
        description:
          "Optimize your existing data platforms for performance, cost efficiency, and scalability to maximize ROI on your data infrastructure.",
      },
    ],
    outcomes: [
      {
        title: "Optimized Data Usage",
        description:
          "Unlock the full potential of your data with tailored analytics strategies that drive informed decision-making and business growth.",
        icon: "Database",
      },
      {
        title: "Boundless Scalability",
        description:
          "Scale your data operations effortlessly, ensuring your analytics capabilities grow alongside your business demands.",
        icon: "TrendingUp",
      },
      {
        title: "Increase in Efficiency",
        description:
          "Streamline processes and reduce manual efforts, resulting in increased productivity and faster time-to-insight.",
        icon: "Zap",
      },
    ],
    caseStudies: [
      {
        title: "Enhancing event information access with Copilot technology",
        url: "https://blog.maqsoftware.com/2024/08/streamlining-event-information-access.html",
      },
      {
        title: "Increasing efficiency by switching from batch processing to real-time streaming",
        url: "https://blog.maqsoftware.com/2024/07/increasing-efficiency-by-switching-from.html",
      },
      {
        title: "Streamlining information retrieval with AI Copilots",
        url: "https://blog.maqsoftware.com/2024/07/streamlining-information-retrieval-with.html",
      },
      {
        title: "Optimizing task management with smart recommendations",
        url: "https://blog.maqsoftware.com/2024/06/optimizing-task-management-with-smart.html",
      },
    ],
    insights: [
      {
        title: "Microsoft Fabric Feature for Real-time Analytics",
        url: "https://blog.maqsoftware.com/2024/05/microsoft-fabric-features-for-real-time.html",
      },
      {
        title: "Embracing the Future of Data Management with Microsoft Fabric: A Setup Guide",
        url: "https://blog.maqsoftware.com/2023/11/embracing-future-of-data-management.html",
      },
      {
        title: "Optimize your Power BI Reports and Usage with LoadFAST",
        url: "https://blog.maqsoftware.com/2024/03/transform-your-power-bi.html",
      },
    ],
    relatedProducts: [
      { name: "EmbedFAST", url: "https://maqsoftware.com/embedFAST" },
      { name: "LoadFAST", url: "https://maqsoftware.com/loadFAST" },
      { name: "CertyFAST", url: "https://maqsoftware.com/certyFAST" },
    ],
    ctaLabel: "Get Started",
    ctaUrl: "https://maqsoftware.com/services/data-and-analytics",
  },

  "reporting-visualization": {
    id: "reporting-visualization",
    name: "Reporting & Visualization",
    tagline: "Powerful Visualizations",
    heroDescription:
      "Turn complex data into actionable insights with custom reporting and visualization. Make data clear and accessible for all stakeholders.",
    capabilities: [
      {
        title: "Data Visualization",
        description:
          "Transform raw data into compelling visuals. Our data visualization services help you communicate complex insights clearly, making data accessible and actionable for all stakeholders.",
      },
      {
        title: "Migration to Power BI",
        description:
          "Seamlessly migrate your existing reports and dashboards to Power BI, leveraging its rich visualization capabilities and enterprise-grade scalability.",
      },
      {
        title: "Power BI Embedding",
        description:
          "Embed interactive Power BI reports and dashboards directly into your applications for a unified analytics experience.",
      },
      {
        title: "Performance Optimization",
        description:
          "Optimize Power BI report performance through query tuning, data model optimization, and capacity management for fast, reliable dashboards.",
      },
    ],
    outcomes: [
      {
        title: "Data Clarity",
        description:
          "Achieve clear, actionable insights with powerful visualizations that simplify complex data for better understanding.",
        icon: "Eye",
      },
      {
        title: "Faster Decision-Making",
        description:
          "Enable quicker decision-making by providing stakeholders with real-time, easy-to-understand data visualizations.",
        icon: "Timer",
      },
      {
        title: "Improved Data Accessibility",
        description:
          "Ensure that critical insights are easily accessible to everyone in your organization, fostering a data-driven culture.",
        icon: "Users",
      },
    ],
    caseStudies: [
      {
        title: "Real-time reporting for an organic supermarket chain",
        url: "https://blog.maqsoftware.com/2022/06/real-time-reporting-for-organic.html",
      },
      {
        title: "Improve Power BI Premium Report Performance and Eliminate Data Refresh Failures",
        url: "https://blog.maqsoftware.com/2019/07/improve-power-bi-premium-report.html",
      },
      {
        title: "Custom Gantt Chart Improves B2B Communication",
        url: "https://blog.maqsoftware.com/2019/03/custom-gantt-chart-improves-b2b.html",
      },
      {
        title: "Custom Visual Allows Travel Company to Analyze Flight Performance",
        url: "https://blog.maqsoftware.com/2018/09/case-study-custom-visual-allows-travel.html",
      },
    ],
    insights: [
      {
        title: "Microsoft Fabric Feature for Real-time Analytics",
        url: "https://blog.maqsoftware.com/2024/05/microsoft-fabric-features-for-real-time.html",
      },
      {
        title: "Embracing the Future of Data Management with Microsoft Fabric: A Setup Guide",
        url: "https://blog.maqsoftware.com/2023/11/embracing-future-of-data-management.html",
      },
      {
        title: "Optimize your Power BI Reports and Usage with LoadFAST",
        url: "https://blog.maqsoftware.com/2024/03/transform-your-power-bi.html",
      },
    ],
    relatedProducts: [
      { name: "EmbedFAST", url: "https://maqsoftware.com/embedFAST" },
      { name: "LoadFAST", url: "https://maqsoftware.com/loadFAST" },
      { name: "CertyFAST", url: "https://maqsoftware.com/certyFAST" },
      { name: "MigrateFAST", url: "https://maqsoftware.com/migrateFAST" },
    ],
    ctaLabel: "Get Started",
    ctaUrl: "https://maqsoftware.com/services/reporting-and-visualization",
  },
};
