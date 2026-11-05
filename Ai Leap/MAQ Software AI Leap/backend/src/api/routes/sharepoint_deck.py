"""Agent Eval slide-deck preview API route.

Returns a short-lived, embeddable Microsoft Graph preview URL for the agent
evaluation slide deck (PPTX) stored in a SharePoint document library. The Graph
bearer token is acquired by the frontend (MSAL) and passed via the
``X-Graph-Token`` header — the same approach as the feedback/upload routes.

The deck location defaults to the AILEAP document library and can be overridden
with environment variables:

    SHAREPOINT_DECK_HOSTNAME    e.g. testmaq.sharepoint.com
    SHAREPOINT_DECK_SITE_PATH   e.g. sites/MAQSoftwareAllEmployees
    SHAREPOINT_DECK_LIBRARY     e.g. AILEAPDocumentLibrary
    SHAREPOINT_DECK_FOLDER      e.g. AgentEvalDeck
    SHAREPOINT_DECK_FILE        e.g. Greenlight Agent.pptx
"""

import logging
import os
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from src.services.sharepoint_service import (
    SharePointConfigError,
    SharePointUploadError,
    get_deck_preview_url,
    get_file_download_url,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/sharepoint/deck-preview")
async def deck_preview(x_graph_token: Optional[str] = Header(None)):
    """Return an embeddable preview URL for the agent eval slide deck.

    The deck location is read entirely from environment variables (see
    SHAREPOINT_DECK_* in .env). Hostname falls back to SHAREPOINT_HOSTNAME.
    """
    if not x_graph_token:
        raise HTTPException(
            status_code=401,
            detail="Missing Graph token. Please sign in and try again.",
        )

    hostname = os.getenv(
        "SHAREPOINT_DECK_HOSTNAME", os.getenv("SHAREPOINT_HOSTNAME", "")
    ).strip()
    site_path = os.getenv("SHAREPOINT_DECK_SITE_PATH", "").strip().strip("/")
    library = os.getenv("SHAREPOINT_DECK_LIBRARY", "").strip()
    folder = os.getenv("SHAREPOINT_DECK_FOLDER", "").strip().strip("/")
    file_name = os.getenv("SHAREPOINT_DECK_FILE", "").strip()

    missing = [
        name
        for name, value in (
            ("SHAREPOINT_DECK_HOSTNAME / SHAREPOINT_HOSTNAME", hostname),
            ("SHAREPOINT_DECK_SITE_PATH", site_path),
            ("SHAREPOINT_DECK_LIBRARY", library),
            ("SHAREPOINT_DECK_FILE", file_name),
        )
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=500,
            detail="Agent Eval deck is not configured. Missing env vars: "
            + ", ".join(missing),
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
        logger.error("SharePoint deck configuration error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except SharePointUploadError as exc:
        logger.error("SharePoint deck preview error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Unexpected error generating deck preview")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc

    return {"preview_url": preview_url, "file_name": file_name}


@router.get("/sharepoint/video-url")
async def deck_video(x_graph_token: Optional[str] = Header(None)):
    """Return a pre-authenticated direct download URL for the agent eval demo video.

    The video lives in the same SharePoint document library as the deck (reuses
    SHAREPOINT_DECK_* env, with the filename in SHAREPOINT_DECK_VIDEO_FILE). The
    returned URL is a temporary Graph download link that plays directly in a
    <video> tag — no iframe, so no CSP frame-ancestors restriction.
    """
    if not x_graph_token:
        raise HTTPException(
            status_code=401,
            detail="Missing Graph token. Please sign in and try again.",
        )

    hostname = os.getenv(
        "SHAREPOINT_DECK_HOSTNAME", os.getenv("SHAREPOINT_HOSTNAME", "")
    ).strip()
    site_path = os.getenv("SHAREPOINT_DECK_SITE_PATH", "").strip().strip("/")
    library = os.getenv("SHAREPOINT_DECK_LIBRARY", "").strip()
    folder = os.getenv("SHAREPOINT_DECK_FOLDER", "").strip().strip("/")
    file_name = os.getenv("SHAREPOINT_DECK_VIDEO_FILE", "").strip()

    missing = [
        name
        for name, value in (
            ("SHAREPOINT_DECK_HOSTNAME / SHAREPOINT_HOSTNAME", hostname),
            ("SHAREPOINT_DECK_SITE_PATH", site_path),
            ("SHAREPOINT_DECK_LIBRARY", library),
            ("SHAREPOINT_DECK_VIDEO_FILE", file_name),
        )
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=500,
            detail="Agent Eval video is not configured. Missing env vars: "
            + ", ".join(missing),
        )

    try:
        video_url, resolved_name = get_file_download_url(
            graph_token=x_graph_token,
            hostname=hostname,
            site_path=site_path,
            library=library,
            folder=folder,
            file_name=file_name,
        )
    except SharePointConfigError as exc:
        logger.error("SharePoint video configuration error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except SharePointUploadError as exc:
        logger.error("SharePoint video url error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Unexpected error generating video url")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc

    return {"video_url": video_url, "file_name": resolved_name}


@router.get("/sharepoint/video-url")
async def deck_video(x_graph_token: Optional[str] = Header(None)):
    """Return a pre-authenticated direct download URL for the agent eval demo video.

    The video lives in the same SharePoint document library as the deck (reuses
    SHAREPOINT_DECK_* env, with the filename in SHAREPOINT_DECK_VIDEO_FILE). The
    returned URL is a temporary Graph download link that plays directly in a
    <video> tag — no iframe, so no CSP frame-ancestors restriction.
    """
    if not x_graph_token:
        raise HTTPException(
            status_code=401,
            detail="Missing Graph token. Please sign in and try again.",
        )

    hostname = os.getenv(
        "SHAREPOINT_DECK_HOSTNAME", os.getenv("SHAREPOINT_HOSTNAME", "")
    ).strip()
    site_path = os.getenv("SHAREPOINT_DECK_SITE_PATH", "").strip().strip("/")
    library = os.getenv("SHAREPOINT_DECK_LIBRARY", "").strip()
    folder = os.getenv("SHAREPOINT_DECK_FOLDER", "").strip().strip("/")
    file_name = os.getenv("SHAREPOINT_DECK_VIDEO_FILE", "").strip()

    missing = [
        name
        for name, value in (
            ("SHAREPOINT_DECK_HOSTNAME / SHAREPOINT_HOSTNAME", hostname),
            ("SHAREPOINT_DECK_SITE_PATH", site_path),
            ("SHAREPOINT_DECK_LIBRARY", library),
            ("SHAREPOINT_DECK_VIDEO_FILE", file_name),
        )
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=500,
            detail="Agent Eval video is not configured. Missing env vars: "
            + ", ".join(missing),
        )

    try:
        video_url, resolved_name = get_file_download_url(
            graph_token=x_graph_token,
            hostname=hostname,
            site_path=site_path,
            library=library,
            folder=folder,
            file_name=file_name,
        )
    except SharePointConfigError as exc:
        logger.error("SharePoint video configuration error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except SharePointUploadError as exc:
        logger.error("SharePoint video url error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Unexpected error generating video url")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc

    return {"video_url": video_url, "file_name": resolved_name}
