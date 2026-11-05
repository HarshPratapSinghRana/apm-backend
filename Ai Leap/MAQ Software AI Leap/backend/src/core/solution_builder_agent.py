"""
Solution Builder Agent — orchestrates specialist sub-agents to generate
architecture blueprints from a conversational chat interface.

Auto-detects the configured LLM provider from .env:
  - Azure OpenAI (AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT)
  - Gemini (GEMINI_API_KEY)
  - Ollama (OLLAMA_BASE_URL — local, no key needed)
Falls back to rule-based responses if no LLM is available.
"""

import os
import json
import logging
import uuid
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("SolutionBuilderAgent")

# ── LLM provider auto-detection ─────────────────────────────────────
_LLM_ACTIVE_SERVICE = os.getenv("LLM_ACTIVE_SERVICE", "").lower()
_llm_provider = None  # "azure_openai" | "gemini" | "ollama" | None
_llm_available = False

# Azure OpenAI
_AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_API_KEY")
_AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
_AZURE_OPENAI_MODEL = os.getenv("CHAT_GPT_MODEL", "gpt-4o")
_AZURE_OPENAI_VERSION = os.getenv("API_VERSION", "2024-02-15-preview")
_azure_client = None

# Gemini
_GEMINI_KEY = os.getenv("GEMINI_API_KEY")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")
_genai = None

# Ollama
_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL_NAME", "MFDoom/deepseek-r1-tool-calling:8b")

# Priority: explicit LLM_ACTIVE_SERVICE > Azure OpenAI > Gemini > Ollama
def _init_llm():
    global _llm_provider, _llm_available, _azure_client, _genai

    # 1. Try Azure OpenAI
    if _LLM_ACTIVE_SERVICE in ("", "azure_openai", "azure", "openai") and _AZURE_OPENAI_KEY and _AZURE_OPENAI_ENDPOINT:
        try:
            from openai import AzureOpenAI
            _azure_client = AzureOpenAI(
                api_key=_AZURE_OPENAI_KEY,
                azure_endpoint=_AZURE_OPENAI_ENDPOINT,
                api_version=_AZURE_OPENAI_VERSION,
            )
            _llm_provider = "azure_openai"
            _llm_available = True
            logger.info(f"SolutionBuilderAgent: Using Azure OpenAI ({_AZURE_OPENAI_MODEL})")
            return
        except ImportError:
            logger.warning("SolutionBuilderAgent: openai package not installed")

    # 2. Try Gemini
    if _LLM_ACTIVE_SERVICE in ("", "gemini") and _GEMINI_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=_GEMINI_KEY)
            _genai = genai
            _llm_provider = "gemini"
            _llm_available = True
            logger.info(f"SolutionBuilderAgent: Using Gemini ({_GEMINI_MODEL})")
            return
        except ImportError:
            logger.warning("SolutionBuilderAgent: google-generativeai not installed")

    # 3. Try Ollama (local, no key needed)
    if _LLM_ACTIVE_SERVICE in ("", "ollama"):
        try:
            import httpx
            _llm_provider = "ollama"
            _llm_available = True
            logger.info(f"SolutionBuilderAgent: Using Ollama ({_OLLAMA_MODEL})")
            return
        except ImportError:
            pass

    logger.warning("SolutionBuilderAgent: No LLM provider available — using rule-based fallback")

_init_llm()


async def _call_llm(system_prompt: str, user_prompt: str) -> str:
    """Call the configured LLM. Falls back to empty string."""
    if not _llm_available:
        return ""
    try:
        if _llm_provider == "azure_openai":
            response = _azure_client.chat.completions.create(
                model=_AZURE_OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=4000,
            )
            return response.choices[0].message.content.strip() if response.choices else ""

        elif _llm_provider == "gemini":
            model = _genai.GenerativeModel(
                _GEMINI_MODEL,
                system_instruction=system_prompt,
            )
            response = model.generate_content(user_prompt)
            return response.text.strip() if response.text else ""

        elif _llm_provider == "ollama":
            import httpx
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    f"{_OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": _OLLAMA_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "stream": False,
                    },
                )
                data = resp.json()
                return data.get("message", {}).get("content", "").strip()

    except Exception as e:
        logger.error(f"LLM call failed ({_llm_provider}): {e}")
        return ""


# ── Session store ───────────────────────────────────────────────────
_sessions: dict[str, dict] = {}


def _get_session(session_id: str) -> dict:
    if session_id not in _sessions:
        _sessions[session_id] = {
            "id": session_id,
            "history": [],
            "phase": "discovery",
            "problem_brief": {},
            "blueprint": {
                "architecture": None,
                "risks": None,
                "security": None,
                "costs": None,
                "plan": None,
            },
            "turn_count": 0,
        }
    return _sessions[session_id]


# ── Specialist prompts ──────────────────────────────────────────────

DISCOVERY_SYSTEM = """You are a Discovery Agent for an AI solution consulting platform.
Your job is to understand the user's business problem and extract key details.
Ask targeted follow-up questions (max 2-3 at a time) to understand:
- Business domain and industry
- What process they want to automate or improve
- Data sources (PDFs, databases, APIs, emails, etc.)
- Expected volume/scale
- Existing systems to integrate with
- Compliance/regulatory requirements
- Timeline and budget constraints

Keep responses concise and professional. Use bullet points.
After 2-3 exchanges when you have enough info, respond with a JSON block wrapped in ```json ... ``` containing:
{
  "ready": true,
  "problem_brief": {
    "domain": "...",
    "problem": "...",
    "data_sources": ["..."],
    "scale": "...",
    "integrations": ["..."],
    "compliance": ["..."],
    "constraints": "..."
  }
}
"""

ARCHITECTURE_SYSTEM = """You are an Architecture Agent specializing in agentic AI solution design.
Given a problem brief, generate a complete architecture recommendation.

Always respond with a JSON block wrapped in ```json ... ``` containing:
{
  "summary": "2-3 sentence architecture summary",
  "pattern": "sequential|parallel|hierarchical|event-driven",
  "agents": [
    {"name": "Agent Name", "role": "What it does", "llm": "gpt-4o|gemini|etc", "tools": ["tool1", "tool2"]}
  ],
  "communication": "How agents communicate",
  "technology_stack": {
    "orchestration": "Semantic Kernel|LangGraph|AutoGen",
    "llm_provider": "Azure OpenAI|Google Gemini|...",
    "storage": "Azure Blob|SQL|...",
    "deployment": "Azure App Service|AKS|..."
  },
  "mermaid": "graph TD\\n  A[User Input] --> B[Agent 1]\\n  B --> C[Agent 2]\\n  ...",
  "data_flow": "Description of how data moves through the pipeline"
}
"""

RISK_SYSTEM = """You are a Risk Assessment Agent for AI/ML solutions.
Given a problem brief and architecture, identify risks and mitigations.

Always respond with a JSON block wrapped in ```json ... ``` containing:
{
  "risks": [
    {
      "risk": "Description of the risk",
      "severity": "Critical|High|Medium|Low",
      "likelihood": "High|Medium|Low",
      "mitigation": "How to mitigate this risk"
    }
  ],
  "failure_modes": [
    {"component": "...", "failure": "...", "fallback": "..."}
  ],
  "compliance_notes": ["..."]
}
Include 5-8 risks covering: data quality, LLM hallucination, latency, cost overrun, security, compliance, integration failures.
"""

SECURITY_SYSTEM = """You are a Security Agent for AI/ML solutions.
Given a problem brief and architecture, generate security requirements.

Always respond with a JSON block wrapped in ```json ... ``` containing:
{
  "threat_model": [
    {"threat": "...", "category": "STRIDE category", "mitigation": "..."}
  ],
  "auth_requirements": "Description of auth/RBAC needs",
  "data_protection": {
    "encryption_at_rest": "...",
    "encryption_in_transit": "...",
    "pii_handling": "...",
    "log_sanitization": "..."
  },
  "prompt_security": {
    "injection_defense": "...",
    "guardrails": "...",
    "content_filtering": "..."
  },
  "checklist": ["item1", "item2", "..."]
}
"""

COST_SYSTEM = """You are a Cost Estimation Agent for AI/ML solutions.
Given a problem brief and architecture, estimate costs.

Always respond with a JSON block wrapped in ```json ... ``` containing:
{
  "token_costs": [
    {"component": "Agent/Service name", "model": "LLM model", "monthly_tokens": "estimate", "monthly_cost": "$XX"}
  ],
  "infrastructure": [
    {"service": "Azure service name", "tier": "pricing tier", "monthly_cost": "$XX"}
  ],
  "total_monthly": "$XXX",
  "total_annual": "$X,XXX",
  "roi_timeline": "X months",
  "comparison": {
    "pay_as_you_go": "$XXX/mo",
    "reserved": "$XXX/mo",
    "savings": "XX%"
  }
}
Use realistic Azure/cloud pricing. Be specific with numbers.
"""

IMPLEMENTATION_SYSTEM = """You are an Implementation Planning Agent for AI/ML solutions.
Given a problem brief and architecture, create a phased implementation plan.

Always respond with a JSON block wrapped in ```json ... ``` containing:
{
  "phases": [
    {
      "phase": "Phase 1: Foundation",
      "duration": "2 weeks",
      "tasks": ["task1", "task2", "..."],
      "deliverables": ["deliverable1", "..."]
    }
  ],
  "team_structure": [
    {"role": "AI Engineer", "count": 1, "focus": "Agent development"}
  ],
  "testing_strategy": {
    "unit": "...",
    "integration": "...",
    "eval": "...",
    "load": "..."
  },
  "go_live_checklist": ["item1", "item2", "..."],
  "total_timeline": "X weeks"
}
Keep it practical. 4-6 phases, 8-12 weeks total for most projects.
"""


# ── Agent runners ───────────────────────────────────────────────────

def _extract_json(text: str) -> Optional[dict]:
    """Extract JSON from a text response (possibly wrapped in ```json ... ```)."""
    import re
    match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    # Try parsing the whole text
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass
    return None


async def _run_discovery(session: dict, user_input: str) -> tuple[str, dict]:
    """Run discovery agent. Returns (response_text, blueprint_updates)."""
    history_text = "\n".join(
        f"{'User' if m['role'] == 'user' else 'Agent'}: {m['content']}"
        for m in session["history"][-10:]
    )
    prompt = f"Conversation so far:\n{history_text}\n\nUser: {user_input}"

    response = await _call_llm(DISCOVERY_SYSTEM, prompt)

    if not response:
        # Rule-based fallback
        turn = session["turn_count"]
        if turn == 0:
            return (
                "Welcome to the Solution Builder! I'll help you design an AI agent solution.\n\n"
                "To get started, could you tell me:\n"
                "1. **What business problem** are you trying to solve?\n"
                "2. **What industry/domain** is this for?\n"
                "3. **What data sources** will the agents work with (PDFs, databases, APIs, etc.)?",
                {},
            )
        elif turn == 1:
            return (
                "Great context! A few more questions:\n"
                "1. **What's the expected volume** (e.g., documents/day, requests/hour)?\n"
                "2. **Any existing systems** to integrate with?\n"
                "3. **Are there compliance requirements** (GDPR, HIPAA, SOC2)?",
                {},
            )
        else:
            # Auto-advance to architecture
            session["phase"] = "architecture"
            brief = {
                "domain": "General",
                "problem": user_input,
                "data_sources": ["Documents"],
                "scale": "Medium",
                "integrations": [],
                "compliance": [],
                "constraints": "",
            }
            session["problem_brief"] = brief
            return (
                "Excellent! I have enough information. Let me design your solution architecture...\n\n"
                "🔄 *Architecture Agent is now working...*",
                {},
            )

    # Check if discovery is complete
    parsed = _extract_json(response)
    if parsed and parsed.get("ready"):
        session["phase"] = "architecture"
        session["problem_brief"] = parsed.get("problem_brief", {})
        clean_response = response.split("```")[0].strip()
        if not clean_response:
            clean_response = "I have all the details I need. Let me design your solution architecture..."
        return clean_response + "\n\n🔄 *Architecture Agent is now working...*", {}

    return response, {}


async def _run_architecture(session: dict) -> tuple[str, dict]:
    """Run architecture agent."""
    brief = json.dumps(session["problem_brief"], indent=2)
    prompt = f"Problem Brief:\n{brief}\n\nGenerate a complete architecture recommendation."

    response = await _call_llm(ARCHITECTURE_SYSTEM, prompt)
    parsed = _extract_json(response) if response else None

    if not parsed:
        # Rule-based fallback
        parsed = {
            "summary": f"A multi-agent sequential pipeline for {session['problem_brief'].get('problem', 'the described use case')}.",
            "pattern": "sequential",
            "agents": [
                {"name": "Intake Agent", "role": "Receives and validates input data", "llm": "gemini-2.5-flash", "tools": ["Document Parser", "Validator"]},
                {"name": "Processing Agent", "role": "Extracts and transforms key information", "llm": "gpt-4o", "tools": ["Azure Doc Intelligence", "Data Transformer"]},
                {"name": "Analysis Agent", "role": "Analyzes extracted data and generates insights", "llm": "gpt-4o", "tools": ["SQL Connector", "Analytics Engine"]},
                {"name": "Output Agent", "role": "Formats results and delivers to downstream systems", "llm": "gemini-2.5-flash", "tools": ["Email Sender", "API Gateway"]},
            ],
            "communication": "Sequential handoff via shared state store",
            "technology_stack": {
                "orchestration": "Semantic Kernel",
                "llm_provider": "Google Gemini + Azure OpenAI",
                "storage": "Azure Blob Storage + Azure SQL",
                "deployment": "Azure App Service",
            },
            "mermaid": "graph TD\n  A[User Input] --> B[Intake Agent]\n  B --> C[Processing Agent]\n  C --> D[Analysis Agent]\n  D --> E[Output Agent]\n  E --> F[Results]",
            "data_flow": "Input documents flow through intake validation, then processing for extraction, analysis for insights, and finally output formatting.",
        }

    session["blueprint"]["architecture"] = parsed
    clean = response.split("```")[0].strip() if response else ""
    summary = parsed.get("summary", "Architecture designed.")
    msg = clean if clean else f"Here's the recommended architecture:\n\n**{summary}**\n\nPattern: **{parsed.get('pattern', 'sequential')}** with {len(parsed.get('agents', []))} agents."

    return msg + "\n\n🔄 *Risk Agent is now analyzing...*", {"architecture": parsed}


async def _run_risk(session: dict) -> tuple[str, dict]:
    """Run risk agent."""
    brief = json.dumps(session["problem_brief"], indent=2)
    arch = json.dumps(session["blueprint"]["architecture"], indent=2) if session["blueprint"]["architecture"] else "{}"
    prompt = f"Problem Brief:\n{brief}\n\nArchitecture:\n{arch}\n\nGenerate a risk assessment."

    response = await _call_llm(RISK_SYSTEM, prompt)
    parsed = _extract_json(response) if response else None

    if not parsed:
        parsed = {
            "risks": [
                {"risk": "LLM hallucination in critical outputs", "severity": "Critical", "likelihood": "Medium", "mitigation": "Structured extraction with validation layer + human review for high-stakes decisions"},
                {"risk": "Data quality issues in input documents", "severity": "High", "likelihood": "High", "mitigation": "Input validation pipeline with reject/retry logic"},
                {"risk": "API rate limiting from LLM provider", "severity": "Medium", "likelihood": "Medium", "mitigation": "Request queuing with exponential backoff + provider failover"},
                {"risk": "Sensitive data exposure in LLM context", "severity": "High", "likelihood": "Medium", "mitigation": "PII redaction before LLM calls + data masking"},
                {"risk": "Agent coordination failures", "severity": "Medium", "likelihood": "Low", "mitigation": "Dead letter queue + manual intervention workflow"},
                {"risk": "Cost overruns from unexpected token usage", "severity": "Medium", "likelihood": "Medium", "mitigation": "Token budget per request + monitoring alerts"},
            ],
            "failure_modes": [
                {"component": "Document Parser", "failure": "Unsupported format", "fallback": "Queue for manual processing"},
                {"component": "LLM Provider", "failure": "Service outage", "fallback": "Switch to backup provider (Gemini ↔ Azure OpenAI)"},
            ],
            "compliance_notes": ["Ensure data residency requirements are met", "Implement audit logging for all agent decisions"],
        }

    session["blueprint"]["risks"] = parsed
    risk_count = len(parsed.get("risks", []))
    critical = sum(1 for r in parsed.get("risks", []) if r.get("severity") == "Critical")

    return (
        f"Risk assessment complete: **{risk_count} risks** identified ({critical} critical).\n\n"
        "🔄 *Security Agent is now evaluating...*",
        {"risks": parsed},
    )


async def _run_security(session: dict) -> tuple[str, dict]:
    """Run security agent."""
    brief = json.dumps(session["problem_brief"], indent=2)
    arch = json.dumps(session["blueprint"]["architecture"], indent=2) if session["blueprint"]["architecture"] else "{}"
    prompt = f"Problem Brief:\n{brief}\n\nArchitecture:\n{arch}\n\nGenerate security requirements."

    response = await _call_llm(SECURITY_SYSTEM, prompt)
    parsed = _extract_json(response) if response else None

    if not parsed:
        parsed = {
            "threat_model": [
                {"threat": "Prompt injection via user input", "category": "Tampering", "mitigation": "Input sanitization + guardrails + content filtering"},
                {"threat": "Unauthorized access to agent endpoints", "category": "Spoofing", "mitigation": "Azure AD authentication + API key validation"},
                {"threat": "Data exfiltration through LLM responses", "category": "Information Disclosure", "mitigation": "Output filtering + PII detection"},
                {"threat": "Denial of service on agent pipeline", "category": "Denial of Service", "mitigation": "Rate limiting + request queue with backpressure"},
            ],
            "auth_requirements": "Azure AD B2C for end users, Managed Identity for service-to-service, RBAC with Admin/Operator/Viewer roles",
            "data_protection": {
                "encryption_at_rest": "Azure Storage Service Encryption (SSE) with customer-managed keys",
                "encryption_in_transit": "TLS 1.3 for all API communication",
                "pii_handling": "PII detection and redaction before LLM processing, masked in logs",
                "log_sanitization": "Structured logging with automatic PII scrubbing",
            },
            "prompt_security": {
                "injection_defense": "Input validation, system prompt anchoring, role-based prompt isolation",
                "guardrails": "Azure AI Content Safety for harmful content detection",
                "content_filtering": "Output filtering for sensitive data patterns (SSN, credit card, etc.)",
            },
            "checklist": [
                "Enable Azure AD authentication",
                "Configure RBAC roles and permissions",
                "Enable encryption at rest and in transit",
                "Implement PII detection and redaction",
                "Set up WAF and DDoS protection",
                "Configure audit logging",
                "Implement rate limiting",
                "Set up vulnerability scanning",
            ],
        }

    session["blueprint"]["security"] = parsed
    return (
        f"Security review complete: **{len(parsed.get('threat_model', []))} threats** modeled, "
        f"**{len(parsed.get('checklist', []))} checklist items** generated.\n\n"
        "🔄 *Cost Agent is calculating...*",
        {"security": parsed},
    )


async def _run_cost(session: dict) -> tuple[str, dict]:
    """Run cost agent."""
    brief = json.dumps(session["problem_brief"], indent=2)
    arch = json.dumps(session["blueprint"]["architecture"], indent=2) if session["blueprint"]["architecture"] else "{}"
    prompt = f"Problem Brief:\n{brief}\n\nArchitecture:\n{arch}\n\nEstimate costs."

    response = await _call_llm(COST_SYSTEM, prompt)
    parsed = _extract_json(response) if response else None

    if not parsed:
        agents = session["blueprint"].get("architecture", {}).get("agents", [])
        token_costs = []
        for a in agents:
            model = a.get("llm", "gemini-2.5-flash")
            cost = "$25" if "mini" in model or "flash" in model else "$75"
            token_costs.append({"component": a["name"], "model": model, "monthly_tokens": "~2M", "monthly_cost": cost})

        total = sum(int(t["monthly_cost"].replace("$", "")) for t in token_costs)
        infra_cost = 180
        total_monthly = total + infra_cost

        parsed = {
            "token_costs": token_costs,
            "infrastructure": [
                {"service": "Azure App Service", "tier": "B2", "monthly_cost": "$55"},
                {"service": "Azure Blob Storage", "tier": "Hot", "monthly_cost": "$25"},
                {"service": "Azure SQL", "tier": "Basic", "monthly_cost": "$5"},
                {"service": "Azure Monitor", "tier": "Standard", "monthly_cost": "$15"},
                {"service": "Azure Doc Intelligence", "tier": "S0", "monthly_cost": "$80"},
            ],
            "total_monthly": f"${total_monthly}",
            "total_annual": f"${total_monthly * 12:,}",
            "roi_timeline": "4-6 months",
            "comparison": {
                "pay_as_you_go": f"${total_monthly}/mo",
                "reserved": f"${int(total_monthly * 0.7)}/mo",
                "savings": "30%",
            },
        }

    session["blueprint"]["costs"] = parsed
    return (
        f"Cost estimate ready: **{parsed.get('total_monthly', 'N/A')}/month** estimated.\n"
        f"ROI timeline: **{parsed.get('roi_timeline', 'N/A')}**.",
        {"costs": parsed},
    )


async def _run_implementation(session: dict) -> tuple[str, dict]:
    """Run implementation agent."""
    brief = json.dumps(session["problem_brief"], indent=2)
    arch = json.dumps(session["blueprint"]["architecture"], indent=2) if session["blueprint"]["architecture"] else "{}"
    prompt = f"Problem Brief:\n{brief}\n\nArchitecture:\n{arch}\n\nCreate an implementation plan."

    response = await _call_llm(IMPLEMENTATION_SYSTEM, prompt)
    parsed = _extract_json(response) if response else None

    if not parsed:
        parsed = {
            "phases": [
                {"phase": "Phase 1: Foundation", "duration": "2 weeks", "tasks": ["Set up Azure infrastructure", "Configure LLM providers", "Build data ingestion pipeline", "Create agent scaffolding"], "deliverables": ["Infrastructure ready", "CI/CD pipeline", "Base agent framework"]},
                {"phase": "Phase 2: Core Agents", "duration": "3 weeks", "tasks": ["Implement primary processing agents", "Build tool integrations", "Create agent communication layer", "Unit testing"], "deliverables": ["Working agent pipeline", "Tool integrations", "Test coverage >80%"]},
                {"phase": "Phase 3: Integration", "duration": "2 weeks", "tasks": ["Connect to existing systems", "Implement error handling", "Build monitoring dashboard", "Integration testing"], "deliverables": ["End-to-end flow working", "Monitoring active", "Integration tests passing"]},
                {"phase": "Phase 4: Security & Compliance", "duration": "1 week", "tasks": ["Implement auth/RBAC", "PII detection and redaction", "Audit logging", "Security testing"], "deliverables": ["Security hardened", "Compliance documented", "Penetration test report"]},
                {"phase": "Phase 5: UAT & Go-Live", "duration": "2 weeks", "tasks": ["User acceptance testing", "Load testing", "Documentation", "Training", "Staged rollout"], "deliverables": ["UAT sign-off", "Production deployment", "Runbook complete"]},
            ],
            "team_structure": [
                {"role": "AI/ML Engineer", "count": 2, "focus": "Agent development & LLM integration"},
                {"role": "Backend Developer", "count": 1, "focus": "API, infrastructure, integrations"},
                {"role": "Frontend Developer", "count": 1, "focus": "UI/dashboard for monitoring"},
                {"role": "QA Engineer", "count": 1, "focus": "Testing strategy & execution"},
                {"role": "Project Manager", "count": 1, "focus": "Coordination & stakeholder management"},
            ],
            "testing_strategy": {
                "unit": "Agent-level unit tests with mocked LLM responses",
                "integration": "End-to-end pipeline tests with sample data",
                "eval": "LLM output quality evaluation with golden datasets",
                "load": "Simulated concurrent users at 2x expected volume",
            },
            "go_live_checklist": [
                "All security controls implemented and verified",
                "Monitoring and alerting configured",
                "Runbook and documentation complete",
                "Rollback procedure tested",
                "Stakeholder sign-off obtained",
                "Production data migration validated",
                "Support team trained",
            ],
            "total_timeline": "10 weeks",
        }

    session["blueprint"]["plan"] = parsed
    total = parsed.get("total_timeline", "10 weeks")
    phases = len(parsed.get("phases", []))
    return (
        f"Implementation plan ready: **{phases} phases** over **{total}**.\n\n"
        "✅ All agents have completed their analysis. You can review each tab in the Blueprint Canvas, "
        "or ask me to refine any section.",
        {"plan": parsed},
    )


# ── Match context from agents.json ──────────────────────────────────

def _match_solutions(problem_brief: dict) -> list[dict]:
    """Simple keyword matching against agents.json."""
    try:
        agents_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "templates", "assets"
        )
        # Read from the source data
        src_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
            "frontend1", "src", "data", "agents.json"
        )
        if not os.path.exists(src_path):
            return []

        with open(src_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        problem_text = " ".join(str(v) for v in problem_brief.values()).lower()
        keywords = set(problem_text.split())

        matches = []
        for domain in data.get("domains", []):
            for uc in domain.get("use_cases", []):
                uc_text = f"{uc.get('title', '')} {uc.get('description', '')} {' '.join(uc.get('key_features', []))}".lower()
                uc_words = set(uc_text.split())
                overlap = len(keywords & uc_words)
                if overlap >= 2:
                    score = min(99, int(50 + overlap * 5))
                    matches.append({
                        "id": uc["id"],
                        "title": uc.get("title", ""),
                        "domain": domain.get("domain", ""),
                        "domainId": domain.get("id", ""),
                        "score": score,
                        "description": uc.get("description", "")[:120],
                    })

        matches.sort(key=lambda x: x["score"], reverse=True)
        return matches[:5]
    except Exception as e:
        logger.error(f"Solution matching failed: {e}")
        return []


# ── Main orchestrator ───────────────────────────────────────────────

AGENT_PHASES = ["discovery", "architecture", "risks", "security", "costs", "plan", "complete"]


async def process_message(session_id: str, user_input: str) -> dict:
    """
    Main entry point. Processes a user message and returns:
    {
        "message": "Agent response text",
        "active_agent": "current phase",
        "completed_agents": ["discovery", "architecture", ...],
        "blueprint_updates": { "architecture": {...}, ... },
        "context_matches": { "solutions": [...] }
    }
    """
    session = _get_session(session_id)
    session["history"].append({"role": "user", "content": user_input})
    session["turn_count"] += 1

    phase = session["phase"]
    response_text = ""
    blueprint_updates = {}

    # ── Discovery phase ──
    if phase == "discovery":
        response_text, blueprint_updates = await _run_discovery(session, user_input)

        # If discovery advanced to architecture, auto-run the pipeline
        if session["phase"] == "architecture":
            # Run architecture
            arch_msg, arch_updates = await _run_architecture(session)
            blueprint_updates.update(arch_updates)

            # Run risk
            session["phase"] = "risks"
            risk_msg, risk_updates = await _run_risk(session)
            blueprint_updates.update(risk_updates)

            # Run security
            session["phase"] = "security"
            sec_msg, sec_updates = await _run_security(session)
            blueprint_updates.update(sec_updates)

            # Run cost
            session["phase"] = "costs"
            cost_msg, cost_updates = await _run_cost(session)
            blueprint_updates.update(cost_updates)

            # Run implementation
            session["phase"] = "plan"
            plan_msg, plan_updates = await _run_implementation(session)
            blueprint_updates.update(plan_updates)

            session["phase"] = "complete"

            response_text += f"\n\n{arch_msg}\n\n{risk_msg}\n\n{sec_msg}\n\n{cost_msg}\n\n{plan_msg}"

    # ── Complete phase — user is refining ──
    elif phase == "complete":
        # User is asking for refinements
        lower = user_input.lower()

        if any(w in lower for w in ["architect", "diagram", "agent", "pattern", "redesign"]):
            msg, updates = await _run_architecture(session)
            response_text = "Updated the architecture based on your feedback.\n\n" + msg
            blueprint_updates = updates
        elif any(w in lower for w in ["risk", "danger", "failure"]):
            msg, updates = await _run_risk(session)
            response_text = "Updated the risk assessment.\n\n" + msg
            blueprint_updates = updates
        elif any(w in lower for w in ["security", "auth", "encrypt", "threat"]):
            msg, updates = await _run_security(session)
            response_text = "Updated the security review.\n\n" + msg
            blueprint_updates = updates
        elif any(w in lower for w in ["cost", "price", "budget", "cheap", "expensive"]):
            msg, updates = await _run_cost(session)
            response_text = "Updated the cost estimate.\n\n" + msg
            blueprint_updates = updates
        elif any(w in lower for w in ["plan", "timeline", "implement", "roadmap", "sprint"]):
            msg, updates = await _run_implementation(session)
            response_text = "Updated the implementation plan.\n\n" + msg
            blueprint_updates = updates
        else:
            # General refinement — re-run affected agents
            response = await _call_llm(
                "You are an AI solution architect assistant. The user has a follow-up question about their solution blueprint. Answer concisely and helpfully.",
                f"Context: {json.dumps(session['problem_brief'])}\nBlueprint: {json.dumps(session['blueprint'], default=str)[:3000]}\n\nUser: {user_input}",
            )
            response_text = response if response else "I can help you refine any section. Try asking about architecture, risks, security, costs, or the implementation plan."

    # Build completed agents list
    completed = []
    for p in AGENT_PHASES[:-1]:
        if session["blueprint"].get(p) is not None or (p == "discovery" and session["phase"] != "discovery"):
            completed.append(p)

    # Context matches
    context_matches = {"solutions": _match_solutions(session.get("problem_brief", {}))}

    session["history"].append({"role": "assistant", "content": response_text})

    return {
        "message": response_text,
        "active_agent": session["phase"],
        "completed_agents": completed,
        "blueprint": session["blueprint"],
        "blueprint_updates": blueprint_updates,
        "context_matches": context_matches,
    }


def reset_session(session_id: str):
    """Clear a session."""
    if session_id in _sessions:
        del _sessions[session_id]
