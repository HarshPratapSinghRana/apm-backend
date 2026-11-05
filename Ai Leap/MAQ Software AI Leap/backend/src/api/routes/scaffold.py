"""Project Fit Report endpoint.

Accepts a user's use-case description + solution metadata,
calls the LLM, and returns a markdown Project Fit Report.
"""

import os
import sys
import asyncio
from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel
import llm_provider

_backend_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

router = APIRouter()


# ── Request / Response ─────────────────────────────────────────────────

class FitReportRequest(BaseModel):
    user_query: str
    title: str
    description: str
    key_features: list[str]
    architecture: Optional[str] = "Pro Code"


class FitReportResponse(BaseModel):
    success: bool
    report: Optional[str] = None
    error: Optional[str] = None


# ── Prompt builder ─────────────────────────────────────────────────────

def _build_prompt(req: FitReportRequest) -> str:
    features = "\n".join(f"  - {f}" for f in req.key_features)
    return f"""You are an expert AI solution architect helping a developer evaluate whether a solution fits their use case.

## Solution Details
- **Title**: {req.title}
- **Description**: {req.description}
- **Architecture**: {req.architecture}
- **Key Features**:
{features}

## User's Use Case
"{req.user_query}"

## Your Task
Generate a Project Fit Report in markdown. Be specific, practical, and honest.
Structure it exactly like this:

## Project Fit Report — {req.title}

### Your Use Case
"{req.user_query}"

### Fit Score: X% ✅ (or ⚠️ or ❌)
(X = 0-100, use ✅ for 75+, ⚠️ for 50-74, ❌ for below 50)
One sentence explaining the score.

### What Works Out of the Box
- List specific features of this solution that directly serve the user's need
- Be concrete, not generic

### What You'll Need to Modify
- List specific things the user will need to change, extend, or configure
- Reference actual components/files/features where possible

### What This Solution Won't Cover
- List genuine gaps between this solution and the user's need
- If nothing is missing, say so

### Recommended Next Steps
1. Numbered, copy-paste-ready action items
2. Specific and ordered by priority

Keep the report concise and actionable. Do not hallucinate features not listed above.
Return ONLY the markdown report, no preamble."""


# ── LLM caller ─────────────────────────────────────────────────────────

async def _call_llm(prompt: str) -> str:
    if llm_provider.is_local_mode():
        client = llm_provider.get_local_openai_client()
        model = llm_provider.get_local_model_name()
        resp = await asyncio.to_thread(
            client.chat.completions.create,
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
        )
        return resp.choices[0].message.content.strip()

    azure_key = os.getenv("AZURE_OPENAI_API_KEY", "").strip()
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").strip()
    azure_deployment = os.getenv("CHAT_GPT_MODEL", "").strip()
    if azure_key and azure_endpoint and azure_deployment:
        from openai import AzureOpenAI
        client = AzureOpenAI(
            api_key=azure_key,
            azure_endpoint=azure_endpoint,
            api_version=os.getenv("API_VERSION", "2024-02-01"),
        )
        resp = await asyncio.to_thread(
            client.chat.completions.create,
            model=azure_deployment,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
        )
        return resp.choices[0].message.content.strip()

    raise RuntimeError("No LLM API key configured.")


# ── Route ───────────────────────────────────────────────────────────────

@router.post("/generate-project", response_model=FitReportResponse)
async def generate_fit_report(req: FitReportRequest):
    """Generate a Project Fit Report for a given use case + user query."""
    try:
        prompt = _build_prompt(req)
        report = await _call_llm(prompt)
        return FitReportResponse(success=True, report=report)
    except RuntimeError as e:
        return FitReportResponse(success=False, error=str(e))
    except Exception as e:
        return FitReportResponse(success=False, error=f"Generation failed: {str(e)}")