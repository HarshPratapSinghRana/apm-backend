import { FC } from "react";
import {
  ArrowRight,
  Globe,
  Lock,
  Zap,
  Clock,
  CheckCircle2,
  Copy,
} from "lucide-react";

const apis = [
  {
    id: "text-analysis",
    title: "Text Analysis API",
    description:
      "Perform sentiment analysis, entity extraction, key phrase extraction, and language detection on any text input. Supports 50+ languages.",
    version: "v3.2",
    status: "Stable",
    auth: "API Key / OAuth 2.0",
    latency: "~80ms",
    rateLimit: "1,000 req/min",
    endpoint: "POST /api/v3/text/analyze",
    tags: ["NLP", "Sentiment", "Entities"],
  },
  {
    id: "document-extraction",
    title: "Document Extraction API",
    description:
      "Extract structured data from invoices, receipts, contracts, and forms. Returns JSON with field-level confidence scores.",
    version: "v2.1",
    status: "Stable",
    auth: "API Key",
    latency: "~1.2s",
    rateLimit: "200 req/min",
    endpoint: "POST /api/v2/documents/extract",
    tags: ["Document AI", "OCR", "Extraction"],
  },
  {
    id: "embeddings",
    title: "Embeddings API",
    description:
      "Generate high-dimensional vector embeddings for text, images, or code. Optimized for semantic search and RAG applications.",
    version: "v1.5",
    status: "Stable",
    auth: "API Key / OAuth 2.0",
    latency: "~45ms",
    rateLimit: "5,000 req/min",
    endpoint: "POST /api/v1/embeddings/generate",
    tags: ["Embeddings", "Vector Search", "RAG"],
  },
  {
    id: "chat-completion",
    title: "Chat Completion API",
    description:
      "Enterprise-grade chat completion endpoint with system prompts, function calling, structured outputs, and content filtering built-in.",
    version: "v4.0",
    status: "Stable",
    auth: "OAuth 2.0",
    latency: "~500ms",
    rateLimit: "500 req/min",
    endpoint: "POST /api/v4/chat/completions",
    tags: ["LLM", "Chat", "Function Calling"],
  },
  {
    id: "image-analysis",
    title: "Image Analysis API",
    description:
      "Classify images, detect objects, read text (OCR), and generate descriptions. Supports batch processing of up to 20 images per request.",
    version: "v2.0",
    status: "Beta",
    auth: "API Key",
    latency: "~350ms",
    rateLimit: "300 req/min",
    endpoint: "POST /api/v2/images/analyze",
    tags: ["Vision", "OCR", "Classification"],
  },
  {
    id: "code-generation",
    title: "Code Generation API",
    description:
      "Generate, refactor, and explain code across 15+ programming languages. Includes inline documentation generation and test scaffolding.",
    version: "v1.0",
    status: "Beta",
    auth: "OAuth 2.0",
    latency: "~800ms",
    rateLimit: "200 req/min",
    endpoint: "POST /api/v1/code/generate",
    tags: ["Code", "Generation", "Refactoring"],
  },
];

export const ApisGrid: FC = () => (
  <div className="space-y-6 animate-leap-fade-in-up">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 cards-grid-symmetric">
      {apis.map((api, i) => (
        <div
          key={api.id}
          className="domain-card p-6 h-full group cursor-pointer overflow-hidden"
          style={{ animationDelay: `${i * 80}ms`, animation: "fadeInUp 0.6s ease-out both" }}
        >
          <div className="flex flex-col h-full relative z-10">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                    api.status === "Stable" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>{api.status}</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">{api.version}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
              </div>

              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Globe className="w-7 h-7 text-primary" />
              </div>
            </div>

            <div className="flex flex-col justify-between flex-1">
              <div>
                <h3 className="text-lg font-bold text-card-foreground mb-2 group-hover:text-primary transition-colors">{api.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3 line-clamp-2">{api.description}</p>

                {/* Endpoint */}
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border mb-3 font-mono text-[11px] text-foreground">
                  <code className="flex-1 truncate">{api.endpoint}</code>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>

              <div className="mt-4">
                {/* Metadata */}
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" /> {api.latency}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="w-3 h-3" /> {api.rateLimit}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Lock className="w-3 h-3" /> {api.auth.split(" / ")[0]}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {api.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-500" />
        </div>
      ))}
    </div>
  </div>
);
