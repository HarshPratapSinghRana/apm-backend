from src.core.agent import LegalAgent
from src.services.llm_service import create_llm_service
from src.config.settings import Settings

settings = Settings()
llm_instance = create_llm_service(settings)
llm_service = llm_instance.get_service()
agent = LegalAgent(llm_service)