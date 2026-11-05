"""
llm_provider.py
───────────────
Centralized LLM gateway with cloud/local toggle.

Usage in any backend file:
    import llm_provider

    if llm_provider.is_local_mode():
        client = llm_provider.get_local_openai_client()
        model  = llm_provider.get_local_model_name()

Environment Variables (add to .env):
    LLM_MODE=local               # "local" or "cloud" (default: cloud)
    LOCAL_LLM_BASE_URL=https://your-ngrok-url.ngrok-free.dev
    LOCAL_LLM_API_KEY=sk-my-internal-key-changeme
    LOCAL_LLM_MODEL_NAME=qwen-9b-agent
"""

import os
from dotenv import load_dotenv

load_dotenv()


# ───────────────────────────────────────────────────────────────────────
# Mode helpers
# ───────────────────────────────────────────────────────────────────────

def get_llm_mode() -> str:
    """Return the active LLM mode: 'local' or 'cloud'."""
    return os.getenv("LLM_MODE", "cloud").strip().lower()


def is_local_mode() -> bool:
    """True when the system should use the locally deployed model."""
    return get_llm_mode() == "local"


# ───────────────────────────────────────────────────────────────────────
# Local model configuration
# ───────────────────────────────────────────────────────────────────────

def get_local_base_url() -> str:
    return os.getenv("LOCAL_LLM_BASE_URL", "").strip()


def get_local_api_key() -> str:
    return os.getenv("LOCAL_LLM_API_KEY", "").strip()


def get_local_model_name() -> str:
    return os.getenv("LOCAL_LLM_MODEL_NAME", "qwen-9b-agent").strip()


# ───────────────────────────────────────────────────────────────────────
# OpenAI-compatible client for the local model
# ───────────────────────────────────────────────────────────────────────

def get_local_openai_client():
    """
    Return an OpenAI client pointing at the locally deployed model
    (vLLM / LiteLLM behind ngrok).

    Uses the standard `openai` library with a custom base_url.
    """
    from openai import OpenAI

    base_url = get_local_base_url()
    api_key = get_local_api_key()

    if not base_url:
        raise ValueError(
            "LOCAL_LLM_BASE_URL is not set in .env but LLM_MODE='local'."
        )

    # Ensure the base_url ends with /v1 for OpenAI compatibility
    if not base_url.rstrip("/").endswith("/v1"):
        base_url = base_url.rstrip("/") + "/v1"

    return OpenAI(
        api_key=api_key or "not-needed",
        base_url=base_url,
        timeout=600.0,
    )


# ───────────────────────────────────────────────────────────────────────
# Semantic Kernel service for the local model
# (Used by the Legal Agent / chat pipeline via src/services/llm_service.py)
# ───────────────────────────────────────────────────────────────────────

def create_local_sk_service():
    """
    Return a (chat_service, request_settings) tuple compatible with
    Semantic Kernel, pointing at the local model.
    """
    from semantic_kernel.connectors.ai.open_ai import (
        OpenAIChatCompletion,
        OpenAIChatPromptExecutionSettings,
    )
    from openai import AsyncOpenAI

    base_url = get_local_base_url()
    api_key = get_local_api_key()
    model = get_local_model_name()

    if not base_url:
        raise ValueError(
            "LOCAL_LLM_BASE_URL is not set in .env but LLM_MODE='local'."
        )

    # Ensure the base_url ends with /v1 for OpenAI compatibility
    if not base_url.rstrip("/").endswith("/v1"):
        base_url = base_url.rstrip("/") + "/v1"

    custom_client = AsyncOpenAI(
        api_key=api_key or "not-needed",
        base_url=base_url,
        timeout=600.0,
    )

    chat_service = OpenAIChatCompletion(
        ai_model_id=model,
        async_client=custom_client,
    )

    request_settings = OpenAIChatPromptExecutionSettings()

    return chat_service, request_settings
