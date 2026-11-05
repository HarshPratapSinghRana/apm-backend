"""
llm.py
------
Async LLM caller with dynamic provider routing.

Behavior:
- If LLM_PROVIDER == "azure openai" → Use AzureOpenAI (requires API_ENDPOINT)
- Otherwise (groq, openai, gemini, etc.) → Use key + model only

.env structure:
LLM_PROVIDER=""
LLM_KEY=""
LLM_MODEL_NAME=""
API_ENDPOINT=""   # Only required for Azure OpenAI
"""

import asyncio
import os
from pathlib import Path
import sys
from typing import List
from dotenv import load_dotenv

# Add backend directory to path so llm_provider can be imported
if str(Path(__file__).resolve().parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import llm_provider


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent
ENV_PATH = PROJECT_ROOT / ".env"
SYSTEM_PROMPT_PATH = BACKEND_DIR / "Prompts" / "SystemPrompt.txt"


def _reload_env() -> None:
    load_dotenv(ENV_PATH, override=True)


# ---------------------------------------------------------------------------
# System Prompt Loader
# ---------------------------------------------------------------------------
def _load_system_prompt() -> str:
    if not SYSTEM_PROMPT_PATH.exists():
        raise FileNotFoundError(
            f"System prompt not found at {SYSTEM_PROMPT_PATH}"
        )
    return SYSTEM_PROMPT_PATH.read_text(encoding="utf-8").strip()


# ---------------------------------------------------------------------------
# Message Builder
# ---------------------------------------------------------------------------
def _build_messages(chunk: str, user_query: str, system_prompt: str) -> list:
    user_content = (
        f"User Query:\n{user_query}\n\n"
        f"Document Text:\n{chunk}"
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]


# ---------------------------------------------------------------------------
# Client Factory (CORE LOGIC)
# ---------------------------------------------------------------------------
def _get_client():
    _reload_env()

    # ── Local mode: bypass all cloud providers ──
    if llm_provider.is_local_mode():
        return llm_provider.get_local_openai_client()

    provider = os.getenv("LLM_PROVIDER", "").lower().strip()
    api_key = os.getenv("LLM_KEY", "").strip()

    if not api_key:
        raise ValueError("LLM_KEY is not set in .env.")

    # -------------------- AZURE OPENAI --------------------
    if provider == "azure openai":
        from openai import AzureOpenAI

        api_endpoint = os.getenv("API_ENDPOINT", "").strip()
        api_version = os.getenv("LLM_API_VERSION", "2024-12-01-preview")

        if not api_endpoint:
            raise ValueError(
                "API_ENDPOINT must be set when LLM_PROVIDER='azure openai'."
            )

        return AzureOpenAI(
            api_key=api_key,
            azure_endpoint=api_endpoint,
            api_version=api_version,
        )

    # -------------------- GROQ --------------------
    elif provider == "groq":
        from groq import Groq
        return Groq(api_key=api_key)

    # -------------------- GEMINI --------------------
    elif provider == "gemini":
        from google import genai
        return genai.Client(api_key=api_key)

    # -------------------- DEFAULT OPENAI --------------------
    else:
        from openai import OpenAI
        return OpenAI(api_key=api_key)


# ---------------------------------------------------------------------------
# Single LLM Call
# ---------------------------------------------------------------------------
async def _call_llm(
    chunk: str,
    user_query: str,
    *,
    system_prompt: str | None = None,
) -> str:

    _reload_env()

    # ── Local mode: override model and provider ──
    if llm_provider.is_local_mode():
        model = llm_provider.get_local_model_name()
        provider = "local"
    else:
        model = os.getenv("LLM_MODEL_NAME", "").strip()
        provider = os.getenv("LLM_PROVIDER", "").lower().strip()

    if not model:
        raise ValueError("LLM_MODEL_NAME is not set in .env.")

    if system_prompt is None:
        system_prompt = _load_system_prompt()

    messages = _build_messages(chunk, user_query, system_prompt)
    client = _get_client()

    # -------------------- AZURE OPENAI --------------------
    if provider == "azure openai":
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=model,
            messages=messages,
            temperature=0,
        )
        return response.choices[0].message.content.strip()

    # -------------------- GROQ --------------------
    elif provider == "groq":
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=model,
            messages=messages,
            temperature=0,
        )
        return response.choices[0].message.content.strip()

    # -------------------- GEMINI --------------------
    elif provider == "gemini":
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=model,
            contents=f"{system_prompt}\n\nUser Query:\n{user_query}\n\nDocument Text:\n{chunk}"
        )
        return response.text.strip()

    # -------------------- DEFAULT OPENAI --------------------
    else:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=model,
            messages=messages,
            temperature=0,
        )
        return response.choices[0].message.content.strip()


# ---------------------------------------------------------------------------
# Parallel Chunk Calls
# ---------------------------------------------------------------------------
async def call_llm_on_chunks(
    chunks: List[str],
    user_query: str,
) -> List[str]:

    system_prompt = _load_system_prompt()

    tasks = [
        _call_llm(chunk, user_query, system_prompt=system_prompt)
        for chunk in chunks
    ]

    return list(await asyncio.gather(*tasks))


# ---------------------------------------------------------------------------
# Refinement
# ---------------------------------------------------------------------------
async def refine_responses(
    raw_responses: List[str],
    user_query: str,
) -> str:

    useful = [r for r in raw_responses if r.upper().strip() != "NOT FOUND"]

    if not useful:
        return "The requested information was not found in the document."

    merged = "\n---\n".join(useful)

    refinement_prompt = (
        f"User Query:\n{user_query}\n\n"
        f"Partial Answers:\n{merged}\n\n"
        "Merge them into ONE clear and accurate final answer."
    )

    return await _call_llm(refinement_prompt, user_query)