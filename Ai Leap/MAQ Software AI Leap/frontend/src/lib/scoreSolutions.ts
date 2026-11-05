import agentsData from "@/data/agents.json";

export interface ScoredSolution {
  id: string;
  title: string;
  description: string;
  key_features: string[];
  impact: string;
  architecture: string;
  icon: string;
  domainId: string;
  domainName: string;
  domainIcon: string;
  score: number;
  hasDemo: boolean;
  hasCode: boolean;
  hasVideo: boolean;
  maturity?: string;
  tags?: string[];
}

export interface AdvisorResult {
  query: string;
  summary: string;
  detectedDomain: string | null;
  complexityHint: string | null;
  solutions: ScoredSolution[];
}

// Stop-words to ignore during scoring
const STOP_WORDS = new Set([
  "i", "me", "my", "we", "our", "you", "your", "it", "its", "the", "a", "an",
  "and", "or", "but", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "can", "may", "might", "shall", "to", "of", "in", "for", "on",
  "with", "at", "by", "from", "as", "into", "about", "that", "this",
  "which", "what", "how", "who", "where", "when", "not", "no", "so",
  "if", "then", "than", "too", "very", "just", "also", "more", "most",
  "need", "want", "like", "looking", "find", "get", "make", "use",
]);

// Keywords that hint at architecture preference
const ARCH_HINTS: Record<string, string[]> = {
  "No Code": ["no code", "no-code", "nocode", "without coding", "zero code", "non-technical", "business user", "drag and drop", "citizen developer", "simple", "easy"],
  "Low Code": ["low code", "low-code", "lowcode", "minimal coding", "minimal code", "some code", "little code", "power platform", "power automate"],
  "Pro Code": ["pro code", "pro-code", "procode", "full code", "custom code", "developer", "engineering", "python", "api", "sdk", "microservices", "docker", "kubernetes"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function detectComplexityHint(query: string): string | null {
  const lower = query.toLowerCase();
  for (const [arch, keywords] of Object.entries(ARCH_HINTS)) {
    if (keywords.some((kw) => lower.includes(kw))) return arch;
  }
  return null;
}

function detectDomain(queryTokens: string[]): string | null {
  const domainKeywords: Record<string, string[]> = {};
  for (const d of agentsData.domains) {
    domainKeywords[d.id] = [
      d.domain.toLowerCase(),
      ...tokenize(d.description),
    ];
  }

  let bestDomain: string | null = null;
  let bestCount = 0;
  for (const [domainId, keywords] of Object.entries(domainKeywords)) {
    const count = queryTokens.filter((t) => keywords.includes(t)).length;
    if (count > bestCount) {
      bestCount = count;
      bestDomain = domainId;
    }
  }
  return bestCount >= 1 ? bestDomain : null;
}

function generateSummary(query: string, detectedDomain: string | null, complexityHint: string | null): string {
  const parts: string[] = [];
  parts.push(`You're looking for AI solutions related to: "${query.trim()}".`);
  if (detectedDomain) {
    const domainName = agentsData.domains.find((d) => d.id === detectedDomain)?.domain;
    if (domainName) parts.push(`This appears most relevant to the **${domainName}** domain.`);
  }
  if (complexityHint) {
    parts.push(`Your preference leans toward **${complexityHint}** solutions.`);
  }
  return parts.join(" ");
}

interface UseCaseExtra {
  tags?: string[];
  component?: string;
  has_code?: boolean;
  has_video?: boolean;
  maturity?: string;
  featured?: boolean;
}

export function scoreSolutions(query: string): AdvisorResult {
  const queryTokens = tokenize(query);
  const complexityHint = detectComplexityHint(query);
  const detectedDomain = detectDomain(queryTokens);

  const allSolutions: ScoredSolution[] = [];

  for (const domain of agentsData.domains) {
    for (const _uc of domain.use_cases) {
      const uc = _uc as typeof _uc & UseCaseExtra;
      // Build a text corpus for this use case
      const corpus = [
        uc.title,
        uc.description,
        ...(uc.key_features || []),
        uc.impact || "",
        ...(uc.tags || []),
        domain.domain,
      ]
        .join(" ")
        .toLowerCase();

      const corpusTokens = tokenize(corpus);

      // Score: count how many unique query tokens appear in corpus
      let matchCount = 0;
      let weightedScore = 0;
      const matchedTokens = new Set<string>();

      for (const qt of queryTokens) {
        // Exact match
        if (corpusTokens.includes(qt)) {
          matchedTokens.add(qt);
          matchCount++;
          weightedScore += 1;
        } else {
          // Partial / substring match (e.g. "automat" matches "automation")
          const partial = corpusTokens.some(
            (ct) => ct.includes(qt) || qt.includes(ct)
          );
          if (partial) {
            matchedTokens.add(qt);
            matchCount++;
            weightedScore += 0.5;
          }
        }
      }

      // Title match bonus (2x weight)
      const titleTokens = tokenize(uc.title);
      for (const qt of queryTokens) {
        if (titleTokens.includes(qt)) weightedScore += 1.5;
      }

      // Domain match bonus
      if (detectedDomain === domain.id) weightedScore += 2;

      // Architecture preference bonus
      if (complexityHint && uc.architecture === complexityHint) weightedScore += 3;

      // Store raw weighted score (normalize later relative to best match)
      if (weightedScore > 0) {
        allSolutions.push({
          id: uc.id,
          title: uc.title,
          description: uc.description,
          key_features: uc.key_features || [],
          impact: uc.impact || "",
          architecture: uc.architecture || "Pro Code",
          icon: uc.icon || "Bot",
          domainId: domain.id,
          domainName: domain.domain,
          domainIcon: domain.icon,
          score: weightedScore, // raw score, will be normalized below
          hasDemo: !!uc.component,
          hasCode: !!uc.has_code,
          hasVideo: !!uc.has_video,
          maturity: uc.maturity,
          tags: uc.tags,
        });
      }
    }
  }

  // Sort by raw score descending
  allSolutions.sort((a, b) => b.score - a.score);

  // Relative normalization: best match ≈ 95%, others scaled proportionally
  if (allSolutions.length > 0) {
    const maxRaw = allSolutions[0].score;
    for (const s of allSolutions) {
      s.score = maxRaw > 0
        ? Math.max(10, Math.round((s.score / maxRaw) * 95))
        : 0;
    }
  }

  return {
    query,
    summary: generateSummary(query, detectedDomain, complexityHint),
    detectedDomain,
    complexityHint,
    solutions: allSolutions,
  };
}
