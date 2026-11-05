"""Agent feedback API route.

Receives a Like/Dislike + optional comment from the agent details page and
writes it to the ``AI-Leap-Agent-Feedback`` SharePoint list using the same
Graph/SharePoint bearer-token approach as the solution-upload route.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from src.services.sharepoint_service import (
    SharePointConfigError,
    SharePointUploadError,
    get_feedback_summary_from_sharepoint,
    submit_feedback_to_sharepoint,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Short-lived in-memory cache so the sort doesn't hit SharePoint on every load.
_summary_cache: dict = {"data": None, "ts": 0.0}
_SUMMARY_TTL_SECONDS = 60.0


class FeedbackRequest(BaseModel):
    agentName: str = Field(..., min_length=1, max_length=300)
    vote: Literal["Like", "Dislike"]
    comment: Optional[str] = Field(default="", max_length=2000)
    submittedBy: Optional[str] = Field(default="", max_length=300)


@router.post("/feedback")
async def submit_feedback(
    body: FeedbackRequest,
    x_graph_token: Optional[str] = Header(None),
    x_sharepoint_token: Optional[str] = Header(None),
):
    """Handle an agent feedback submission and write it to SharePoint.

    The Graph and SharePoint bearer tokens are acquired by the frontend (MSAL)
    and passed via the ``X-Graph-Token`` / ``X-SharePoint-Token`` headers.
    """
    if not x_graph_token or not x_sharepoint_token:
        raise HTTPException(
            status_code=401,
            detail="Missing authentication tokens. Please sign in and try again.",
        )

    submitted_at = datetime.now(timezone.utc).isoformat()

    try:
        result = submit_feedback_to_sharepoint(
            graph_token=x_graph_token,
            sp_token=x_sharepoint_token,
            agent_name=body.agentName,
            vote=body.vote,
            comment=body.comment or "",
            submitted_by=body.submittedBy or "",
            submitted_at=submitted_at,
        )
    except SharePointConfigError as exc:
        logger.error("SharePoint configuration error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except SharePointUploadError as exc:
        logger.error("SharePoint feedback upload error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Unexpected error during feedback submission")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc

    # A new vote changes the aggregate, so drop the cached summary.
    _summary_cache["data"] = None
    _summary_cache["ts"] = 0.0

    return {
        "success": True,
        "message": "Feedback submitted successfully.",
        "item_id": result["item_id"],
        "list_name": result["list_name"],
    }


@router.get("/feedback/summary")
async def feedback_summary(
    x_graph_token: Optional[str] = Header(None),
):
    """Return aggregated Like/Dislike counts per agent from the SharePoint list.

    Used by the frontend to sort agents by popularity. Results are cached
    in-memory for a short window so repeated sidebar loads don't re-query
    SharePoint. Only a Microsoft Graph token (``X-Graph-Token``) is required.
    """
    now = time.time()
    logger.info("GET /feedback/summary triggered (graph_token_present=%s)", bool(x_graph_token))

    cached = _summary_cache.get("data")
    if cached is not None and (now - _summary_cache.get("ts", 0.0)) < _SUMMARY_TTL_SECONDS:
        age = round(now - _summary_cache.get("ts", 0.0), 1)
        logger.info("Returning cached feedback summary (%d agents, age=%ss)", len(cached), age)
        return {"summary": cached, "cached": True}

    if not x_graph_token:
        logger.warning("Feedback summary requested without a Graph token — returning 401")
        raise HTTPException(
            status_code=401,
            detail="Missing Graph token. Please sign in and try again.",
        )

    logger.info("Cache miss — fetching feedback summary from SharePoint")
    try:
        summary = get_feedback_summary_from_sharepoint(graph_token=x_graph_token)
    except SharePointConfigError as exc:
        logger.error("SharePoint configuration error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except SharePointUploadError as exc:
        logger.error("SharePoint feedback summary error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Unexpected error fetching feedback summary")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc

    total_votes = sum(c.get("likes", 0) + c.get("dislikes", 0) for c in summary.values())
    logger.info(
        "Feedback summary built: %d agents, %d total votes",
        len(summary),
        total_votes,
    )

    _summary_cache["data"] = summary
    _summary_cache["ts"] = now
    return {"summary": summary, "cached": False}
