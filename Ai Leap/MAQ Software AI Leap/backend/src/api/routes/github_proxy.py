"""GitHub proxy API.

Proxies GitHub API calls so the personal access token never reaches the browser.
The token is read from the GITHUB_PAT environment variable.

Includes in-memory caching for tree and file responses to reduce GitHub API calls
and stay within rate limits.
"""

import logging
import os
import re
import io
import zipfile
import hashlib
import base64
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.services.sharepoint_service import (
    SharePointConfigError,
    SharePointUploadError,
    submit_contribution_to_sharepoint,
)

router = APIRouter()
logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"

# ---------- simple in-memory cache ----------
_tree_cache: Dict[str, Any] = {}
_file_cache: Dict[str, Any] = {}


def _headers() -> Dict[str, str]:
    token = os.getenv("GITHUB_PAT", "")
    h: Dict[str, str] = {"Accept": "application/vnd.github+json"}
    if token and token != "ghp_your_personal_access_token_here":
        h["Authorization"] = f"Bearer {token}"
    else:
        logger.warning(
            "GITHUB_PAT is not set or is still the placeholder value. "
            "Requests to private repos will fail with 401/403."
        )
    return h


def _parse_repo(repo_url: str) -> tuple[str, str]:
    """Extract owner/repo from a GitHub URL like https://github.com/owner/repo."""
    parts = repo_url.rstrip("/").split("/")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid repo URL — expected https://github.com/owner/repo")
    return parts[-2], parts[-1]


def _github_error(status_code: int, body: str, owner: str, repo: str, context: str = "") -> HTTPException:
    """Convert a GitHub API error response into a clear HTTPException."""
    prefix = f"[{context}] " if context else ""
    if status_code == 401:
        return HTTPException(
            status_code=401,
            detail=f"{prefix}GitHub authentication failed. Check that GITHUB_PAT is set correctly in the backend .env file."
        )
    if status_code == 403:
        return HTTPException(
            status_code=403,
            detail=(
                f"{prefix}GitHub access denied for {owner}/{repo}. "
                "If this is a private repo, make sure the PAT has 'repo' scope and the account has access."
            )
        )
    if status_code == 404:
        return HTTPException(
            status_code=404,
            detail=f"{prefix}404 from GitHub for {owner}/{repo}: {body[:300]}"
        )
    if status_code == 422:
        return HTTPException(
            status_code=422,
            detail=f"{prefix}GitHub API returned 422 (Unprocessable Entity) for {owner}/{repo}: {body[:300]}"
        )
    return HTTPException(
        status_code=502,
        detail=f"{prefix}GitHub API returned {status_code} for {owner}/{repo}: {body[:300]}"
    )


@router.get("/github/tree")
async def get_repo_tree(repo_url: str, ref: str = "main"):
    """Return the full recursive file tree for a repo."""
    cache_key = f"{repo_url}:{ref}"
    if cache_key in _tree_cache:
        return _tree_cache[cache_key]

    try:
        owner, repo = _parse_repo(repo_url)
        url = f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/{ref}?recursive=1"
        logger.info("Fetching GitHub tree: %s", url)

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=_headers())

        logger.info("GitHub tree response: %d for %s/%s@%s", resp.status_code, owner, repo, ref)

        if resp.status_code != 200:
            logger.error("GitHub tree error %d: %s", resp.status_code, resp.text[:500])
            raise _github_error(resp.status_code, resp.text, owner, repo)

        data = resp.json()

        # Build nested folder structure matching the blob codebase format.
        # GitHub returns a flat list of all paths. We reconstruct a nested tree.
        # IMPORTANT: folder nodes (type "tree") must always carry "children": []
        # because they may appear as a leaf first and then be traversed as a parent.
        root: Dict[str, Any] = {"name": repo, "type": "folder", "children": []}
        for item in data.get("tree", []):
            parts = item["path"].split("/")
            current = root
            for i, part in enumerate(parts):
                if i == len(parts) - 1:
                    # Leaf node — file or folder
                    node_type = "folder" if item["type"] == "tree" else "file"
                    node: Dict[str, Any] = {
                        "name": part,
                        "type": node_type,
                        "path": item["path"],
                        "sha": item.get("sha", ""),
                    }
                    if node_type == "folder":
                        # Folders always need children so they can be traversed later
                        node["children"] = []
                    current["children"].append(node)
                else:
                    # Intermediate path segment — find or create a folder node
                    found = None
                    for child in current["children"]:
                        if child["name"] == part and child["type"] == "folder":
                            found = child
                            break
                    if not found:
                        found = {"name": part, "type": "folder", "children": []}
                        current["children"].append(found)
                    elif "children" not in found:
                        # Defensive: folder was previously added as leaf without children
                        found["children"] = []
                    current = found

        result = {"structure": root, "sha": data.get("sha", "")}
        _tree_cache[cache_key] = result
        logger.info("GitHub tree built successfully for %s/%s (%d items)", owner, repo, len(data.get("tree", [])))
        return result

    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.error("Timeout fetching GitHub tree for %s", repo_url)
        raise HTTPException(status_code=504, detail="GitHub API request timed out. Please try again.")
    except httpx.RequestError as e:
        logger.error("Network error fetching GitHub tree for %s: %s", repo_url, str(e))
        raise HTTPException(status_code=502, detail=f"Could not reach GitHub API: {str(e)}")
    except Exception as e:
        logger.exception("Unexpected error fetching GitHub tree for %s", repo_url)
        raise HTTPException(status_code=500, detail=f"Internal error fetching repository tree: {str(e)}")


@router.get("/github/file")
async def get_file_content(repo_url: str, path: str, ref: str = "main"):
    """Return decoded content of a single file."""
    cache_key = f"{repo_url}:{ref}:{path}"
    if cache_key in _file_cache:
        return _file_cache[cache_key]

    try:
        owner, repo = _parse_repo(repo_url)
        url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}?ref={ref}"
        logger.info("Fetching GitHub file: %s", url)

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=_headers())

        logger.info("GitHub file response: %d for %s", resp.status_code, path)

        if resp.status_code != 200:
            logger.error("GitHub file error %d: %s", resp.status_code, resp.text[:500])
            raise _github_error(resp.status_code, resp.text, owner, repo)

        data = resp.json()
        content = ""
        if data.get("encoding") == "base64" and data.get("content"):
            content = base64.b64decode(data["content"]).decode("utf-8", errors="replace")

        result = {"content": content, "name": data.get("name", path), "size": data.get("size", 0)}
        _file_cache[cache_key] = result
        return result

    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.error("Timeout fetching GitHub file %s", path)
        raise HTTPException(status_code=504, detail="GitHub API request timed out.")
    except httpx.RequestError as e:
        logger.error("Network error fetching GitHub file %s: %s", path, str(e))
        raise HTTPException(status_code=502, detail=f"Could not reach GitHub API: {str(e)}")
    except Exception as e:
        logger.exception("Unexpected error fetching GitHub file %s", path)
        raise HTTPException(status_code=500, detail=f"Internal error fetching file: {str(e)}")


@router.get("/github/download-zip")
async def download_zip(repo_url: str, ref: str = "main"):
    """Stream a zip archive of the repo at `ref`, authenticated server-side
    with GITHUB_PAT.

    The public archive URL (github.com/{owner}/{repo}/archive/...) relies on
    the *browser's* own GitHub session, not our backend's token — so for a
    private repo it 404s unless the browser happens to be logged into GitHub
    with access. Proxying through here means the Download button works
    regardless of the browser's GitHub login state, using the same PAT that
    already powers the rest of this file.

    The response is streamed in chunks (never fully buffered in backend
    memory) and capped at MAX_ZIP_SIZE — the same limit already enforced on
    contribution uploads — to bound memory/bandwidth use per request.
    """
    owner, repo = _parse_repo(repo_url)
    url = f"{GITHUB_API}/repos/{owner}/{repo}/zipball/{ref}"

    client = httpx.AsyncClient(timeout=60, follow_redirects=True)
    try:
        req = client.build_request("GET", url, headers=_headers())
        resp = await client.send(req, stream=True)
    except httpx.TimeoutException:
        await client.aclose()
        logger.error("Timeout downloading zip archive for %s@%s", repo_url, ref)
        raise HTTPException(status_code=504, detail="GitHub API request timed out while downloading the archive.")
    except httpx.RequestError as e:
        await client.aclose()
        logger.error("Network error downloading zip archive for %s@%s: %s", repo_url, ref, str(e))
        raise HTTPException(status_code=502, detail=f"Could not reach GitHub API: {str(e)}")

    if resp.status_code != 200:
        body = await resp.aread()
        await resp.aclose()
        await client.aclose()
        raise _github_error(
            resp.status_code, body.decode("utf-8", errors="replace"), owner, repo, context="downloading zip archive"
        )

    safe_repo = re.sub(r"[^A-Za-z0-9._-]", "-", repo)
    safe_ref = re.sub(r"[^A-Za-z0-9._-]", "-", ref)
    filename = f"{safe_repo}-{safe_ref}.zip"

    async def body_iterator():
        total = 0
        try:
            async for chunk in resp.aiter_bytes(65536):
                total += len(chunk)
                if total > MAX_ZIP_SIZE:
                    logger.warning(
                        "Aborting zip download for %s/%s: exceeded %d MB cap",
                        owner, repo, MAX_ZIP_SIZE // (1024 * 1024),
                    )
                    break
                yield chunk
        finally:
            await resp.aclose()
            await client.aclose()

    return StreamingResponse(
        body_iterator(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _resolve_tag_commit_sha(
    client: httpx.AsyncClient, owner: str, repo: str, tag: str
) -> Optional[str]:
    """Resolve a tag name to the commit SHA it ultimately points at.

    Lightweight tags point directly at a commit. Annotated tags point at a
    separate tag object, which itself points at a commit — so those need one
    extra lookup to resolve down to the actual commit SHA.
    """
    ref_resp = await client.get(
        f"{GITHUB_API}/repos/{owner}/{repo}/git/ref/tags/{tag}",
        headers=_headers(),
    )
    if ref_resp.status_code != 200:
        return None
    obj = ref_resp.json().get("object", {})
    if obj.get("type") == "commit":
        return obj.get("sha")
    if obj.get("type") == "tag":
        tag_resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/git/tags/{obj.get('sha')}",
            headers=_headers(),
        )
        if tag_resp.status_code == 200:
            return tag_resp.json().get("object", {}).get("sha")
    return None


@router.get("/github/releases")
async def get_releases(repo_url: str):
    """Return list of releases (versions) for a repo.

    Each release is annotated with the actual contributor whose merged PR it
    was cut from (when it can be determined), instead of just the GitHub
    account that clicked "Publish release" — since every contribution PR
    embeds a "Contributed by **Name** (email)" line in its body, we resolve
    each release's tag down to its underlying commit SHA and match that
    against merged PRs' merge_commit_sha to find the real contributor.
    Releases with no matching PR (e.g. an original baseline release cut
    before any contribution) simply fall back to the publishing maintainer.
    """
    try:
        owner, repo = _parse_repo(repo_url)

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/releases?per_page=20",
                headers=_headers(),
            )
            if resp.status_code != 200:
                raise _github_error(resp.status_code, resp.text, owner, repo)
            releases = resp.json()

            # Build {merge_commit_sha: {name, email}} from merged PR bodies so
            # each release can be attributed to its real contributor.
            merge_sha_to_contributor: Dict[str, Dict[str, str]] = {}
            pr_resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/pulls?state=closed&per_page=100",
                headers=_headers(),
            )
            if pr_resp.status_code == 200:
                for pr in pr_resp.json():
                    if not pr.get("merged_at") or not pr.get("merge_commit_sha"):
                        continue
                    match = _CONTRIBUTOR_PATTERN.search(pr.get("body") or "")
                    if match:
                        merge_sha_to_contributor[pr["merge_commit_sha"]] = {
                            "name": match.group(1).strip(),
                            "email": match.group(2).strip(),
                        }

            result = []
            for r in releases:
                tag = r.get("tag_name", "")
                contributor = None
                if tag:
                    commit_sha = await _resolve_tag_commit_sha(client, owner, repo, tag)
                    if commit_sha and commit_sha in merge_sha_to_contributor:
                        contributor = merge_sha_to_contributor[commit_sha]

                result.append(
                    {
                        "tag": tag,
                        "name": r.get("name", tag),
                        "date": r.get("published_at", ""),
                        "body": r.get("body", ""),
                        "author": r.get("author", {}).get("login", ""),
                        "contributor_name": contributor["name"] if contributor else None,
                        "contributor_email": contributor["email"] if contributor else None,
                        "url": r.get("html_url", ""),
                    }
                )
            return result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error fetching releases for %s", repo_url)
        raise HTTPException(status_code=500, detail=f"Internal error fetching releases: {str(e)}")


@router.get("/github/pat-status")
async def check_pat_status():
    """Debug endpoint: check if GITHUB_PAT is configured (does NOT expose the token)."""
    token = os.getenv("GITHUB_PAT", "")
    is_placeholder = token == "ghp_your_personal_access_token_here"
    is_set = bool(token) and not is_placeholder
    return {
        "pat_configured": is_set,
        "pat_length": len(token) if is_set else 0,
        "message": (
            "GITHUB_PAT is configured correctly." if is_set
            else "GITHUB_PAT is NOT set or is still the placeholder. Update it in backend_224/.env and restart the backend."
        )
    }


@router.post("/github/clear-cache")
async def clear_github_cache():
    """Clear the in-memory cache (useful during development)."""
    _tree_cache.clear()
    _file_cache.clear()
    return {"message": "GitHub cache cleared"}


# ---------- Contribution workflow ----------
# Contributors download the full project, edit/add/remove files locally with
# their own tools, then upload the whole thing back as a zip (see the
# zip-upload workflow near the bottom of this file). We still need a branch
# slug helper here since it's shared by the zip endpoint.

def _branch_slug(text: str) -> str:
    slug = "".join(c if c.isalnum() else "-" for c in text.lower()).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or "anon"


@router.get("/github/contributors")
async def get_contributors(repo_url: str):
    """Return the list of contributors for a repo, derived from merged commit history."""
    try:
        owner, repo = _parse_repo(repo_url)
        url = f"{GITHUB_API}/repos/{owner}/{repo}/contributors?per_page=100"

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=_headers())

        if resp.status_code != 200:
            raise _github_error(resp.status_code, resp.text, owner, repo)

        contributors = resp.json()
        return [
            {
                "login": c.get("login", ""),
                "avatar_url": c.get("avatar_url", ""),
                "contributions": c.get("contributions", 0),
                "url": c.get("html_url", ""),
            }
            for c in contributors
            if c.get("type") == "User"
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error fetching contributors for %s", repo_url)
        raise HTTPException(status_code=500, detail=f"Internal error fetching contributors: {str(e)}")


_CONTRIBUTOR_PATTERN = re.compile(r"Contributed by \*\*(.+?)\*\*\s*\((.+?)\)")


@router.get("/github/merged-contributors")
async def get_merged_contributors(repo_url: str):
    """Derive the real contributor list from merged PR descriptions.

    Every commit made through the portal's Contribute flow is authored by the
    shared bot account (GITHUB_PAT owner), so GitHub's native /contributors
    endpoint would only ever show that one account. Instead, we read the
    "Contributed by **Name** (email)" line we embed in every PR body
    (see submit_contribution / submit_contribution_batch) and aggregate by
    the actual portal user who submitted each merged Pull Request.
    """
    try:
        owner, repo = _parse_repo(repo_url)
        url = f"{GITHUB_API}/repos/{owner}/{repo}/pulls?state=closed&per_page=100"

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=_headers())

        if resp.status_code != 200:
            raise _github_error(resp.status_code, resp.text, owner, repo)

        prs = resp.json()
        contributors: Dict[str, Dict[str, Any]] = {}

        for pr in prs:
            if not pr.get("merged_at"):
                continue
            match = _CONTRIBUTOR_PATTERN.search(pr.get("body") or "")
            if not match:
                continue
            name, email = match.group(1).strip(), match.group(2).strip()
            key = email.lower() if email and email != "no email provided" else name.lower()
            entry = contributors.setdefault(
                key,
                {
                    "name": name,
                    "email": email,
                    "contributions": 0,
                    "latest_date": pr["merged_at"],
                    "latest_pr_url": pr.get("html_url", ""),
                },
            )
            entry["contributions"] += 1
            if pr["merged_at"] > entry["latest_date"]:
                entry["latest_date"] = pr["merged_at"]
                entry["latest_pr_url"] = pr.get("html_url", "")

        return sorted(contributors.values(), key=lambda c: c["contributions"], reverse=True)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error deriving merged contributors for %s", repo_url)
        raise HTTPException(status_code=500, detail=f"Internal error deriving contributors: {str(e)}")


@router.get("/github/my-contributions")
async def get_my_contributions(repo_url: str, email: str):
    """Return every contribution PR (open, merged, or rejected) submitted by
    a specific contributor for this repo.

    Every PR opened through the Contribute flow is authored by the shared
    bot account that owns GITHUB_PAT, so GitHub's own PR notifications land
    in that account's inbox — never the actual contributor's. This endpoint
    lets a contributor pull up the live status of everything they've
    submitted (identified via the "Contributed by **Name** (email)" line
    embedded in the PR body) directly from the portal instead.
    """
    if not email.strip():
        raise HTTPException(status_code=400, detail="An email is required to look up contributions.")

    try:
        owner, repo = _parse_repo(repo_url)
        url = f"{GITHUB_API}/repos/{owner}/{repo}/pulls?state=all&per_page=100"

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=_headers())

        if resp.status_code != 200:
            raise _github_error(resp.status_code, resp.text, owner, repo, context="listing pull requests")

        prs = resp.json()
        target = email.strip().lower()
        results: List[Dict[str, Any]] = []

        for pr in prs:
            match = _CONTRIBUTOR_PATTERN.search(pr.get("body") or "")
            if not match:
                continue
            _, pr_email = match.group(1).strip(), match.group(2).strip()
            if pr_email.lower() != target:
                continue

            if pr.get("merged_at"):
                status = "merged"
            elif pr.get("state") == "closed":
                status = "rejected"
            else:
                status = "open"

            results.append({
                "pr_number": pr.get("number"),
                "title": pr.get("title", ""),
                "url": pr.get("html_url", ""),
                "status": status,
                "created_at": pr.get("created_at", ""),
                "updated_at": pr.get("updated_at", ""),
                "merged_at": pr.get("merged_at"),
            })

        results.sort(key=lambda r: r["updated_at"], reverse=True)
        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error fetching contributions for %s in %s", email, repo_url)
        raise HTTPException(status_code=500, detail=f"Internal error fetching contributions: {str(e)}")


# ---------- Zip-upload contribution workflow's shared building blocks ----------

_ACTION_LABELS = {"update": "Modified", "add": "Added", "delete": "Removed"}


class BatchFileChange(BaseModel):
    path: str
    content: str = ""
    action: str = "update"  # "update" | "add" | "delete"


# ---------- Zip-upload contribution workflow ----------
# Lets a contributor download the full project, edit/add/remove files locally
# with their own tools, then re-upload the whole folder as a zip. The backend
# diffs it against the live repo (by git blob SHA) and commits only what
# actually changed — no manual per-file staging required.

MAX_ZIP_SIZE = 100 * 1024 * 1024  # 100 MB overall upload cap
MAX_ZIP_FILE_SIZE = 2 * 1024 * 1024  # 2 MB per file (skip larger/binary assets)
MAX_ZIP_FILE_COUNT = 5000  # guard against zip bombs / huge repos

_IGNORED_DIR_PREFIXES = (
    ".git/",
    "node_modules/",
    "__pycache__/",
    ".venv/",
    "venv/",
    "env/",
    "dist/",
    "build/",
    ".next/",
    ".pytest_cache/",
    ".mypy_cache/",
)

# Extensions this tool can never faithfully diff as text, so files with these
# extensions are never auto-deleted just because they're absent from a
# re-uploaded zip (they may simply be unchanged binaries the contributor
# didn't touch).
_LIKELY_BINARY_EXTENSIONS = (
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".bmp",
    ".pdf", ".zip", ".tar", ".gz", ".7z", ".rar",
    ".exe", ".dll", ".so", ".dylib", ".bin",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
    ".mp3", ".mp4", ".mov", ".avi", ".wav",
    ".db", ".sqlite", ".sqlite3",
    ".pyc", ".class", ".jar",
)


def _git_blob_sha(text: str) -> str:
    """Compute the same SHA-1 Git uses to identify a blob's content, so we can
    detect changes without re-fetching/comparing every file's raw content."""
    content = text.encode("utf-8")
    header = f"blob {len(content)}\0".encode()
    return hashlib.sha1(header + content).hexdigest()


def _is_ignored_path(path: str) -> bool:
    lower = path.lower()
    return any(
        lower.startswith(prefix) or f"/{prefix}" in lower
        for prefix in _IGNORED_DIR_PREFIXES
    )


def _is_out_of_scope_for_delete(path: str, size: int) -> bool:
    """True if this path can never be faithfully represented by the zip diff
    (too large, binary-looking by extension, or inside an ignored directory).

    Such paths must NEVER be auto-deleted just because they're missing from a
    re-uploaded zip — that absence is expected (the contributor's zip tool,
    or our own extraction step, legitimately excludes/skips them), not a
    signal that the contributor wants the file removed from the repo.
    """
    if _is_ignored_path(path):
        return True
    if size > MAX_ZIP_FILE_SIZE:
        return True
    lower = path.lower()
    return any(lower.endswith(ext) for ext in _LIKELY_BINARY_EXTENSIONS)


def _extract_zip_files(data: bytes) -> Tuple[Dict[str, str], List[str]]:
    """Extract a zip into {relative_path: text_content}.

    - Strips a single common leading folder if every entry shares one (this
      happens naturally when a contributor re-zips a downloaded/extracted
      GitHub archive, which always wraps files in a "repo-branch/" folder).
    - Skips VCS/dependency/build directories entirely (never added, updated,
      or deleted based on them).
    - Files over the size cap or that fail UTF-8 decoding (binary) are
      skipped but returned separately so the caller can exclude them from
      delete-detection too — being too large/binary to include is not the
      same as the contributor wanting the file removed.
    """
    files: Dict[str, str] = {}
    skipped: List[str] = []
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        names = [n for n in zf.namelist() if not n.endswith("/")]
        if len(names) > MAX_ZIP_FILE_COUNT:
            raise HTTPException(
                status_code=400,
                detail=f"Zip contains too many files (max {MAX_ZIP_FILE_COUNT}).",
            )

        # Detect a single shared top-level folder to strip
        segments = [n.split("/", 1) for n in names if "/" in n]
        common_prefix = None
        if segments and len(segments) == len(names) and all(
            seg[0] == segments[0][0] for seg in segments
        ):
            common_prefix = segments[0][0] + "/"

        for name in names:
            rel = (
                name[len(common_prefix):]
                if common_prefix and name.startswith(common_prefix)
                else name
            )
            if not rel:
                continue
            if _is_ignored_path(rel):
                continue  # deliberately ignored dir — never touched either way
            info = zf.getinfo(name)
            if info.file_size > MAX_ZIP_FILE_SIZE:
                skipped.append(rel)
                continue
            try:
                raw = zf.read(name)
                files[rel] = raw.decode("utf-8")
            except (UnicodeDecodeError, Exception):
                skipped.append(rel)  # binary/undecodable file
                continue

    return files, skipped


async def _fetch_blob_info(
    client: httpx.AsyncClient, owner: str, repo: str, ref: str
) -> Dict[str, Dict[str, Any]]:
    """Return {path: {"sha": ..., "size": ...}} for every file in the repo at ref."""
    resp = await client.get(
        f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/{ref}?recursive=1",
        headers=_headers(),
    )
    if resp.status_code != 200:
        raise _github_error(
            resp.status_code, resp.text, owner, repo, context="reading current repo tree"
        )
    data = resp.json()
    return {
        item["path"]: {"sha": item["sha"], "size": item.get("size", 0)}
        for item in data.get("tree", [])
        if item.get("type") == "blob"
    }


@router.post("/github/contribute-zip")
async def submit_contribution_zip(
    repo_url: str = Form(...),
    message: str = Form(...),
    contributor_name: str = Form(...),
    contributor_email: str = Form(...),
    base_branch: str = Form("main"),
    agent_name: str = Form(""),
    file: UploadFile = File(...),
    x_graph_token: Optional[str] = Header(None),
):
    """Accept a full project zip (downloaded, edited locally with the
    contributor's own tools, then re-zipped), diff it against the live repo
    using git blob SHAs, and commit only what actually changed — edits,
    new files, and removals — to a single new branch + Pull Request.

    Same guarantee as the other contribution endpoints: nothing ever touches
    the base branch directly; the change only lands once a maintainer
    reviews and merges the resulting PR on GitHub.

    If a Microsoft Graph bearer token is supplied via ``X-Graph-Token``, the
    submission is also logged as a row in the
    AI-LEAP-Github-Contribution-Submissions SharePoint list (for a Power
    Automate flow to pick up and email maintainers). This is best-effort —
    a SharePoint failure never fails the PR submission itself. ``agent_name``
    (the use case/agent title, e.g. "LaunchFAST") is written to that list's
    Title column instead of the commit message, falling back to the commit
    message if not supplied.
    """
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted.")
    if not message.strip():
        raise HTTPException(status_code=400, detail="A commit message / changelog is required.")

    data = await file.read()
    if len(data) > MAX_ZIP_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Zip file is too large (max {MAX_ZIP_SIZE // (1024 * 1024)} MB).",
        )

    try:
        uploaded_files, skipped_upload_paths = _extract_zip_files(data)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid or corrupted zip file.")

    if not uploaded_files:
        raise HTTPException(
            status_code=400,
            detail="The zip file appears to be empty (after filtering ignored folders/binaries).",
        )

    owner, repo = _parse_repo(repo_url)

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            # 1. Diff the uploaded zip against the current repo state
            original_info = await _fetch_blob_info(client, owner, repo, base_branch)
            original_shas = {path: info["sha"] for path, info in original_info.items()}

            changes: List[BatchFileChange] = []
            skipped_paths = set(skipped_upload_paths)
            for path, content in uploaded_files.items():
                if path not in original_shas:
                    changes.append(BatchFileChange(path=path, content=content, action="add"))
                elif original_shas[path] != _git_blob_sha(content):
                    changes.append(BatchFileChange(path=path, content=content, action="update"))
            for path, info in original_info.items():
                if path in uploaded_files:
                    continue
                # A file missing from the zip is only a real deletion if we could
                # have faithfully represented it in the first place. Files that
                # are too large/binary/ignored are left untouched instead of
                # being auto-deleted just because they were legitimately excluded.
                if path in skipped_paths or _is_out_of_scope_for_delete(path, info["size"]):
                    skipped_paths.add(path)
                    continue
                changes.append(BatchFileChange(path=path, action="delete"))

            if not changes:
                raise HTTPException(
                    status_code=400,
                    detail="No changes detected between the uploaded zip and the current repository.",
                )

            # 2. Resolve base branch SHA and create the contribution branch
            ref_resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/git/ref/heads/{base_branch}",
                headers=_headers(),
            )
            if ref_resp.status_code != 200:
                raise _github_error(
                    ref_resp.status_code, ref_resp.text, owner, repo, context="resolving base branch"
                )
            base_sha = ref_resp.json()["object"]["sha"]

            slug = _branch_slug(contributor_email or contributor_name or "anon")
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
            branch = f"contrib/{slug}/{timestamp}"

            create_ref_resp = await client.post(
                f"{GITHUB_API}/repos/{owner}/{repo}/git/refs",
                headers=_headers(),
                json={"ref": f"refs/heads/{branch}", "sha": base_sha},
            )
            if create_ref_resp.status_code not in (200, 201):
                raise _github_error(
                    create_ref_resp.status_code,
                    create_ref_resp.text,
                    owner,
                    repo,
                    context=f"creating branch {branch}",
                )

            # 3. Apply every detected change to the new branch
            applied: List[Dict[str, str]] = []
            for change in changes:
                path = change.path.strip().lstrip("/")
                if not path:
                    continue

                if change.action == "delete":
                    existing_sha = original_shas.get(path)
                    if not existing_sha:
                        continue
                    del_resp = await client.request(
                        "DELETE",
                        f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
                        headers=_headers(),
                        json={
                            "message": f"Remove {path}",
                            "sha": existing_sha,
                            "branch": branch,
                        },
                    )
                    if del_resp.status_code not in (200, 201):
                        raise _github_error(
                            del_resp.status_code, del_resp.text, owner, repo, context=f"deleting {path}"
                        )
                else:
                    verb = "Update" if change.action == "update" else "Add"
                    commit_payload: Dict[str, Any] = {
                        "message": f"{verb} {path}",
                        "content": base64.b64encode(change.content.encode("utf-8")).decode("ascii"),
                        "branch": branch,
                    }
                    if change.action == "update":
                        commit_payload["sha"] = original_shas[path]
                    put_resp = await client.put(
                        f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
                        headers=_headers(),
                        json=commit_payload,
                    )
                    if put_resp.status_code not in (200, 201):
                        raise _github_error(
                            put_resp.status_code, put_resp.text, owner, repo, context=f"writing {path}"
                        )

                applied.append({"path": path, "action": change.action})

            # 4. Open ONE Pull Request covering every applied change
            file_summary = "\n".join(
                f"- {_ACTION_LABELS.get(a['action'], 'Modified')} `{a['path']}`" for a in applied
            )
            pr_body = (
                f"Contributed by **{contributor_name or 'Unknown'}** "
                f"({contributor_email or 'no email provided'}) via the Solutions portal (zip upload).\n\n"
                f"**Files changed:**\n{file_summary}\n\n---\n{message.strip()}"
            )
            pr_resp = await client.post(
                f"{GITHUB_API}/repos/{owner}/{repo}/pulls",
                headers=_headers(),
                json={
                    "title": message.strip()[:100],
                    "head": branch,
                    "base": base_branch,
                    "body": pr_body,
                },
            )
            if pr_resp.status_code not in (200, 201):
                raise _github_error(
                    pr_resp.status_code, pr_resp.text, owner, repo, context="opening pull request"
                )

            pr_data = pr_resp.json()

            # 5. Best-effort: log this submission as a row in the
            # AI-LEAP-Github-Contribution-Submissions SharePoint list, so a
            # Power Automate flow on that list can email maintainers. A
            # SharePoint failure (missing token, list misconfigured, etc.)
            # must never fail the PR submission that already succeeded — but
            # the reason is still surfaced in the response so the frontend
            # can show it instead of failing silently.
            sharepoint_logged = False
            sharepoint_error: Optional[str] = None
            if x_graph_token:
                try:
                    submit_contribution_to_sharepoint(
                        graph_token=x_graph_token,
                        title=agent_name.strip() or message.strip()[:100],
                        contributor_name=contributor_name or "Unknown",
                        contributor_email=contributor_email or "",
                        pr_url=pr_data.get("html_url", ""),
                        submitted_at=datetime.now(timezone.utc).isoformat(),
                    )
                    sharepoint_logged = True
                except (SharePointConfigError, SharePointUploadError) as e:
                    logger.error("Failed to log contribution to SharePoint: %s", e)
                    sharepoint_error = str(e)
                except Exception as e:
                    logger.exception("Unexpected error logging contribution to SharePoint")
                    sharepoint_error = str(e)
            else:
                logger.info("No Graph token supplied — skipping SharePoint contribution log.")
                sharepoint_error = "No Graph token was supplied by the frontend."

            return {
                "success": True,
                "pr_number": pr_data.get("number"),
                "pr_url": pr_data.get("html_url"),
                "branch": branch,
                "files_applied": applied,
                "files_skipped": sorted(skipped_paths),
                "sharepoint_logged": sharepoint_logged,
                "sharepoint_error": sharepoint_error,
            }

    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.error("Timeout submitting zip contribution for %s", repo_url)
        raise HTTPException(status_code=504, detail="GitHub API request timed out while submitting contribution.")
    except httpx.RequestError as e:
        logger.error("Network error submitting zip contribution for %s: %s", repo_url, str(e))
        raise HTTPException(status_code=502, detail=f"Could not reach GitHub API: {str(e)}")
    except Exception as e:
        logger.exception("Unexpected error submitting zip contribution for %s", repo_url)
        raise HTTPException(status_code=500, detail=f"Internal error submitting contribution: {str(e)}")
