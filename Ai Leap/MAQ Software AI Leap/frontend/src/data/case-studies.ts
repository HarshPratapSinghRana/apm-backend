export type CaseStudyCategory =
  | "All"
  | "Agentic AI & Machine Learning"
  | "Data & Analytics"
  | "Reporting & Visualization"
  | "Application Modernization"
  | "Cloud Optimization"
  | "Security";

export interface CaseStudy {
  id: string;
  title: string;
  url: string;
  category: CaseStudyCategory;
}

export const caseStudyCategories: CaseStudyCategory[] = [
  "All",
  "Agentic AI & Machine Learning",
  "Data & Analytics",
  "Reporting & Visualization",
  "Application Modernization",
  "Cloud Optimization",
  "Security",
];

export const caseStudies: CaseStudy[] = [
  // ── Agentic AI & Machine Learning ──
  {
    id: "cs-1",
    title: "Transforming AI interest into adoption by establishing an AI Center of Excellence",
    url: "https://blog.maqsoftware.com/2026/02/transforming-ai-interest-into-adoption.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-2",
    title: "Accelerating software development with agentic AI solutions",
    url: "https://blog.maqsoftware.com/2026/02/accelerating-software-development-with.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-3",
    title: "Reinventing legal operations with agentic AI solutions",
    url: "https://blog.maqsoftware.com/2026/02/reinventing-legal-operations-with.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-4",
    title: "Transforming finance with agentic AI solutions",
    url: "https://blog.maqsoftware.com/2026/02/transforming-finance-with-agentic-ai.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-5",
    title: "Reshaping retail with Agentic AI solutions",
    url: "https://blog.maqsoftware.com/2026/02/reshaping-retail-with-agentic-ai.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-6",
    title: "Modernizing the software development lifecycle with GitHub Copilot",
    url: "https://blog.maqsoftware.com/2025/11/modernizing-software-development.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-7",
    title: "Scaling AI for every customer and every developer with MAQ Software",
    url: "https://blog.maqsoftware.com/2025/08/scaling-ai-for-every-customer-and-every.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-8",
    title: "Delivering personalization intelligence with MLOps and Databricks CI/CD framework",
    url: "https://blog.maqsoftware.com/2025/08/delivering-personalization-intelligence.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-9",
    title: "Reshaping industries with agentic AI solutions",
    url: "https://blog.maqsoftware.com/2025/08/reshaping-industries-with-agentic-ai.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-10",
    title: "Get ideas to code from months to hours with DevelopFAST",
    url: "https://blog.maqsoftware.com/2025/07/streamlining-developer-productivity.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-11",
    title: "Empowering self-service using Custom Copilot agent with Power BI Embedded",
    url: "https://blog.maqsoftware.com/2025/03/empowering-self-service-using-custom.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-12",
    title: "Enhancing demand forecasting and planning with AI foundation model on Microsoft Azure",
    url: "https://blog.maqsoftware.com/2025/03/enhancing-demand-forecasting-and.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-13",
    title: "Revolutionizing demand forecasting and planning with AI foundation model on Microsoft Azure",
    url: "https://blog.maqsoftware.com/2025/03/revolutionizing-demand-forecasting-and.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-14",
    title: "Automating product feature categorization with AI for an automotive components manufacturer",
    url: "https://blog.maqsoftware.com/2024/10/optimizing-product-feature.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-15",
    title: "Transforming data management in manufacturing with an AI-driven chatbot solution",
    url: "https://blog.maqsoftware.com/2024/09/transforming-data-management-in.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-16",
    title: "Improving event experience for thousands using AI Agents",
    url: "https://blog.maqsoftware.com/2024/08/streamlining-event-information-access.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-17",
    title: "Building a secure Copilot: Addressing key security challenges",
    url: "https://blog.maqsoftware.com/2024/08/building-secure-copilot-addressing-key.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-18",
    title: "Designing UI for Copilot: Key principles and practices",
    url: "https://blog.maqsoftware.com/2024/08/designing-ui-for-copilot-key-principles.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-19",
    title: "Empowering businesses with AI: Frameworks that deliver results",
    url: "https://blog.maqsoftware.com/2024/08/empowering-businesses-with-ai.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-20",
    title: "Streamlining information retrieval with AI Copilots",
    url: "https://blog.maqsoftware.com/2024/07/streamlining-information-retrieval-with.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-21",
    title: "Harnessing generative AI for tailored marketing: Personalized content clusters for every account",
    url: "https://blog.maqsoftware.com/2024/07/harnessing-generative-ai-for-tailored.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-22",
    title: "Optimizing task management with smart recommendations",
    url: "https://blog.maqsoftware.com/2024/06/optimizing-task-management-with-smart.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-23",
    title: "Harnessing real-time data insights with a versatile bot application",
    url: "https://blog.maqsoftware.com/2023/09/harnessing-real-time-data-insights-with.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-24",
    title: "Accurately Forecast Customer Sales with Machine Learning (ML)",
    url: "https://blog.maqsoftware.com/2021/12/machine-learning-sales-forecast.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-25",
    title: "Millions of Arizona Citizens Receive Benefits With the Help of an AI-powered Chatbot",
    url: "https://blog.maqsoftware.com/2021/05/chatbot-for-arizona-government.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-26",
    title: "Resolve Support Tickets Faster with Predictive Risk Algorithms",
    url: "https://blog.maqsoftware.com/2020/12/resolve-support-tickets-faster-with.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-27",
    title: "Boosting Black Friday Sales with AI",
    url: "https://blog.maqsoftware.com/2018/11/boosting-black-friday-sales.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-28",
    title: "Reducing Customer Support Time with Machine Learning",
    url: "https://blog.maqsoftware.com/2018/11/reducing-customer-support-time-with.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-29",
    title: "AI Recommendation System Streamlines Purchases",
    url: "https://blog.maqsoftware.com/2018/08/case-study-ai-recommendation-system.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-30",
    title: "Generating Sales Leads with AI",
    url: "https://blog.maqsoftware.com/2018/08/case-study-generating-sales-leads-with.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-31",
    title: "AI Video Analysis Evaluates Real-Time Emotions From Facial Expressions",
    url: "https://blog.maqsoftware.com/2018/07/case-study-ai-video-analysis-evaluates.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-32",
    title: "Machine Learning Drives Support Ticket Prioritization",
    url: "https://blog.maqsoftware.com/2019/06/machine-learning-drives-support-ticket.html",
    category: "Agentic AI & Machine Learning",
  },
  {
    id: "cs-33",
    title: "Master Data Management (MDM) Improves Customer Relationships with Machine Learning",
    url: "https://blog.maqsoftware.com/2018/11/master-data-management-mdm-improves.html",
    category: "Agentic AI & Machine Learning",
  },

  // ── Data & Analytics ──
  {
    id: "cs-34",
    title: "Unifying disconnected data systems using Microsoft Fabric and OneLake",
    url: "https://blog.maqsoftware.com/2026/01/unifying-disconnected-data-systems.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-35",
    title: "Delivering accurate business intelligence insights with a Fabric data agent",
    url: "https://blog.maqsoftware.com/2026/01/delivering-accurate-business.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-36",
    title: "Building scalable e-commerce product recommendations with Microsoft Fabric SQL",
    url: "https://blog.maqsoftware.com/2025/09/building-scalable-e-commerce-product.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-37",
    title: "Optimizing data refresh by integrating Snowflake iceberg tables with Microsoft Fabric",
    url: "https://blog.maqsoftware.com/2025/08/optimizing-data-refresh-by-integrating.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-38",
    title: "Unlocking business insights: Integrating Databricks with Power BI",
    url: "https://blog.maqsoftware.com/2025/08/unlocking-business-insights-integrating.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-39",
    title: "Unlocking advanced analytics with Databricks",
    url: "https://blog.maqsoftware.com/2025/07/unlocking-advanced-analytics-with.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-40",
    title: "Migrating to Microsoft Fabric to Unlock One Source of Truth (OSOT)",
    url: "https://blog.maqsoftware.com/2025/07/migrating-to-microsoft-fabric-to-unlock.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-41",
    title: "Transforming grocery retail analytics with Microsoft Fabric",
    url: "https://blog.maqsoftware.com/2025/07/transforming-analytics-with-microsoft.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-42",
    title: "Enabling sales insights for global operations with Power BI and Snowflake",
    url: "https://blog.maqsoftware.com/2025/06/enabling-sales-insights-for-global.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-43",
    title: "Optimizing data management by integrating Snowflake and Microsoft Fabric",
    url: "https://blog.maqsoftware.com/2025/03/optimizing-data-management-by.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-44",
    title: "Transforming supply chain analytics with Power BI on Snowflake for a specialty retailer",
    url: "https://blog.maqsoftware.com/2025/03/transforming-supply-chain-analytics.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-45",
    title: "Enabling self-service for supply chain analytics with Microsoft Fabric and Direct Lake",
    url: "https://blog.maqsoftware.com/2024/11/Microsoft-Fabric-Direct-Lake.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-46",
    title: "Transforming data operations with Microsoft Fabric and CI/CD for ISVs",
    url: "https://blog.maqsoftware.com/2024/11/microsoft-fabric-isv-cicd.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-47",
    title: "Real-Time Intelligence in Microsoft Fabric for ISVs",
    url: "https://blog.maqsoftware.com/2024/11/microsoft-fabric-rti.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-48",
    title: "Unifying data management with a centralized framework",
    url: "https://blog.maqsoftware.com/2024/08/unifying-data-management-with.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-49",
    title: "Increasing efficiency by switching from batch processing to real-time streaming",
    url: "https://blog.maqsoftware.com/2024/07/increasing-efficiency-by-switching-from.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-50",
    title: "Microsoft Fabric Features for Real-Time Analytics",
    url: "https://blog.maqsoftware.com/2024/05/microsoft-fabric-features-for-real-time.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-51",
    title: "Enabling real-time visibility: How a retail leader transformed Direct Store Delivery with Microsoft Fabric",
    url: "https://blog.maqsoftware.com/2024/05/enabling-real-time-visibility-how.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-52",
    title: "Simplifying Data Ingestion with IngestFAST",
    url: "https://blog.maqsoftware.com/2024/04/simplifying-data-ingestion-with.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-53",
    title: "Embracing the Future of Data Management with Microsoft Fabric: A Setup Guide",
    url: "https://blog.maqsoftware.com/2023/11/embracing-future-of-data-management.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-54",
    title: "Microsoft Fabric: Powering Real-Time Analytics for Retailers",
    url: "https://blog.maqsoftware.com/2023/11/microsoft-fabric-powering-real-time.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-55",
    title: "Microsoft Fabric: Empowering All Personas",
    url: "https://blog.maqsoftware.com/2023/09/microsoft-fabric-empowering.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-56",
    title: "ADX implementation in the Energy and Utilities industry",
    url: "https://blog.maqsoftware.com/2023/06/adx-implementation-for-energy-and.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-57",
    title: "Modern Data Analytics using Microsoft Fabric",
    url: "https://blog.maqsoftware.com/2023/06/modern-data-analytics-using-microsoft.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-58",
    title: "ADX implementation in the Real Estate industry",
    url: "https://blog.maqsoftware.com/2022/11/adx-implementation-real-estate.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-59",
    title: "ADX implementation for a global Cloud Management Software Provider",
    url: "https://blog.maqsoftware.com/2022/11/adx-implementation-cloud-management-software-provider.html",
    category: "Data & Analytics",
  },
  {
    id: "cs-60",
    title: "Data Validation Framework Reduces Support Tickets",
    url: "https://blog.maqsoftware.com/2019/06/case-study-data-validation-framework.html",
    category: "Data & Analytics",
  },

  // ── Reporting & Visualization ──
  {
    id: "cs-61",
    title: "Modernizing retail business intelligence with Microsoft Fabric and Power BI",
    url: "https://blog.maqsoftware.com/2025/12/modernizing-retail-business.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-62",
    title: "Delivering embedded Power BI reporting with EmbedFAST",
    url: "https://blog.maqsoftware.com/2025/07/delivering-embedded-power-bi-reporting.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-63",
    title: "Accelerating data-driven decisions with AI-DataLens",
    url: "https://blog.maqsoftware.com/2025/07/accelerating-data-driven-decisions-with.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-64",
    title: "Transitioning legacy reports from Qlik to Power BI",
    url: "https://blog.maqsoftware.com/2025/06/transitioning-legacy-reports-from-qlik.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-65",
    title: "Enhancing retail sales reporting by migrating from MicroStrategy to Power BI",
    url: "https://blog.maqsoftware.com/2025/06/improving-retail-sales-reporting-by.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-66",
    title: "Improving sales insights with a migration from SAP BOBJ to Power BI",
    url: "https://blog.maqsoftware.com/2025/06/improving-sales-insights-with-migration.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-67",
    title: "Accelerate your Tableau to Power BI (Fabric) migration with MigrateFAST",
    url: "https://blog.maqsoftware.com/2025/03/accelerate-your-tableau-to-power-bi.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-68",
    title: "Simplifying Power BI integration for the automotive industry using EmbedFAST",
    url: "https://blog.maqsoftware.com/2024/10/simplifying-power-bi-integration-for.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-69",
    title: "Modernizing reporting platforms through AI-driven SQL Migration",
    url: "https://blog.maqsoftware.com/2024/08/modernizing-reporting-platforms-through.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-70",
    title: "Optimize your Power BI Reports and Usage with LoadFAST",
    url: "https://blog.maqsoftware.com/2024/03/transform-your-power-bi.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-71",
    title: "Building a Powerful Foundation: The Ultimate Guide to Power BI Center of Excellence",
    url: "https://blog.maqsoftware.com/2023/12/building-powerful-foundation-ultimate.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-72",
    title: "Everything You Need to Know About Migrating to Power BI",
    url: "https://blog.maqsoftware.com/2020/06/everything-you-need-to-know-about.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-73",
    title: "Transforming customer support with AIOps-driven Power BI embedding",
    url: "https://blog.maqsoftware.com/2023/02/transforming-customer-support-with.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-74",
    title: "Real-time reporting for an organic supermarket chain",
    url: "https://blog.maqsoftware.com/2022/06/real-time-reporting-for-organic.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-75",
    title: "Improving insights and reducing costs through unified reporting",
    url: "https://blog.maqsoftware.com/2022/07/improving-insights-and-reducing-costs.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-76",
    title: "Enhancing fintech analytics to provide millions of borrowers with better loan options",
    url: "https://blog.maqsoftware.com/2022/06/enhancing-fintech-analytics-to-provide.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-77",
    title: "Enabling Fast-Paced BI and Analytics",
    url: "https://blog.maqsoftware.com/2020/11/azure-fast-paced-bi-analytics.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-78",
    title: "Digitize Rhythm of Business (ROB) with a Power BI to PowerPoint Tool",
    url: "https://blog.maqsoftware.com/2020/10/automated-powerpoint-deck-creation.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-79",
    title: "Modernize Reporting with Power BI: A Cost-Effective, Scalable Solution",
    url: "https://blog.maqsoftware.com/2020/07/qlikview-to-power-bi-migration.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-80",
    title: "Improve Power BI Premium Report Performance and Eliminate Data Refresh Failures",
    url: "https://blog.maqsoftware.com/2019/07/improve-power-bi-premium-report.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-81",
    title: "Custom Visual Allows Travel Company to Analyze Flight Performance",
    url: "https://blog.maqsoftware.com/2018/09/case-study-custom-visual-allows-travel.html",
    category: "Reporting & Visualization",
  },
  {
    id: "cs-82",
    title: "Custom Gantt Chart Improves B2B Communication",
    url: "https://blog.maqsoftware.com/2019/03/custom-gantt-chart-improves-b2b.html",
    category: "Reporting & Visualization",
  },

  // ── Application Modernization ──
  {
    id: "cs-83",
    title: "Maximizing the power of Dynamics 365: User interface & user experience redesigned",
    url: "https://blog.maqsoftware.com/2024/03/maximizing-power-of-dynamics-365-user.html",
    category: "Application Modernization",
  },
  {
    id: "cs-84",
    title: "Empowering retail growth with an optimized loyalty program",
    url: "https://blog.maqsoftware.com/2024/02/empowering-retail-growth-with-optimized.html",
    category: "Application Modernization",
  },
  {
    id: "cs-85",
    title: "Improving lead management and campaign optimization with Microsoft technologies",
    url: "https://blog.maqsoftware.com/2024/02/improving-lead-management-and-campaign.html",
    category: "Application Modernization",
  },
  {
    id: "cs-86",
    title: "Create a Single Source of Truth with Dynamics 365",
    url: "https://blog.maqsoftware.com/2020/12/dynamics-365-single-source-of-truth.html",
    category: "Application Modernization",
  },
  {
    id: "cs-87",
    title: "Accurately Forecast Inventory Needs Using a Custom Plug-in",
    url: "https://blog.maqsoftware.com/2020/10/inventory-management-excel-plug-in.html",
    category: "Application Modernization",
  },
  {
    id: "cs-88",
    title: "Complete Tasks Faster with a Custom Dynamic Checklist in Dynamics 365",
    url: "https://blog.maqsoftware.com/2020/10/dynamic-checklist-dynamics-365.html",
    category: "Application Modernization",
  },
  {
    id: "cs-89",
    title: "Connect High-Impact Service Opportunities with Underutilized Support Team Resources",
    url: "https://blog.maqsoftware.com/2020/10/track-resource-allocation-power-platform.html",
    category: "Application Modernization",
  },
  {
    id: "cs-90",
    title: "Ensure Business Continuity Through Covid-19 Remote Work",
    url: "https://blog.maqsoftware.com/2020/07/promoting-business-continuity-through.html",
    category: "Application Modernization",
  },
  {
    id: "cs-91",
    title: "Ease Event Management with Power Apps",
    url: "https://blog.maqsoftware.com/2020/04/optical-character-recognition-event.html",
    category: "Application Modernization",
  },
  {
    id: "cs-92",
    title: "Simplify Software Health Checks with a Downloadable Application",
    url: "https://blog.maqsoftware.com/2019/11/engineering-insights-wpf-application.html",
    category: "Application Modernization",
  },
  {
    id: "cs-93",
    title: "Easily Search Through Large Data Collections With Azure Architecture",
    url: "https://blog.maqsoftware.com/2019/09/engineering-insights-azure-search-based.html",
    category: "Application Modernization",
  },
  {
    id: "cs-94",
    title: "Reduce Costs by Automating Privacy Matters",
    url: "https://blog.maqsoftware.com/2019/07/case-study-reducing-costs-by-automating.html",
    category: "Application Modernization",
  },
  {
    id: "cs-95",
    title: "Integrating SharePoint Portals",
    url: "https://blog.maqsoftware.com/2018/11/integrating-sharepoint-portals.html",
    category: "Application Modernization",
  },
  {
    id: "cs-96",
    title: "Events Management Software Tracks Conference Performance",
    url: "https://blog.maqsoftware.com/2018/11/events-management-software-tracks.html",
    category: "Application Modernization",
  },
  {
    id: "cs-97",
    title: "Save Time with an Integrated Marketing Campaign Platform",
    url: "https://blog.maqsoftware.com/2018/11/save-time-with-integrated-marketing.html",
    category: "Application Modernization",
  },
  {
    id: "cs-98",
    title: "Software Company Monitors Global Affairs via Cloud-Based Policy Portal",
    url: "https://blog.maqsoftware.com/2018/07/case-study-software-company-monitors.html",
    category: "Application Modernization",
  },
  {
    id: "cs-99",
    title: "Retailer Reduces Costs by Automating Customer Feedback",
    url: "https://blog.maqsoftware.com/2018/07/case-study-retailer-reduces-costs-by.html",
    category: "Application Modernization",
  },

  // ── Cloud Optimization ──
  {
    id: "cs-100",
    title: "Modernize Data Systems by Migrating to the Cloud",
    url: "https://blog.maqsoftware.com/2020/09/modernize-data-cloud-migration.html",
    category: "Cloud Optimization",
  },

  // ── Security ──
  {
    id: "cs-101",
    title: "Strengthening cybersecurity with Managed Identity and RBAC",
    url: "https://blog.maqsoftware.com/2024/08/strengthening-cybersecurity.html",
    category: "Security",
  },
];
