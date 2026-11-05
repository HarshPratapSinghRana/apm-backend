import agentsData from "@/data/agents.json";

/**
 * Flat agent (use-case) lookup utilities.
 *
 * Every agent already has a stable, URL-safe `id` in agents.json
 * (e.g. "voice-faq-agent", "automated-customer-service"). We use that id
 * directly as the route slug — `/agents/:agentSlug` — so deep links,
 * bookmarks and refresh all resolve to the same agent without any
 * additional mapping table to keep in sync.
 */

export interface AgentUseCase {
  id: string;
  title: string;
  description: string;
  key_features?: string[];
  impact?: string;
  has_video?: boolean;
  has_code?: boolean;
  github_repo?: string;
  architecture?: string;
  component?: string;
  maturity?: string;
  [key: string]: unknown;
}

export interface ResolvedAgent {
  useCase: AgentUseCase;
  domainId: string;
  domainName: string;
}

const DOMAINS = (agentsData as { domains: any[] }).domains;

/** Resolve an agent by its slug (== use-case id). Returns null if not found. */
export function getAgentBySlug(slug: string | undefined | null): ResolvedAgent | null {
  if (!slug) return null;
  for (const domain of DOMAINS) {
    const uc = (domain.use_cases ?? []).find((u: AgentUseCase) => u.id === slug);
    if (uc) {
      return { useCase: uc as AgentUseCase, domainId: domain.id, domainName: domain.domain };
    }
  }
  return null;
}

/** All agents flattened, in declaration order. */
export function getAllAgents(): ResolvedAgent[] {
  const out: ResolvedAgent[] = [];
  for (const domain of DOMAINS) {
    for (const uc of domain.use_cases ?? []) {
      out.push({ useCase: uc as AgentUseCase, domainId: domain.id, domainName: domain.domain });
    }
  }
  return out;
}

/** Convenience: the canonical route path for an agent. */
export function agentPath(slug: string): string {
  return `/agents/${slug}`;
}
