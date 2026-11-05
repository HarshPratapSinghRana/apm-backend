"""
pipeline.py - Standalone pipeline runner (moved from app.py)
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Paths & Logging
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
ENV_PATH = PROJECT_ROOT / ".env"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)

# Load environment
load_dotenv(ENV_PATH, override=True)

# ---------------------------------------------------------------------------
# Imports (after dotenv so modules can read env at import time if needed)
# ---------------------------------------------------------------------------
from Services.chunking import sliding_window_chunk, get_relevant_chunks
from Services.DocIntelligence import extract_text_from_pdf_url
from Services.llm import call_llm_on_chunks, refine_responses


# ---------------------------------------------------------------------------
# Validate that all required .env fields are present
# ---------------------------------------------------------------------------
REQUIRED_ENV = [
    "ENDPOINT",
    "KEY",
    "LLM_PROVIDER",
    "LLM_KEY",
    "LLM_MODEL_NAME",
    "USER_QUERY",
    "PDF_URL",
]


def _validate_env() -> dict:
    """Return a dict of env values or exit if anything is missing."""
    values = {}
    missing = []
    for key in REQUIRED_ENV:
        val = os.getenv(key, "").strip()
        if not val:
            missing.append(key)
        values[key] = val

    if missing:
        logger.error(
            "Missing required .env fields: %s\n"
            "Please fill them in the .env file or run main.py to configure.",
            ", ".join(missing),
        )
        sys.exit(1)

    return values


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------
async def run_pipeline() -> str:
    """Execute the full extraction pipeline and return the final answer."""

    env = _validate_env()

    pdf_url = env["PDF_URL"]
    user_query = env["USER_QUERY"]

    # ---- 1. Extract text from PDF via Azure Doc Intelligence ----
    logger.info("Extracting text from PDF: %s", pdf_url)
    document_text = extract_text_from_pdf_url(pdf_url)

    if not document_text.strip():
        logger.error("No text could be extracted from the PDF.")
        sys.exit(1)

    logger.info("Extracted %d characters of text.", len(document_text))

    # ---- 2. Chunk the extracted text ----
    all_chunks = sliding_window_chunk(document_text)
    logger.info("Total chunks created: %d", len(all_chunks))

    # ---- 3. Filter relevant chunks ----
    relevant_chunks = get_relevant_chunks(all_chunks, user_query)
    logger.info("Relevant chunks selected: %d", len(relevant_chunks))

    # ---- 4. Call LLM on each relevant chunk (parallel) ----
    logger.info("Calling LLM (%s / %s) on chunks...", env["LLM_PROVIDER"], env["LLM_MODEL_NAME"])
    raw_responses = await call_llm_on_chunks(relevant_chunks, user_query)

    # ---- 5. Refine / merge chunk responses ----
    logger.info("Refining %d chunk responses into final answer...", len(raw_responses))
    final_answer = await refine_responses(raw_responses, user_query)

    return final_answer


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    logger.info("=" * 60)
    logger.info("Document Intelligence + LLM Extraction Pipeline")
    logger.info("=" * 60)

    final_answer = asyncio.run(run_pipeline())

    print("\n" + "=" * 60)
    print("FINAL ANSWER")
    print("=" * 60)
    print(final_answer)
    print("=" * 60 + "\n")

    # Optionally save to file
    output_path = BASE_DIR / "output.txt"
    output_path.write_text(final_answer, encoding="utf-8")
    logger.info("Answer saved to %s", output_path)


if __name__ == "__main__":
    main()
