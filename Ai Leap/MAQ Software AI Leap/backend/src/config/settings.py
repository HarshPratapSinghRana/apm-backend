import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import Optional

load_dotenv()
class Settings():
    # Core Application
    app_name: str =  "Legal Intake Agent"
    app_version: str = "1.0.0"
    debug: bool = os.getenv("DEBUG", "False").lower() in ("1", "true", "yes")
    # Active LLM service (matches .env LLM_ACTIVE_SERVICE)
    llm_active_service: str = os.getenv("LLM_ACTIVE_SERVICE", "gemini")

    # Azure OpenAI
 
    # azure_openai_api_key: Optional[str] = os.getenv("AZURE_OPENAI_API_KEY")
    # azure_openai_base_url: Optional[str] = os.getenv("AZURE_OPENAI_ENDPOINT")
    # azure_openai_deployment_name: Optional[str] = os.getenv("CHAT_GPT_MODEL")
    # azure_openai_api_version: Optional[str] = os.getenv("API_VERSION")

    # Ollama
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model_name: str = os.getenv("OLLAMA_MODEL_NAME", "MFDoom/deepseek-r1-tool-calling:8b")
    ollama_service_id: Optional[str] = os.getenv("OLLAMA_SERVICE_ID")

    # Gemini
    gemini_api_key: Optional[str] = os.getenv("GEMINI_API_KEY")
    gemini_model_name: str = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

    # LLM Mode Toggle (local / cloud)
    llm_mode: str = os.getenv("LLM_MODE", "cloud")
    local_llm_base_url: str = os.getenv("LOCAL_LLM_BASE_URL", "")
    local_llm_api_key: str = os.getenv("LOCAL_LLM_API_KEY", "")
    local_llm_model_name: str = os.getenv("LOCAL_LLM_MODEL_NAME", "qwen-9b-agent")


    # Authentication (Optional)
    use_auth: bool = os.getenv("USE_AUTH", "False").lower() in ("1", "true", "yes")
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")

    class Config:
        env_file = ".env"
        case_sensitive = False
        env_file_encoding = "utf-8"