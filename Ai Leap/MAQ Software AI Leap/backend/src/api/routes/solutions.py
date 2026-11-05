"""Solution submission API.
 
Receives a solution submission from the "Submit Solution" form and uploads the
accompanying ZIP file to SharePoint as a list item attachment.
"""
 
import logging
from datetime import datetime, timezone
from typing import Optional
 
from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
 
from src.services.sharepoint_service import (
    SharePointConfigError,
    SharePointUploadError,
    upload_solution_to_sharepoint,
)
 
logger = logging.getLogger(__name__)
 
router = APIRouter()
 
MAX_ZIP_SIZE = 100 * 1024 * 1024  # 100 MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".webp")


@router.post("/solutions/upload")
async def upload_solution(
    projectTitle: str = Form(...),
    projectDescription: str = Form(...),
    category: str = Form(...),
    keyFeatures: str = Form(...),
    techStack: str = Form(...),
    demoVideoUrl: str = Form(...),
    impact: str = Form(...),
    submittedBy: str = Form(""),
    zipFile: UploadFile = File(...),
    architectureDiagram: UploadFile = File(...),
    x_graph_token: Optional[str] = Header(None),
    x_sharepoint_token: Optional[str] = Header(None),
):
    """Handle a Submit Solution request and push the ZIP to SharePoint.
 
    The Graph and SharePoint bearer tokens are acquired by the frontend (MSAL)
    and passed via the ``X-Graph-Token`` / ``X-SharePoint-Token`` headers.
    """
    if not x_graph_token or not x_sharepoint_token:
        raise HTTPException(
            status_code=401,
            detail="Missing authentication tokens. Please sign in and try again.",
        )
 
    if not zipFile.filename or not zipFile.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")
 
    zip_bytes = await zipFile.read()
    if not zip_bytes:
        raise HTTPException(status_code=400, detail="Uploaded ZIP file is empty")
    if len(zip_bytes) > MAX_ZIP_SIZE:
        raise HTTPException(status_code=400, detail="ZIP file exceeds the 100 MB limit")
 
    # Validate architecture diagram image
    if not architectureDiagram.filename:
        raise HTTPException(
            status_code=400, detail="Architecture diagram is required"
        )
    if not architectureDiagram.filename.lower().endswith(ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail="Only image files are accepted (.png, .jpg, .jpeg, .gif, .webp)",
        )

    img_bytes = await architectureDiagram.read()
    if not img_bytes:
        raise HTTPException(
            status_code=400, detail="Architecture diagram file is empty"
        )
    if len(img_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Architecture diagram exceeds the 10 MB limit",
        )

    submitted_at = datetime.now(timezone.utc).isoformat()

    try:
        result = upload_solution_to_sharepoint(
            graph_token=x_graph_token,
            sp_token=x_sharepoint_token,
            zip_filename=zipFile.filename,
            zip_bytes=zip_bytes,
            project_title=projectTitle,
            description=projectDescription,
            category=category,
            key_features=keyFeatures,
            tech_stack=techStack,
            demo_video_url=demoVideoUrl,
            impact_summary=impact,
            submitted_by=submittedBy or "",
            submitted_at=submitted_at,
            img_filename=architectureDiagram.filename,
            img_bytes=img_bytes,
        )
    except SharePointConfigError as exc:
        logger.error("SharePoint configuration error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except SharePointUploadError as exc:
        logger.error("SharePoint upload error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - unexpected failure
        logger.exception("Unexpected error during solution upload")
        raise HTTPException(
            status_code=500, detail=f"Unexpected error: {exc}"
        ) from exc
 
    return {
        "success": True,
        "message": "Solution uploaded to SharePoint successfully.",
        "item_id": result["item_id"],
        "list_name": result["list_name"],
    }
 
 