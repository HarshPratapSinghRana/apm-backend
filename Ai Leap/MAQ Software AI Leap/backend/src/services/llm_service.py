import os
import sys
from pathlib import Path
from typing import Any, Tuple, Optional
from semantic_kernel.connectors.ai.ollama import OllamaChatCompletion, OllamaChatPromptExecutionSettings
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion, AzureChatPromptExecutionSettings
from semantic_kernel.connectors.ai.google.google_ai import GoogleAIChatCompletion, GoogleAIChatPromptExecutionSettings

# Add backend directory to path so llm_provider can be imported
_backend_dir = str(Path(__file__).resolve().parent.parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
import llm_provider
# class AzureOpenAIService:
#     def __init__(self, api_key: str, base_url: str, deployment_name: str, api_version: str):
#         self.api_key = api_key
#         self.base_url = base_url
#         self.deployment_name = deployment_name
#         self.api_version = api_version

#     def get_service(self) -> Tuple[Any, Any]:
#         chat_service = AzureChatCompletion(
#             deployment_name=self.deployment_name,
#             api_version=self.api_version,
#             base_url=self.base_url,
#             api_key=self.api_key,
#             credential=None
#         )
#         request_settings = AzureChatPromptExecutionSettings()
#         return chat_service, request_settings

class OllamaService:
    def __init__(self, model_name: str, service_id: Optional[str] = None):
        self.model_name = model_name
        self.service_id = service_id

    def get_service(self) -> Tuple[Any, Any]:
        chat_service = OllamaChatCompletion(ai_model_id=self.model_name)
        request_settings = OllamaChatPromptExecutionSettings()
        return chat_service, request_settings

class GeminiService:
    def __init__(self, api_key: str, model_name: str):
        self.api_key = api_key
        self.model_name = model_name

    def get_service(self) -> Tuple[Any, Any]:
        chat_service = GoogleAIChatCompletion(
            gemini_model_id=self.model_name,
            api_key=self.api_key
        )
        request_settings = GoogleAIChatPromptExecutionSettings()
        return chat_service, request_settings

class LocalModelService:
    """Service wrapper for the locally deployed model (vLLM/LiteLLM via ngrok)."""
    def get_service(self) -> Tuple[Any, Any]:
        return llm_provider.create_local_sk_service()
# Factory to get the correct service based on settings
def create_llm_service(settings) -> Any:
    
    # ── Local mode: bypass cloud providers entirely ──
    if llm_provider.is_local_mode():
        return LocalModelService()
    if settings.llm_active_service == "ollama":
        return OllamaService(
            model_name=settings.ollama_model_name,
            service_id=settings.ollama_service_id
        )
    elif settings.llm_active_service == "gemini":
        return GeminiService(
            api_key=settings.gemini_api_key,
            model_name=settings.gemini_model_name
        )
    else:
        raise ValueError(f"Unsupported LLM service: {settings.llm_active_service}")