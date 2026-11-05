import { FC, useState } from "react";
import {
  ArrowRight,
  ThumbsUp,
  Clock,
  ExternalLink,
  Beaker,
  MessageSquare,
  TrendingUp,
  Lightbulb,
  Users,
  Tag,
} from "lucide-react";

/* ─── Research Papers ────────────────────────────────── */

const papers = [
  {
    id: "r1",
    title: "Scaling Retrieval-Augmented Generation for Enterprise Knowledge Bases",
    abstract:
      "We present a novel approach to scaling RAG systems across terabyte-scale enterprise knowledge bases, achieving 3x faster retrieval with 15% higher relevance scores compared to baseline vector search approaches.",
    authors: ["Dr. Sarah Chen", "Alex Kim", "Jordan Lee"],
    date: "Jan 2026",
    category: "Information Retrieval",
    citations: 24,
    tags: ["RAG", "Vector Search", "Enterprise"],
  },
  {
    id: "r2",
    title: "Multi-Agent Orchestration Patterns for Complex Business Workflows",
    abstract:
      "This paper introduces four orchestration patterns for multi-agent systems in enterprise settings: sequential, parallel, hierarchical, and consensus-based. We benchmark each pattern across 12 real-world business workflows.",
    authors: ["Marcus Thompson", "Emily Zhang"],
    date: "Dec 2025",
    category: "Agent Systems",
    citations: 41,
    tags: ["Multi-Agent", "Orchestration", "Workflows"],
  },
  {
    id: "r3",
    title: "Reducing Hallucinations in Domain-Specific LLM Applications",
    abstract:
      "We propose a grounding framework combining retrieval verification, confidence calibration, and structured output constraints that reduces hallucination rates by 78% in financial and legal domains.",
    authors: ["Priya Kapoor", "Tom Wilson", "Dr. Sarah Chen"],
    date: "Feb 2026",
    category: "LLM Safety",
    citations: 18,
    tags: ["Hallucination", "Grounding", "Safety"],
  },
  {
    id: "r4",
    title: "Cost-Optimized Fine-Tuning Strategies for Enterprise LLMs",
    abstract:
      "A comprehensive study of parameter-efficient fine-tuning methods (LoRA, QLoRA, Adapters) applied to enterprise use cases, demonstrating 90% cost reduction while maintaining 97% of full fine-tuning performance.",
    authors: ["James Rodriguez", "Nina Patel"],
    date: "Nov 2025",
    category: "Model Training",
    citations: 56,
    tags: ["Fine-Tuning", "LoRA", "Cost Optimization"],
  },
];

export const ResearchGrid: FC = () => (
  <div className="space-y-8 animate-leap-fade-in-up">
    <div className="text-center">
      <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">
        AI <span className="text-gradient">Research</span>
      </h2>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        Published papers, benchmarks, and findings from our internal AI research lab
      </p>
    </div>
    <div className="space-y-4">
      {papers.map((p, i) => (
        <div
          key={p.id}
          className="domain-card p-6 group cursor-pointer"
          style={{ animationDelay: `${i * 80}ms`, animation: "fadeInUp 0.6s ease-out both" }}
        >
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary">{p.category}</span>
                <span className="text-[10px] text-muted-foreground">{p.date}</span>
              </div>
              <h3 className="text-lg font-bold text-card-foreground mb-2 group-hover:text-primary transition-colors">{p.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-3">{p.abstract}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span>{p.authors.join(", ")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                  ))}
                </div>
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5" /> {p.citations} citations
                </span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-1" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Prototypes Grid ────────────────────────────────── */

const prototypes = [
  {
    id: "p1",
    title: "AI Meeting Summarizer",
    description:
      "Real-time meeting transcription and summarization agent that captures action items, decisions, and follow-ups from Teams meetings automatically.",
    status: "Alpha",
    progress: 65,
    team: 3,
    techStack: ["Azure Speech", "GPT-4o", "Teams API"],
  },
  {
    id: "p2",
    title: "Smart Contract Analyzer",
    description:
      "AI-powered contract review tool that identifies risky clauses, missing terms, and deviations from standard templates in legal documents.",
    status: "Beta",
    progress: 80,
    team: 4,
    techStack: ["Azure Document Intelligence", "GPT-4o", "Semantic Kernel"],
  },
  {
    id: "p3",
    title: "Visual Anomaly Detector",
    description:
      "Computer vision system for manufacturing quality control that detects surface defects on production lines with 99.2% accuracy.",
    status: "Prototype",
    progress: 40,
    team: 2,
    techStack: ["Azure Custom Vision", "Azure IoT Edge", "ONNX Runtime"],
  },
  {
    id: "p4",
    title: "Conversational BI Dashboard",
    description:
      "Natural language interface for business intelligence - ask questions about your data in plain English and get interactive charts and insights.",
    status: "Alpha",
    progress: 55,
    team: 3,
    techStack: ["GPT-4o", "Power BI Embedded", "Azure SQL"],
  },
  {
    id: "p5",
    title: "Predictive Maintenance Agent",
    description:
      "IoT-connected agent that monitors equipment sensor data, predicts failures 48 hours in advance, and auto-schedules maintenance work orders.",
    status: "Prototype",
    progress: 30,
    team: 4,
    techStack: ["Azure IoT Hub", "Azure ML", "Time Series Insights"],
  },
  {
    id: "p6",
    title: "AI Code Review Assistant",
    description:
      "Automated code review agent that provides security analysis, performance suggestions, and best-practice recommendations on pull requests.",
    status: "Beta",
    progress: 85,
    team: 2,
    techStack: ["GPT-4o", "GitHub API", "Azure DevOps"],
  },
];

export const PrototypesGrid: FC = () => (
  <div className="space-y-8 animate-leap-fade-in-up">
    <div className="text-center">
      <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">
        AI <span className="text-gradient">Prototypes</span>
      </h2>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        Proof-of-concept demos and experimental features in early development
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 cards-grid-symmetric">
      {prototypes.map((p, i) => (
        <div
          key={p.id}
          className="domain-card p-6 group cursor-pointer overflow-hidden"
          style={{ animationDelay: `${i * 80}ms`, animation: "fadeInUp 0.6s ease-out both" }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                p.status === "Beta" ? "bg-emerald-100 text-emerald-700" :
                p.status === "Alpha" ? "bg-amber-100 text-amber-700" :
                "bg-purple-100 text-purple-700"
              }`}>{p.status}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> {p.team} members
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Beaker className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-bold text-card-foreground mb-2 group-hover:text-primary transition-colors">{p.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2">{p.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {p.techStack.map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
              ))}
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{p.progress}%</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Ideas Board ────────────────────────────────────── */

const ideas = [
  { id: "i1", title: "AI-Powered Onboarding Buddy", description: "A personalized AI companion that guides new hires through their first 90 days, answering questions, scheduling introductions, and tracking onboarding milestones.", votes: 142, comments: 23, author: "Rachel Green", category: "HR", status: "Under Review" },
  { id: "i2", title: "Intelligent Email Triage System", description: "Auto-categorize, prioritize, and draft responses for high-volume shared mailboxes using AI classification and generation.", votes: 98, comments: 15, author: "Tom Wilson", category: "Productivity", status: "Approved" },
  { id: "i3", title: "AI Expense Report Auditor", description: "Automatically audit expense reports for policy violations, duplicate submissions, and suspicious patterns before manager approval.", votes: 87, comments: 11, author: "Chris Obi", category: "Finance", status: "Under Review" },
  { id: "i4", title: "Multi-Language Support Bot", description: "Real-time translation and culturally-aware response generation for customer support across 20+ languages.", votes: 76, comments: 9, author: "Nina Patel", category: "Support", status: "In Development" },
  { id: "i5", title: "AI Slide Deck Generator", description: "Generate polished presentation decks from meeting notes, documents, or plain-text briefs with auto-generated visuals and talking points.", votes: 134, comments: 31, author: "Emily Zhang", category: "Productivity", status: "Approved" },
  { id: "i6", title: "Predictive IT Ticket Resolution", description: "Classify and route IT tickets to the right team, suggest resolutions from past tickets, and auto-resolve common issues.", votes: 65, comments: 7, author: "David Park", category: "IT", status: "Under Review" },
];

export const IdeasBoard: FC = () => (
  <div className="space-y-8 animate-leap-fade-in-up">
    <div className="text-center">
      <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">
        Innovation <span className="text-gradient">Ideas</span>
      </h2>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        Community-submitted proposals voted on and prioritized by the team
      </p>
    </div>
    <div className="space-y-4">
      {ideas.sort((a, b) => b.votes - a.votes).map((idea, i) => (
        <div
          key={idea.id}
          className="domain-card p-5 group cursor-pointer"
          style={{ animationDelay: `${i * 60}ms`, animation: "fadeInUp 0.6s ease-out both" }}
        >
          <div className="flex items-start gap-4">
            {/* Vote column */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
              <ThumbsUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-primary">{idea.votes}</span>
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                  idea.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                  idea.status === "In Development" ? "bg-blue-100 text-blue-700" :
                  "bg-amber-100 text-amber-700"
                }`}>{idea.status}</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" /> {idea.category}
                </span>
              </div>
              <h3 className="text-base font-bold text-card-foreground mb-1 group-hover:text-primary transition-colors">{idea.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-2 line-clamp-2">{idea.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>By {idea.author}</span>
                <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {idea.comments} comments</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
