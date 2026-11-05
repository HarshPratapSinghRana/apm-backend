"""Code Versioning API.

Manages version history, uploads, and file-level diffs for use-case codebases.
Supports Azure Blob Storage, local file storage, and ADO git integration.
"""

import json
import os
import shutil
import zipfile
import difflib
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ── Storage paths ──────────────────────────────────────────────────────
VERSIONS_DIR = Path(__file__).parent.parent.parent.parent / "Files" / "versions"
VERSIONS_DIR.mkdir(parents=True, exist_ok=True)


# ── Models ─────────────────────────────────────────────────────────────

class PersonModel(BaseModel):
    name: str
    email: str
    role: str = "Contributor"


class VersionEntry(BaseModel):
    version: str
    uploaded_by: PersonModel
    date: str
    changelog: str
    size_kb: Optional[int] = None


class VersionsResponse(BaseModel):
    current_version: str
    versions: List[VersionEntry]


class DiffFile(BaseModel):
    path: str
    status: str  # "added" | "removed" | "modified" | "unchanged"
    diff_lines: Optional[List[str]] = None  # unified diff lines


class DiffResponse(BaseModel):
    from_version: str
    to_version: str
    files: List[DiffFile]


# ── Helpers ────────────────────────────────────────────────────────────

def _versions_meta_path(use_case_id: str) -> Path:
    return VERSIONS_DIR / use_case_id / "versions.json"


def _load_versions(use_case_id: str) -> Dict[str, Any]:
    meta_path = _versions_meta_path(use_case_id)
    if meta_path.exists():
        return json.loads(meta_path.read_text(encoding="utf-8"))
    return {"current_version": "v1.0", "versions": []}


def _save_versions(use_case_id: str, data: Dict[str, Any]):
    meta_path = _versions_meta_path(use_case_id)
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _version_dir(use_case_id: str, version: str) -> Path:
    return VERSIONS_DIR / use_case_id / version


def _next_version(current: str) -> str:
    import re
    m = re.match(r"^v(\d+)\.(\d+)$", current)
    if not m:
        return "v1.1"
    return f"v{m.group(1)}.{int(m.group(2)) + 1}"


def _extract_files_from_dir(root: Path, base: Path | None = None) -> Dict[str, str]:
    """Walk a directory and return {relative_path: content}."""
    if base is None:
        base = root
    files: Dict[str, str] = {}
    for p in sorted(root.rglob("*")):
        if p.is_file():
            rel = str(p.relative_to(base)).replace("\\", "/")
            try:
                files[rel] = p.read_text(encoding="utf-8", errors="replace")
            except Exception:
                files[rel] = "<binary file>"
    return files


# ── Routes ─────────────────────────────────────────────────────────────

@router.get("/versions/{use_case_id}", response_model=VersionsResponse)
async def get_versions(use_case_id: str):
    """Get version history for a use case."""
    data = _load_versions(use_case_id)
    return VersionsResponse(
        current_version=data.get("current_version", "v1.0"),
        versions=data.get("versions", []),
    )


@router.post("/versions/upload")
async def upload_version(
    use_case_id: str = Form(...),
    changelog: str = Form(...),
    uploader_name: str = Form(...),
    uploader_email: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload a new code version (zip file). Auto-increments version number."""
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")

    data = _load_versions(use_case_id)
    current = data.get("current_version", "v1.0")
    new_version = _next_version(current)

    # Create version directory
    version_dir = _version_dir(use_case_id, new_version)
    version_dir.mkdir(parents=True, exist_ok=True)

    # Save the zip
    zip_path = version_dir / "code.zip"
    content = await file.read()
    zip_path.write_bytes(content)

    # Extract for diff support
    extract_dir = version_dir / "extracted"
    extract_dir.mkdir(exist_ok=True)
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(extract_dir)
    except zipfile.BadZipFile:
        shutil.rmtree(version_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Invalid zip file")

    # Update metadata
    size_kb = len(content) // 1024
    new_entry = {
        "version": new_version,
        "uploaded_by": {
            "name": uploader_name,
            "email": uploader_email,
            "role": "Contributor",
        },
        "date": datetime.now(timezone.utc).isoformat(),
        "changelog": changelog,
        "size_kb": size_kb,
    }

    data["versions"].insert(0, new_entry)
    data["current_version"] = new_version
    _save_versions(use_case_id, data)

    return {"success": True, "version": new_version, "size_kb": size_kb}


@router.get("/versions/{use_case_id}/{version}")
async def download_version(use_case_id: str, version: str):
    """Download a specific version's zip file."""
    zip_path = _version_dir(use_case_id, version) / "code.zip"
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail=f"Version {version} not found")

    from fastapi.responses import FileResponse
    return FileResponse(
        path=str(zip_path),
        filename=f"{use_case_id}-{version}.zip",
        media_type="application/zip",
    )


@router.get("/versions/{use_case_id}/diff/{from_version}/{to_version}", response_model=DiffResponse)
async def get_diff(use_case_id: str, from_version: str, to_version: str):
    """Get file-level diff between two versions."""
    from_dir = _version_dir(use_case_id, from_version) / "extracted"
    to_dir = _version_dir(use_case_id, to_version) / "extracted"

    if not from_dir.exists():
        raise HTTPException(status_code=404, detail=f"Version {from_version} not found")
    if not to_dir.exists():
        raise HTTPException(status_code=404, detail=f"Version {to_version} not found")

    from_files = _extract_files_from_dir(from_dir)
    to_files = _extract_files_from_dir(to_dir)

    all_paths = sorted(set(list(from_files.keys()) + list(to_files.keys())))
    diff_files: List[DiffFile] = []

    for path in all_paths:
        if path not in from_files:
            diff_files.append(DiffFile(path=path, status="added"))
        elif path not in to_files:
            diff_files.append(DiffFile(path=path, status="removed"))
        elif from_files[path] != to_files[path]:
            diff_lines = list(difflib.unified_diff(
                from_files[path].splitlines(keepends=True),
                to_files[path].splitlines(keepends=True),
                fromfile=f"{from_version}/{path}",
                tofile=f"{to_version}/{path}",
                lineterm="",
            ))
            diff_files.append(DiffFile(path=path, status="modified", diff_lines=diff_lines))

    return DiffResponse(
        from_version=from_version,
        to_version=to_version,
        files=diff_files,
    )
