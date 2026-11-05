"""Per-solution artifact deck preview API route.

Some solutions surface a slide deck (PPTX/PDF) instead of a code base — e.g.
CertyFAST shows a presentation in an "Artifacts" tab. The SharePoint location of
each deck lives server-side in ``media_urls.json`` under the solution's
``artifact_deck`` entry, so the library / folder / file are never exposed to the
browser bundle. The frontend only sees a ``has_artifacts`` flag (via
``/api/media-urls/{id}``) and requests the embeddable preview here with a
delegated Microsoft Graph token (same pattern as the Agent Eval deck).

Hostname / site / library fall back to the SHAREPOINT_DECK_* env vars when not
specified on the deck entry.
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from src.services.sharepoint_service import (
    SharePointConfigError,
    SharePointUploadError,
    get_deck_preview_url,
)

logger = logging.getLogger(__name__)

router = APIRouter()

_MEDIA_URLS_PATH = Path(__file__).resolve().parents[3] / "media_urls.json"


def _load_artifact_deck(use_case_id: str) -> Optional[dict]:
    """Return the ``artifact_deck`` config for a solution, or None."""
    try:
        with open(_MEDIA_URLS_PATH, "r", encoding="utf-8") as f:
            media = json.load(f)
    except Exception:
        return None
    entry = media.get(use_case_id) or {}
    deck = entry.get("artifact_deck")
    return deck if isinstance(deck, dict) else None


@router.get("/sharepoint/artifact-preview/{use_case_id}")
async def artifact_preview(
    use_case_id: str, x_graph_token: Optional[str] = Header(None)
):
    """Return an embeddable preview URL for a solution's artifact deck."""
    if not x_graph_token:
        raise HTTPException(
            status_code=401,
            detail="Missing Graph token. Please sign in and try again.",
        )

    deck = _load_artifact_deck(use_case_id)
    if not deck:
        raise HTTPException(
            status_code=404,
            detail=f"No artifact deck configured for solution: {use_case_id}",
        )

    hostname = (
        deck.get("hostname")
        or os.getenv("SHAREPOINT_DECK_HOSTNAME", os.getenv("SHAREPOINT_HOSTNAME", ""))
    ).strip()
    site_path = (
        deck.get("site_path") or os.getenv("SHAREPOINT_DECK_SITE_PATH", "")
    ).strip().strip("/")
    library = (deck.get("library") or os.getenv("SHAREPOINT_DECK_LIBRARY", "")).strip()
    folder = (deck.get("folder") or "").strip().strip("/")
    file_name = (deck.get("file") or "").strip()

    missing = [
        name
        for name, value in (
            ("hostname", hostname),
            ("site_path", site_path),
            ("library", library),
            ("file", file_name),
        )
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=500,
            detail="Artifact deck is misconfigured. Missing: " + ", ".join(missing),
        )

    try:
        preview_url = get_deck_preview_url(
            graph_token=x_graph_token,
            hostname=hostname,
            site_path=site_path,
            library=library,
            folder=folder,
            file_name=file_name,
        )
    except SharePointConfigError as exc:
        logger.error("SharePoint artifact configuration error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except SharePointUploadError as exc:
        logger.error("SharePoint artifact preview error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Unexpected error generating artifact preview")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc

    return {"preview_url": preview_url, "file_name": file_name}
