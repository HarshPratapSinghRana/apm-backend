"""
chunking.py
-----------
Sliding-window text chunker for OCR / document text.
Used by the FastAPI pipeline after Azure Document Intelligence extraction.
"""

import re
from typing import List


def clean_ocr_text(text: str) -> str:
    """Normalize whitespace in OCR text."""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()


def get_relevant_chunks(
    chunks: List[str],
    user_query: str
) -> List[str]:
    """
    Filter chunks that contain at least one keyword from the user query.
    Falls back to first 2 chunks if nothing matches.
    """
    query_keywords = user_query.lower().split()
    relevant = [
        chunk for chunk in chunks
        if any(kw in chunk.lower() for kw in query_keywords)
    ]
    return relevant if relevant else chunks[:2]


def sliding_window_chunk(
    text: str,
    chunk_size: int = 600,
    overlap: int = 150,
) -> List[str]:
    """
    Sliding-window chunker - fast and effective for:
      - Azure OCR text / Document Intelligence output
      - Invoices, SEC filings, long documents
      - Parallel LLM pipelines
    """
    cleaned = clean_ocr_text(text)
    chunks: List[str] = []
    start = 0

    while start < len(cleaned):
        end = start + chunk_size
        chunks.append(cleaned[start:end])
        start += chunk_size - overlap

    return chunks