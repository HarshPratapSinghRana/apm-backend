export interface ProductItem {
  id: string;
  title: string;
  description: string;
  key_features: string[];
  impact: string;
  video_url: string;
}

export interface ProductCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  products: ProductItem[];
}

export const productCategories: ProductCategory[] = [
  {
    id: "generative-ai-gpt",
    label: "Generative AI",
    description:
      "Generative AI, powered by cutting-edge models like GPT, revolutionizes artificial intelligence by enabling machines to generate novel, human-like content across various domains. Includes advanced AI and machine learning solutions leveraging computer vision, deep learning, and intelligent knowledge management to drive innovation and operational efficiency.",
    icon: "Sparkles",
    products: [
      // Generative AI products
      {
        id: "session-information-bot",
        title: "Session Information Bot",
        description:
          "The Session Information Bot optimizes information retrieval from past sessions, offering quick access, contextual search, and interactive user experiences. It enhances knowledge management, streamlining support processes and fostering improved collaboration within organizations.",
        key_features: [
          "Quick and accurate retrieval of information from stored data",
          "Contextual search for user queries to reduce search time",
          "Interactive UI experience to engage users while exploring content",
          "Video content retrieval with relevant timestamps",
          "Results include supporting sources like video links or documents",
        ],
        impact:
          "Accelerated onboarding and training for new hires, enhanced data analysis and research capabilities, efficient project management, heightened employee engagement, and improved knowledge sharing and collaboration.",
        video_url: "",
      },
      // ... (all other generative ai products here)
      {
        id: "feedback-summarizer-bot",
        title: "Feedback Summarizer Bot",
        description:
          "Your go-to for consolidating feedback into actionable insights. With its knack for condensing diverse feedback sources, it's your shortcut to informed decision-making. Swiftly analyzes and summarizes customer feedback, streamlining responses and improving product development.",
        key_features: [
          "Automatic categorization and summarization of feedback data",
          "Chatbot service for interacting with feedback data",
          "Criteria-based feedback insight retrieval",
          "Sentiment analysis and product type classification",
          "Quick identification of key insights and areas for improvement",
        ],
        impact:
          "Enhanced customer experience, informed decision-making through historical insights, streamlined problem-solving, improved efficiency via optimized information retrieval, and elevated customer satisfaction through faster support.",
        video_url: "",
      },
      // ... (all other generative ai products here)
      // AI & ML products
      {
        id: "intelligent-knowledge-base-bot",
        title: "Intelligent Knowledge Base Bot",
        description:
          "Unlock the power of data with our AI-powered Knowledge Base Bot. Experience swift responses, personalized interactions, and safeguarded data confidentiality. Powered by Azure Cognitive Search, Azure Blob, Azure OpenAI, and Python, this interactive bot ensures timely and accurate responses while safeguarding sensitive data.",
        key_features: [
          "OpenAI-powered user question classification for swift responses",
          "Custom prompts for personalized interactions",
          "Engaging and interactive chat experience",
          "Contextual understanding for precise and meaningful responses",
          "Robust security measures to protect data confidentiality",
        ],
        impact:
          "Facilitated data-driven decision making through easy access to accurate information, boosted productivity with quick and accurate retrieval, fostered better teamwork through robust knowledge sharing, and achieved faster delivery providing competitive edge.",
        video_url: "",
      },
      {
        id: "smart-retail-analytics",
        title: "Smart Retail Analytics",
        description:
          "A cutting-edge solution leveraging deep learning to identify products on shelves within warehouse or retail environments. It provides real-time detection using YOLOv5, enabling precise inventory management and data-driven insights for optimized product placement and operational efficiency.",
        key_features: [
          "YOLOv5 for precise identification of beverage products (bottles and cans)",
          "Power BI dashboard with dynamic visualizations and KPI tracking",
          "Revenue optimization strategies through shelf and product placement analysis",
          "Computer Vision expertise demonstration with object detection framework",
          "Competitor analysis and shelf utilization reporting",
        ],
        impact:
          "Enhanced inventory management with reduced stockouts and minimized overstocking, improved product placement strategies, data-driven decision making for marketing and shelf layout, and operational efficiency through automation of shelf detection and analysis.",
        video_url: "",
      },
      {
        id: "smart-support-framework",
        title: "Smart Support Framework",
        description:
          "Organizations face challenges in managing support tickets efficiently, necessitating an automated solution for assigning tickets, offering prompt severity feedback, and enabling seamless collaboration among teams for effective resolution.",
        key_features: [
          "Intelligent routing of support tickets using OpenAI",
          "Contextual search ensuring fast and efficient support",
          "Automatic priority assignment and prompt communication",
          "Pattern identification and cross-team collaboration optimization",
          "Sentiment monitoring on replies for satisfactory responses",
        ],
        impact:
          "Reduced response times for support ticket requests, accurate determination of ticket severity, efficient communication and collaboration leading to quicker resolution, increased customer satisfaction and loyalty, and streamlined escalation processes.",
        video_url: "",
      },
      {
        id: "triviabot",
        title: "TriviaBot",
        description:
          "Trivia Bot transforms the challenge of gathering insights from customers in sales by offering an engaging, gamified learning experience through an interactive trivia generator tool focused on specific topics.",
        key_features: [
          "Leveraging OpenAI to engage users through interactive exploration",
          "Asking targeted questions to encourage continued exploration",
          "Extracting scores for each user and generating scorecard reports",
          "Gamified learning experience for customer engagement",
          "Efficient gathering of insights on specific topics",
        ],
        impact:
          "Increased customer engagement through a gamified experience, enhanced data collection with valuable insights, efficient reporting with scorecards, data-driven decision-making, and cost savings through automation.",
        video_url: "",
      },
      {
        id: "support-ticket-assistant",
        title: "Support Ticket Assistant",
        description:
          "Transform support operations with our automated system, ensuring faster responses and happier customers. The system streamlines processing of repetitive and predictable requests, significantly reducing response times and enhancing accuracy.",
        key_features: [
          "Azure Blob Storage for support data processing and analysis",
          "Azure Search indexing for quick and accurate information retrieval",
          "Azure OpenAI for contextual response generation",
          "Automated ticket processing and routing",
          "Integration with website and chatbot interfaces",
        ],
        impact:
          "Improved response time, improved team performance, reduced workload and costs, standardized support processes, increased customer satisfaction, and scalable support operations.",
        video_url: "",
      },
      {
        id: "sales-assistant",
        title: "Sales Assistant",
        description:
          "Accelerate sales productivity and efficiency with AI-driven client profiling, enabling personalized solutions in record time. Leverages OpenAI to ask targeted questions, gathering information on clients' priorities, challenges, goals, and risks.",
        key_features: [
          "OpenAI-powered company profile generation from targeted questions",
          "Automatic categorization for Organization values (Strategies, Goals, Industry)",
          "Data-driven use case suggestions from filtered Org dataset",
          "Rapid delivery of personalized solutions matched to business value maps",
          "Streamlined client profiling reducing time and resource requirements",
        ],
        impact:
          "Streamlined client profiling, faster personalized solutions improving response times, improved accuracy of client profiles, enhanced efficiency and productivity, and increased sales conversion leading to higher revenue.",
        video_url: "",
      },
      {
        id: "test-case-recommender",
        title: "Test Case Recommender",
        description:
          "Streamlines the software development process by recommending test cases. Uses AI to analyze code and suggest relevant test scenarios, improving coverage and reducing manual testing effort.",
        key_features: [
          "AI-powered test case generation and recommendations",
          "Automated analysis of code for test coverage gaps",
          "Intelligent suggestions based on code changes and patterns",
          "Integration with development and CI/CD workflows",
          "Prioritization of test cases based on risk and impact",
        ],
        impact:
          "Faster testing cycles, improved code quality and test coverage, reduced manual effort in test planning, early detection of potential issues, and streamlined software development process.",
        video_url: "",
      },
    ],
  },
];
