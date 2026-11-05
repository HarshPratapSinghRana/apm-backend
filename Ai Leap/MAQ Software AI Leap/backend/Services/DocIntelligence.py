import os
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from dotenv import load_dotenv

load_dotenv()


class DocIntelligenceService:

    def __init__(self, endpoint: str, key: str):
        self.client = DocumentIntelligenceClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(key)
        )

    def extract_text(self, url: str) -> str:

        poller = self.client.begin_analyze_document(
            "prebuilt-read",
            body=AnalyzeDocumentRequest(
                url_source=url
            ),
        )

        result = poller.result()
        return result.content


def extract_text_from_pdf_url(pdf_url: str) -> str:
    """Standalone helper used by backend/app.py pipeline."""
    endpoint = os.getenv("ENDPOINT", "")
    key = os.getenv("KEY", "")
    service = DocIntelligenceService(endpoint, key)
    return service.extract_text(pdf_url)