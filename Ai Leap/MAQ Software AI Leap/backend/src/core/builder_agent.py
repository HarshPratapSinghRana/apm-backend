"""
Solution Builder Agent
─────────────────────
Conversational agent that powers the enhanced Solution Builder.
Capabilities:
  1. Solution recommendation (matches agents catalog)
  2. Architecture diagram generation (structured JSON for frontend SVG)
  3. SDLC phase mapping
  4. Evaluation guidance
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()

import sys
from pathlib import Path as _Path
_backend_dir = str(_Path(__file__).resolve().parent.parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
import llm_provider

logger = logging.getLogger("BuilderAgent")

# ─── Load agents catalog once at module level ─── #
_AGENTS_DATA: Dict[str, Any] = {}
_agents_path = os.path.join(
    os.path.dirname(__file__), "..", "..", "templates", "files", "agents.json"
)
# Try multiple paths
for p in [
    _agents_path,
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend1", "src", "data", "agents.json"),
]:
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            _AGENTS_DATA = json.load(f)
        break

# ─── SDLC Phases (mirror of frontend sdlc-phases.ts) ─── #
SDLC_PHASES = [
    {
        "id": "planning",
        "title": "Planning & Requirements",
        "color": "amber",
        "solutions": ["executive-copilot-agent", "monday-morning-agent"],
        "kpis": ["Reduction in planning cycle time", "Requirements-to-Delivery (RTD) reduction"],
        "status": "mapped",
    },
    {
        "id": "development",
        "title": "Development",
        "color": "blue",
        "solutions": ["code-standards-reviewer-agent", "enterprise-knowledge-bot"],
        "kpis": ["% code review time reduction", "Vulnerabilities detected pre-merge"],
        "status": "mapped",
    },
    {
        "id": "cicd",
        "title": "CI/CD",
        "color": "violet",
        "solutions": [],
        "kpis": ["Deployment frequency improvement", "Mean Time to Recovery (MTTR)"],
        "status": "tbd",
    },
    {
        "id": "testing",
        "title": "Testing & Quality Assurance",
        "color": "emerald",
        "solutions": ["test-case-recommender", "loadfast", "certyfast"],
        "kpis": ["Improvements in automated test coverage", "Defect escape rate reduction"],
        "status": "mapped",
    },
    {
        "id": "operations",
        "title": "Postmortems & Continuous Improvement",
        "color": "teal",
        "solutions": ["security-risk-analyzer-agent", "fraud-anomaly-detection-agent", "expense-trend-analyzer"],
        "kpis": ["% postmortem time reduction", "Action item completion rate", "Mean Time to Detect (MTTD)"],
        "status": "mapped",
    },
]

# ─── Architecture Templates ─── #
ARCH_TEMPLATES = {
    "No Code": {
        "style": "single-agent",
        "llm_provider": "Azure AI Foundry",
        "layers": [
            {"name": "Orchestration", "items": ["Copilot Studio", "Power Automate"]},
            {"name": "Connectors", "items": ["SharePoint", "Dataverse", "Outlook"]},
            {"name": "Intelligence", "items": ["AI Builder", "Prebuilt Models"]},
            {"name": "Experience", "items": ["Teams", "Power Apps", "Web Chat"]},
        ],
    },
    "Low Code": {
        "style": "single-agent",
        "llm_provider": "Azure OpenAI",
        "layers": [
            {"name": "Orchestration", "items": ["Logic Apps", "Power Automate"]},
            {"name": "Connectors", "items": ["Custom Connectors", "API Management", "Service Bus"]},
            {"name": "Intelligence", "items": ["Azure OpenAI", "AI Foundry", "Document Intelligence"]},
            {"name": "Data", "items": ["Cosmos DB", "SQL Database", "Blob Storage"]},
            {"name": "Experience", "items": ["Power Apps", "Web App", "Teams"]},
        ],
    },
    "Pro Code": {
        "style": "multi-agent",
        "llm_provider": "Azure OpenAI",
        "supervisor": {"name": "Supervisor Agent", "role": "Orchestrator, Intent Classifier, Prompt Flow"},
        "agents": [],  # Populated dynamically
        "data_stores": ["Azure Blob Storage", "Azure SQL DB", "Azure AI Search"],
        "monitoring": ["Azure Log Analytics", "Application Insights"],
        "security": ["Microsoft Entra ID", "Key Vault"],
    },
}

# ─── Problem type → agent keyword mapping ─── #
PROBLEM_KEYWORDS = {
    "automation": ["automate", "workflow", "process", "scheduling", "orchestrat"],
    "analytics": ["analytics", "report", "insight", "dashboard", "metric", "trend", "forecast"],
    "customer": ["customer", "chat", "support", "faq", "bot", "personali"],
    "documents": ["document", "invoice", "extract", "pdf", "ocr", "scan", "form"],
    "knowledge": ["knowledge", "search", "qa", "question", "retrieval"],
    "quality": ["compliance", "audit", "quality", "inspect", "review", "security", "risk"],
}

# ─── Eval templates by problem type ─── #
EVAL_TEMPLATES = {
    "automation": {
        "metrics": [
            {"name": "Process Completion Rate", "target": ">95%", "weight": 30},
            {"name": "End-to-End Latency", "target": "<30s", "weight": 25},
            {"name": "Error Rate", "target": "<2%", "weight": 25},
            {"name": "Cost per Execution", "target": "50% below manual", "weight": 20},
        ],
        "approach": [
            "Define 20+ representative test workflows",
            "Run automated batch evaluation",
            "Compare output against expected results",
            "Measure throughput under load",
        ],
    },
    "analytics": {
        "metrics": [
            {"name": "Insight Accuracy", "target": ">90%", "weight": 30},
            {"name": "Report Generation Time", "target": "<10s", "weight": 20},
            {"name": "User Satisfaction Score", "target": ">4.5/5", "weight": 30},
            {"name": "Data Freshness", "target": "<5min lag", "weight": 20},
        ],
        "approach": [
            "Prepare golden datasets with known answers",
            "Validate generated insights against ground truth",
            "A/B test with manual reporting process",
            "Track user engagement metrics",
        ],
    },
    "customer": {
        "metrics": [
            {"name": "Response Accuracy", "target": ">92%", "weight": 30},
            {"name": "Response Latency", "target": "<3s", "weight": 20},
            {"name": "Customer Satisfaction (CSAT)", "target": ">4.2/5", "weight": 30},
            {"name": "Escalation Rate", "target": "<15%", "weight": 20},
        ],
        "approach": [
            "Prepare 50+ representative customer queries",
            "Run blind evaluation with human judges",
            "Measure first-contact resolution rate",
            "Track conversation completion and abandonment",
        ],
    },
    "documents": {
        "metrics": [
            {"name": "Field Extraction Accuracy", "target": ">95%", "weight": 35},
            {"name": "Processing Latency", "target": "<5s per doc", "weight": 20},
            {"name": "Cost per Document", "target": "<$0.05", "weight": 20},
            {"name": "False Positive Rate", "target": "<3%", "weight": 25},
        ],
        "approach": [
            "Prepare 50+ golden test documents",
            "Run batch evaluation across document types",
            "Score field-level accuracy",
            "Compare against baseline manual process",
        ],
    },
    "knowledge": {
        "metrics": [
            {"name": "Answer Accuracy", "target": ">90%", "weight": 35},
            {"name": "Retrieval Relevance (MRR)", "target": ">0.85", "weight": 25},
            {"name": "Response Latency", "target": "<3s", "weight": 20},
            {"name": "Hallucination Rate", "target": "<5%", "weight": 20},
        ],
        "approach": [
            "Build Q&A golden dataset (50+ pairs)",
            "Evaluate retrieval precision and recall",
            "Test for hallucination with adversarial queries",
            "Measure end-to-end response quality",
        ],
    },
    "quality": {
        "metrics": [
            {"name": "Detection Accuracy", "target": ">93%", "weight": 30},
            {"name": "False Positive Rate", "target": "<5%", "weight": 25},
            {"name": "Audit Coverage", "target": ">98%", "weight": 25},
            {"name": "Time to Detection", "target": "<1 hour", "weight": 20},
        ],
        "approach": [
            "Prepare labeled compliance test cases",
            "Run automated detection against known violations",
            "Measure precision, recall, and F1",
            "Track mean time to detection improvement",
        ],
    },
}


@dataclass
class BuilderSession:
    """Holds conversational state for a builder session."""
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    conversation_history: List[Dict[str, str]] = field(default_factory=list)
    wizard_answers: Optional[Dict[str, str]] = None
    recommendation: Optional[Dict[str, Any]] = None
    architecture: Optional[Dict[str, Any]] = None
    sdlc: Optional[Dict[str, Any]] = None
    evaluation: Optional[Dict[str, Any]] = None
    context: Dict[str, Any] = field(default_factory=dict)


class BuilderAgent:
    """Solution Builder Agent — generates recommendations, architecture, SDLC plans, and eval guidance."""

    def __init__(self):
        self.sessions: Dict[str, BuilderSession] = {}

        # ── Local mode: use the locally deployed model ──
        if llm_provider.is_local_mode():
            try:
                self._use_llm = True
                self._local_client = llm_provider.get_local_openai_client()
                self._local_model = llm_provider.get_local_model_name()
                logger.info("BuilderAgent initialized with LOCAL model (%s)", self._local_model)
            except Exception as e:
                logger.warning(f"Failed to initialize local LLM client: {e}. Falling back to rule-based.")
                self._use_llm = False
        else:
            self._use_llm = bool(os.getenv("GEMINI_API_KEY"))
            if self._use_llm:
                try:
                    import google.generativeai as genai
                    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
                    self._model = genai.GenerativeModel(os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash"))
                    logger.info("BuilderAgent initialized with Gemini LLM")
                except Exception as e:
                    logger.warning(f"Failed to initialize Gemini: {e}. Falling back to rule-based.")
                    self._use_llm = False
            else:
                logger.info("BuilderAgent initialized in rule-based mode (no GEMINI_API_KEY)")

    def get_or_create_session(self, session_id: Optional[str] = None) -> BuilderSession:
        if session_id and session_id in self.sessions:
            return self.sessions[session_id]
        session = BuilderSession(session_id=session_id or str(uuid.uuid4()))
        self.sessions[session.session_id] = session
        return session

    async def process_message(
        self,
        session_id: Optional[str],
        message: Optional[str] = None,
        wizard_answers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Main entry point. Handles both chat messages and wizard completions."""
        session = self.get_or_create_session(session_id)

        # If wizard answers provided, process them
        if wizard_answers:
            session.wizard_answers = wizard_answers
            return await self._process_wizard(session)

        # Free-form chat message
        if message:
            session.conversation_history.append({"role": "user", "content": message})
            return await self._process_chat(session, message)

        return {
            "session_id": session.session_id,
            "reply": "Hi! I'm the Solution Builder. Describe your business problem or use the Guided Wizard to get started.",
            "outputs": None,
            "active_tab": None,
        }

    async def _process_wizard(self, session: BuilderSession) -> Dict[str, Any]:
        """Process completed wizard answers into full outputs."""
        answers = session.wizard_answers
        if not answers:
            return {"session_id": session.session_id, "reply": "No answers provided.", "outputs": None, "active_tab": None}

        # 1. Compute recommendation
        recommendation = self._compute_recommendation(answers)
        session.recommendation = recommendation

        # 2. Find matching solutions
        solutions = self._find_solutions(answers, recommendation["primary"])

        # 3. Generate architecture
        architecture = self._generate_architecture(recommendation["primary"], solutions, answers)
        session.architecture = architecture

        # 4. Map to SDLC
        sdlc = self._map_sdlc(solutions)
        session.sdlc = sdlc

        # 5. Generate eval guidance
        evaluation = self._generate_eval(answers, solutions)
        session.evaluation = evaluation

        reply = f"Based on your requirements, I recommend **{recommendation['primary']}** architecture with {recommendation['confidence']}% confidence. "
        reply += f"I found {len(solutions)} matching solutions. "
        reply += "Check the tabs on the right for your architecture diagram, SDLC mapping, and evaluation framework."

        return {
            "session_id": session.session_id,
            "reply": reply,
            "outputs": {
                "recommendations": {
                    **recommendation,
                    "solutions": solutions,
                    "tech_stack": self._get_tech_stack(recommendation["primary"]),
                    "roadmap": self._get_roadmap(recommendation["primary"]),
                },
                "architecture": architecture,
                "sdlc": sdlc,
                "evaluation": evaluation,
            },
            "active_tab": "recommendations",
        }

    async def _process_chat(self, session: BuilderSession, message: str) -> Dict[str, Any]:
        """Process a free-form chat message."""
        lower = message.lower().strip()

        # Detect intent
        intent = self._detect_intent(lower)

        if intent == "architecture" and session.recommendation:
            # User wants to see/update architecture
            arch = session.architecture or self._generate_architecture(
                session.recommendation["primary"], [], session.wizard_answers or {}
            )
            session.architecture = arch
            return {
                "session_id": session.session_id,
                "reply": "Here's the architecture for your solution. Check the **Architecture** tab.",
                "outputs": {"architecture": arch} if not session.recommendation else {
                    "recommendations": {**session.recommendation, "solutions": [], "tech_stack": [], "roadmap": []},
                    "architecture": arch,
                    "sdlc": session.sdlc,
                    "evaluation": session.evaluation,
                },
                "active_tab": "architecture",
            }

        if intent == "sdlc" and session.recommendation:
            sdlc = session.sdlc or self._map_sdlc([])
            session.sdlc = sdlc
            return {
                "session_id": session.session_id,
                "reply": "Here's how your solution maps to the SDLC lifecycle. Check the **SDLC Plan** tab.",
                "outputs": {
                    "recommendations": {**session.recommendation, "solutions": [], "tech_stack": [], "roadmap": []},
                    "architecture": session.architecture,
                    "sdlc": sdlc,
                    "evaluation": session.evaluation,
                },
                "active_tab": "sdlc",
            }

        if intent == "eval" and session.recommendation:
            evaluation = session.evaluation or self._generate_eval(session.wizard_answers or {}, [])
            session.evaluation = evaluation
            return {
                "session_id": session.session_id,
                "reply": "Here's the evaluation framework for your agents. Check the **Eval** tab.",
                "outputs": {
                    "recommendations": {**session.recommendation, "solutions": [], "tech_stack": [], "roadmap": []},
                    "architecture": session.architecture,
                    "sdlc": session.sdlc,
                    "evaluation": evaluation,
                },
                "active_tab": "eval",
            }

        # Default: treat as a problem description → generate all outputs
        # Infer domain and problem type from message
        inferred = self._infer_from_message(lower)
        answers = session.wizard_answers or {
            "domain": inferred.get("domain"),
            "problemType": inferred.get("problemType"),
            "teamSkill": "developers",
            "timeline": "months",
            "scale": "team",
            "customization": "extend",
        }
        session.wizard_answers = answers

        recommendation = self._compute_recommendation(answers)
        session.recommendation = recommendation

        solutions = self._find_solutions(answers, recommendation["primary"])
        architecture = self._generate_architecture(recommendation["primary"], solutions, answers)
        session.architecture = architecture
        sdlc = self._map_sdlc(solutions)
        session.sdlc = sdlc
        evaluation = self._generate_eval(answers, solutions)
        session.evaluation = evaluation

        sol_names = ", ".join(s["title"] for s in solutions[:3]) if solutions else "custom solutions"
        reply = f"For your requirement, I recommend **{recommendation['primary']}** architecture. "
        reply += f"I found {len(solutions)} matching solutions including {sol_names}. "
        reply += "All tabs are now populated — explore your architecture diagram, SDLC mapping, and evaluation framework."

        session.conversation_history.append({"role": "assistant", "content": reply})

        return {
            "session_id": session.session_id,
            "reply": reply,
            "outputs": {
                "recommendations": {
                    **recommendation,
                    "solutions": solutions,
                    "tech_stack": self._get_tech_stack(recommendation["primary"]),
                    "roadmap": self._get_roadmap(recommendation["primary"]),
                },
                "architecture": architecture,
                "sdlc": sdlc,
                "evaluation": evaluation,
            },
            "active_tab": "recommendations",
        }

    # ─── Intent Detection ─── #
    def _detect_intent(self, text: str) -> str:
        if any(w in text for w in ["architecture", "diagram", "design", "topology", "show me the arch"]):
            return "architecture"
        if any(w in text for w in ["sdlc", "lifecycle", "phase", "where does this fit", "adoption"]):
            return "sdlc"
        if any(w in text for w in ["evaluat", "metric", "kpi", "performance", "measure", "score"]):
            return "eval"
        return "recommend"

    # ─── Inference from free-text ─── #
    def _infer_from_message(self, text: str) -> Dict[str, str]:
        result: Dict[str, str] = {}

        # Infer domain
        domain_keywords = {
            "retail": ["retail", "store", "customer", "shop", "ecommerce", "product"],
            "finance": ["finance", "invoice", "bank", "payment", "expense", "loan", "billing"],
            "healthcare": ["health", "patient", "clinical", "medical", "hospital"],
            "manufacturing": ["manufactur", "factory", "production", "inventory", "supply chain"],
            "legal": ["legal", "contract", "compliance", "law", "regulation"],
            "automotive": ["vehicle", "fleet", "automotive", "car", "transport"],
        }
        for domain, keywords in domain_keywords.items():
            if any(kw in text for kw in keywords):
                result["domain"] = domain
                break

        # Infer problem type
        for pt, keywords in PROBLEM_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                result["problemType"] = pt
                break

        return result

    # ─── Recommendation Scoring ─── #
    def _compute_recommendation(self, answers: Dict[str, Any]) -> Dict[str, Any]:
        scores = {"No Code": 0, "Low Code": 0, "Pro Code": 0}
        SKILL_MAP = {"business": 0, "citizen": 1, "developers": 2, "ml-engineers": 3}
        TIMELINE_MAP = {"days": 0, "weeks": 1, "months": 2, "quarters": 3}
        SCALE_MAP = {"pilot": 0, "team": 1, "org": 2, "enterprise": 3}
        CUST_MAP = {"ootb": 0, "configure": 1, "extend": 2, "build": 3}

        skill_w = SKILL_MAP.get(answers.get("teamSkill", ""), 2)
        if skill_w <= 0:
            scores["No Code"] += 4; scores["Low Code"] += 1
        elif skill_w == 1:
            scores["Low Code"] += 4; scores["No Code"] += 2
        elif skill_w == 2:
            scores["Pro Code"] += 3; scores["Low Code"] += 2
        else:
            scores["Pro Code"] += 5

        tl_w = TIMELINE_MAP.get(answers.get("timeline", ""), 2)
        if tl_w == 0:
            scores["No Code"] += 4
        elif tl_w == 1:
            scores["Low Code"] += 3; scores["No Code"] += 1
        elif tl_w == 2:
            scores["Pro Code"] += 2; scores["Low Code"] += 2
        else:
            scores["Pro Code"] += 4

        sc_w = SCALE_MAP.get(answers.get("scale", ""), 1)
        if sc_w <= 0:
            scores["No Code"] += 2; scores["Low Code"] += 1
        elif sc_w == 1:
            scores["Low Code"] += 2; scores["No Code"] += 1
        elif sc_w == 2:
            scores["Pro Code"] += 2; scores["Low Code"] += 2
        else:
            scores["Pro Code"] += 4

        cust_w = CUST_MAP.get(answers.get("customization", ""), 2)
        if cust_w == 0:
            scores["No Code"] += 4
        elif cust_w == 1:
            scores["Low Code"] += 3; scores["No Code"] += 1
        elif cust_w == 2:
            scores["Pro Code"] += 2; scores["Low Code"] += 3
        else:
            scores["Pro Code"] += 5

        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        total = sum(s[1] for s in sorted_scores)

        return {
            "primary": sorted_scores[0][0],
            "secondary": sorted_scores[1][0],
            "confidence": round((sorted_scores[0][1] / total) * 100) if total > 0 else 50,
            "scores": scores,
        }

    # ─── Solution Matching ─── #
    def _find_solutions(self, answers: Dict[str, Any], primary_arch: str) -> List[Dict[str, Any]]:
        all_use_cases = []
        for domain in _AGENTS_DATA.get("domains", []):
            for uc in domain.get("use_cases", []):
                all_use_cases.append({
                    "id": uc.get("id", ""),
                    "title": uc.get("title", ""),
                    "description": uc.get("description", "")[:200],
                    "architecture": uc.get("architecture", "Pro Code"),
                    "domainId": domain.get("id", ""),
                    "domainName": domain.get("domain", ""),
                    "key_features": uc.get("key_features", [])[:3],
                })

        # Score solutions
        domain_filter = answers.get("domain")
        problem_type = answers.get("problemType")
        keywords = PROBLEM_KEYWORDS.get(problem_type, []) if problem_type else []

        scored = []
        for uc in all_use_cases:
            score = 0
            text = f"{uc['title']} {uc['description']} {' '.join(uc.get('key_features', []))}".lower()

            # Architecture match
            if uc["architecture"] == primary_arch:
                score += 40
            elif uc["architecture"] in ("Low Code", "Pro Code") and primary_arch in ("Low Code", "Pro Code"):
                score += 20

            # Domain match
            if domain_filter and uc["domainId"] == domain_filter:
                score += 30

            # Keyword match
            for kw in keywords:
                if kw in text:
                    score += 10

            if score > 0:
                scored.append({**uc, "score": min(score, 100)})

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:8]

    # ─── Architecture Generation ─── #
    def _generate_architecture(
        self, primary: str, solutions: List[Dict], answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        template = ARCH_TEMPLATES.get(primary, ARCH_TEMPLATES["Pro Code"]).copy()

        if primary == "Pro Code":
            # Build agent list from matched solutions
            agents = []
            for sol in solutions[:4]:
                tools = []
                for feat in sol.get("key_features", []):
                    tools.append(feat[:40])
                agents.append({
                    "name": sol.get("title", "Agent"),
                    "tools": tools if tools else ["Custom Logic"],
                })

            if not agents:
                agents = [
                    {"name": "Processing Agent", "tools": ["Data Extraction", "Validation"]},
                    {"name": "Analysis Agent", "tools": ["Pattern Detection", "Scoring"]},
                ]

            template["agents"] = agents

            # Customize data stores based on problem type
            problem = answers.get("problemType", "")
            if problem == "documents":
                template["data_stores"] = ["Azure Blob Storage", "Azure AI Document Intelligence", "Azure SQL DB"]
            elif problem == "knowledge":
                template["data_stores"] = ["Azure AI Search", "Azure Blob Storage", "Cosmos DB"]
            elif problem == "analytics":
                template["data_stores"] = ["Azure SQL DB", "Azure Data Lake", "Power BI"]

        return template

    # ─── SDLC Mapping ─── #
    def _map_sdlc(self, solutions: List[Dict]) -> Dict[str, Any]:
        solution_ids = {s["id"] for s in solutions}

        phases = []
        for phase in SDLC_PHASES:
            overlap = solution_ids & set(phase["solutions"])
            phases.append({
                "id": phase["id"],
                "title": phase["title"],
                "color": phase["color"],
                "status": phase["status"],
                "kpis": phase["kpis"],
                "mapped_solutions": list(overlap),
                "total_solutions": len(phase["solutions"]),
            })

        mapped_count = sum(1 for p in phases if p["status"] == "mapped")
        tbd_count = sum(1 for p in phases if p["status"] == "tbd")
        gaps = [p["id"] for p in phases if p["status"] == "tbd"]

        # Build adoption order from recommended solutions
        adoption_order = []
        for sol in solutions[:5]:
            adoption_order.append({
                "solution": sol.get("title", ""),
                "phase": self._solution_to_phase(sol["id"]),
                "priority": "High" if sol.get("score", 0) > 60 else "Medium",
            })

        return {
            "phases": phases,
            "coverage": round((mapped_count / len(phases)) * 100) if phases else 0,
            "gaps": gaps,
            "adoption_order": adoption_order,
        }

    def _solution_to_phase(self, solution_id: str) -> str:
        for phase in SDLC_PHASES:
            if solution_id in phase["solutions"]:
                return phase["title"]
        return "Development"

    # ─── Evaluation Generation ─── #
    def _generate_eval(self, answers: Dict[str, Any], solutions: List[Dict]) -> Dict[str, Any]:
        problem_type = answers.get("problemType", "automation")
        template = EVAL_TEMPLATES.get(problem_type, EVAL_TEMPLATES["automation"])

        # Build per-solution eval cards
        solution_evals = []
        for sol in solutions[:4]:
            solution_evals.append({
                "solution": sol.get("title", ""),
                "architecture": sol.get("architecture", ""),
                "metrics": template["metrics"],
            })

        success_criteria = [
            f">{m['target']} for {m['name']}" for m in template["metrics"]
        ]
        success_criteria.append("ROI positive within 3 months")

        return {
            "metrics": template["metrics"],
            "approach": template["approach"],
            "success_criteria": success_criteria,
            "solution_evals": solution_evals,
        }

    # ─── Helpers ─── #
    def _get_tech_stack(self, primary: str) -> List[str]:
        stacks = {
            "No Code": ["Copilot Studio", "Power Automate", "AI Builder"],
            "Low Code": ["Logic Apps", "Power Automate", "Azure AI Foundry"],
            "Pro Code": ["Semantic Kernel", "LangChain", "Azure AI Foundry SDK"],
        }
        return stacks.get(primary, stacks["Pro Code"])

    def _get_roadmap(self, primary: str) -> List[Dict[str, str]]:
        roadmaps = {
            "No Code": [
                {"phase": "Quick Win", "desc": "Deploy a prebuilt template or Copilot Studio agent", "time": "1-3 days"},
                {"phase": "Customize", "desc": "Tune prompts, add connectors, adjust workflows", "time": "1-2 weeks"},
                {"phase": "Scale", "desc": "Roll out to more teams, monitor & iterate", "time": "2-4 weeks"},
            ],
            "Low Code": [
                {"phase": "Prototype", "desc": "Build initial flow with Logic Apps or Power Automate", "time": "1-2 weeks"},
                {"phase": "Integrate", "desc": "Connect APIs, add custom connectors and business logic", "time": "2-4 weeks"},
                {"phase": "Optimize", "desc": "Performance tuning, monitoring, and team training", "time": "1-2 months"},
            ],
            "Pro Code": [
                {"phase": "Design", "desc": "Architecture design, tech stack selection, PoC", "time": "2-4 weeks"},
                {"phase": "Build", "desc": "Core development, model integration, testing", "time": "1-3 months"},
                {"phase": "Deploy", "desc": "CI/CD pipeline, monitoring, production rollout", "time": "2-4 weeks"},
            ],
        }
        return roadmaps.get(primary, roadmaps["Pro Code"])


# Singleton instance
builder_agent = BuilderAgent()
