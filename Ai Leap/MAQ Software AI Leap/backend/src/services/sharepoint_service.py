"""SharePoint upload service.

Uploads a submitted solution ZIP as a SharePoint list item with a file
attachment. Authentication happens on the frontend (MSAL): the browser acquires
the Microsoft Graph and SharePoint REST bearer tokens when the user presses
"Submit Solution" and passes them to this backend, which uses them directly to
create the list item and attach the ZIP.

Only the target list location is read from environment variables (``.env``):

    SHAREPOINT_HOSTNAME      e.g. testmaq.sharepoint.com
    SHAREPOINT_SITE_PATH     e.g. sites/PowerAppsCoderepo-POC
    SHAREPOINT_LIST_NAME     e.g. API-ACCESS-TEST
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict
from urllib.parse import quote

import requests

logger = logging.getLogger(__name__)


class SharePointConfigError(RuntimeError):
    """Raised when required SharePoint environment variables are missing."""


class SharePointUploadError(RuntimeError):
    """Raised when a SharePoint API call fails."""


def _require_env() -> Dict[str, str]:
    """Read and validate SharePoint settings from the environment."""
    config = {
        "hostname": os.getenv("SHAREPOINT_HOSTNAME", "").strip(),
        "site_path": os.getenv("SHAREPOINT_SITE_PATH", "").strip().strip("/"),
        "list_name": os.getenv("SHAREPOINT_LIST_NAME", "").strip(),
    }

    missing = [key.upper() for key, value in config.items() if not value]
    if missing:
        raise SharePointConfigError(
            "Missing required SharePoint .env fields: " + ", ".join(missing)
        )

    # Reject values that are still the .env.example placeholders.
    placeholders = [
        key.upper()
        for key, value in config.items()
        if value.lower().startswith("your-")
    ]
    if placeholders:
        raise SharePointConfigError(
            "These SharePoint .env fields still contain placeholder values and "
            "must be set to real values: " + ", ".join(placeholders)
        )
    return config


def _get_site_id(graph_token: str, config: Dict[str, str]) -> str:
    headers = {"Authorization": f"Bearer {graph_token}", "Accept": "application/json"}
    url = (
        f"https://graph.microsoft.com/v1.0/sites/"
        f"{config['hostname']}:/{config['site_path']}"
    )
    response = requests.get(url, headers=headers, timeout=30)
    if response.status_code != 200:
        raise SharePointUploadError(f"Site lookup failed: {response.text}")
    return response.json().get("id")


def _get_list_id(graph_token: str, site_id: str, config: Dict[str, str]) -> str:
    headers = {"Authorization": f"Bearer {graph_token}", "Accept": "application/json"}
    url = (
        f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists"
        f"?$filter=displayName eq '{config['list_name']}'"
    )
    response = requests.get(url, headers=headers, timeout=30)
    if response.status_code != 200:
        raise SharePointUploadError(f"List lookup failed: {response.text}")

    lists = response.json().get("value", [])
    if not lists:
        raise SharePointUploadError(
            f"Could not find a list named '{config['list_name']}'."
        )
    return lists[0].get("id")


def _get_column_map(graph_token: str, site_id: str, list_id: str) -> Dict[str, str]:
    """Return a mapping of {column display name: internal field name}.

    SharePoint stores values against internal field names (e.g. ``Title`` or
    ``Key_x0020_Features``) while the UI shows display names. Resolving the map
    dynamically keeps the upload working regardless of how the columns were
    created or renamed. Read-only / computed columns are skipped.
    """
    headers = {"Authorization": f"Bearer {graph_token}", "Accept": "application/json"}
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/columns"
    response = requests.get(url, headers=headers, timeout=30)
    if response.status_code != 200:
        raise SharePointUploadError(f"Column lookup failed: {response.text}")

    column_map: Dict[str, str] = {}
    for column in response.json().get("value", []):
        if column.get("readOnly"):
            continue
        display_name = column.get("displayName")
        internal_name = column.get("name")
        if display_name and internal_name:
            column_map[display_name.strip().lower()] = internal_name
    return column_map


def _build_fields(
    display_values: Dict[str, Any], column_map: Dict[str, str]
) -> Dict[str, Any]:
    """Map {display name: value} to {internal name: value} for the Graph payload."""
    fields: Dict[str, Any] = {}
    for display_name, value in display_values.items():
        internal_name = column_map.get(display_name.strip().lower())
        if internal_name and value not in (None, ""):
            fields[internal_name] = value
    return fields


def _create_list_item(
    graph_token: str, site_id: str, list_id: str, fields: Dict[str, Any]
) -> str:
    headers = {
        "Authorization": f"Bearer {graph_token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {"fields": fields}
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items"
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    if response.status_code not in (200, 201):
        raise SharePointUploadError(f"Failed to create list item: {response.text}")
    return response.json().get("id")


def _upload_attachment(
    sp_token: str,
    item_id: str,
    file_name: str,
    file_bytes: bytes,
    config: Dict[str, str],
) -> None:
    url = (
        f"https://{config['hostname']}/{config['site_path']}"
        f"/_api/web/lists/getbytitle('{config['list_name']}')"
        f"/items({item_id})/AttachmentFiles/add(FileName='{file_name}')"
    )
    headers = {
        "Authorization": f"Bearer {sp_token}",
        "Accept": "application/json;odata=verbose",
    }
    response = requests.post(url, headers=headers, data=file_bytes, timeout=120)
    if response.status_code not in (200, 201):
        raise SharePointUploadError(
            f"Attachment upload failed ({response.status_code}): {response.text}"
        )


def upload_solution_to_sharepoint(
    *,
    graph_token: str,
    sp_token: str,
    zip_filename: str,
    zip_bytes: bytes,
    project_title: str,
    description: str = "",
    category: str = "",
    key_features: str = "",
    tech_stack: str = "",
    demo_video_url: str = "",
    impact_summary: str = "",
    submitted_by: str = "",
    submitted_at: str = "",
    img_filename: str = "",
    img_bytes: bytes = b"",
) -> Dict[str, Any]:
    """Create a SharePoint list item with all form fields and attach the ZIP.

    ``graph_token`` and ``sp_token`` are bearer tokens acquired on the frontend
    (via MSAL) for Microsoft Graph and the SharePoint REST API respectively.

    Form fields are mapped onto the list's columns by display name:
        Project Title, Description, Category (Choice), Key Features,
        Tech Stack, Demo Video URL, Impact Summary, Submitted By, Submitted At.

    The architecture diagram image is uploaded as a second attachment to the
    list item alongside the code ZIP file.

    Returns a dict with the created ``item_id`` and ``list_name``.
    Raises ``SharePointConfigError`` or ``SharePointUploadError`` on failure.
    """
    if not graph_token or not sp_token:
        raise SharePointUploadError(
            "Missing authentication tokens. The frontend must sign in and pass "
            "both the Graph and SharePoint bearer tokens."
        )

    config = _require_env()

    site_id = _get_site_id(graph_token, config)
    list_id = _get_list_id(graph_token, site_id, config)
    column_map = _get_column_map(graph_token, site_id, list_id)

    # Map form values to columns by display name. Category is a Choice column;
    # the value just needs to match one of the configured choices.
    display_values: Dict[str, Any] = {
        "Project Title": project_title,
        "Title": project_title,  # fallback when the Title column was not renamed
        "Description": description,
        "Category": category,
        "Key Features": key_features,
        "Tech Stack": tech_stack,
        "Demo Video URL": demo_video_url,
        "Impact Summary": impact_summary,
        "Submitted By": submitted_by,
        "Submitted At": submitted_at,
    }
    fields = _build_fields(display_values, column_map)

    # Guarantee the required Title field is always populated.
    fields.setdefault("Title", project_title)

    item_id = _create_list_item(graph_token, site_id, list_id, fields)

    # Attach the solution ZIP to the created item.
    safe_zip_name = os.path.basename(zip_filename) or "solution.zip"
    _upload_attachment(sp_token, item_id, safe_zip_name, zip_bytes, config)

    # Attach the architecture diagram image as a second attachment.
    if img_filename and img_bytes:
        safe_img_name = os.path.basename(img_filename) or "architecture_diagram.png"
        _upload_attachment(sp_token, item_id, safe_img_name, img_bytes, config)

    return {"item_id": item_id, "list_name": config["list_name"]}


def submit_feedback_to_sharepoint(
    *,
    graph_token: str,
    sp_token: str,
    agent_name: str,
    vote: str,
    comment: str = "",
    submitted_by: str = "",
    submitted_at: str = "",
) -> Dict[str, Any]:
    """Submit agent Like/Dislike feedback to the AI-Leap-Agent-Feedback SharePoint list.

    Reuses all existing SharePoint helper functions. The target list is read from
    ``SHAREPOINT_FEEDBACK_LIST_NAME`` (defaults to ``"AI-Leap-Agent-Feedback"``).
    The hostname and site path are the same as the upload solution list.

    Fields written (mapped by display name so internal name mangling is handled
    automatically by ``_get_column_map``):
        - Agent Name   → agent_name
        - Like/Dislike → vote  ("Like" or "Dislike")
        - Comment      → comment (optional)
        - Submitted By → submitted_by (display name of the logged-in user)
        - Submitted At → submitted_at (ISO-8601 datetime string, optional)
        - Title        → agent_name  (SharePoint always requires a Title)

    Returns a dict with ``item_id`` and ``list_name`` on success.
    Raises ``SharePointConfigError`` or ``SharePointUploadError`` on failure.
    """
    if not graph_token or not sp_token:
        raise SharePointUploadError(
            "Missing authentication tokens. The frontend must sign in and pass "
            "both the Graph and SharePoint bearer tokens."
        )

    # Reuse same hostname / site_path but swap in the feedback list name.
    base_config = _require_env()
    feedback_list = os.getenv(
        "SHAREPOINT_FEEDBACK_LIST_NAME", "AI-Leap-Agent-Feedback"
    ).strip()
    config = {**base_config, "list_name": feedback_list}

    site_id = _get_site_id(graph_token, config)
    list_id = _get_list_id(graph_token, site_id, config)
    column_map = _get_column_map(graph_token, site_id, list_id)

    display_values: Dict[str, Any] = {
        "Agent Name": agent_name,
        "Like/Dislike": vote,
        "Comment": comment,
        "Submitted By": submitted_by,
        "Submitted At": submitted_at,
        # Always populate the built-in Title column
        "Title": agent_name,
    }
    fields = _build_fields(display_values, column_map)
    fields.setdefault("Title", agent_name)

    item_id = _create_list_item(graph_token, site_id, list_id, fields)
    return {"item_id": item_id, "list_name": config["list_name"]}


def submit_contribution_to_sharepoint(
    *,
    graph_token: str,
    title: str,
    contributor_name: str,
    contributor_email: str,
    pr_url: str,
    submitted_at: str = "",
) -> Dict[str, Any]:
    """Log a submitted contribution Pull Request to the
    AI-LEAP-Github-Contribution-Submissions SharePoint list.

    Reuses all existing SharePoint helper functions. The target list is read
    from ``SHAREPOINT_CONTRIBUTIONS_LIST_NAME`` (defaults to
    ``"AI-LEAP-Github-Contribution-Submissions"``). The hostname and site path
    are the same as the other lists.

    A Power Automate flow can be attached to this list (trigger: "When an item
    is created") to email maintainers whenever a new row lands here.

    Fields written (mapped by display name so internal name mangling is
    handled automatically by ``_get_column_map``):
        - Title             → title (PR title / commit message)
        - Contributor Name  → contributor_name
        - Contributor Email → contributor_email
        - PR URL            → pr_url
        - Submitted At      → submitted_at (ISO-8601 datetime string, optional)

    Returns a dict with ``item_id`` and ``list_name`` on success.
    Raises ``SharePointConfigError`` or ``SharePointUploadError`` on failure.
    """
    if not graph_token:
        raise SharePointUploadError(
            "Missing authentication token. The frontend must sign in and pass "
            "a Microsoft Graph bearer token."
        )

    # Reuse same hostname / site_path but swap in the contributions list name.
    base_config = _require_env()
    contributions_list = os.getenv(
        "SHAREPOINT_CONTRIBUTIONS_LIST_NAME", "AI-LEAP-Github-Contribution-Submissions"
    ).strip()
    config = {**base_config, "list_name": contributions_list}

    site_id = _get_site_id(graph_token, config)
    list_id = _get_list_id(graph_token, site_id, config)
    column_map = _get_column_map(graph_token, site_id, list_id)

    display_values: Dict[str, Any] = {
        "Contributor Name": contributor_name,
        "Contributor Email": contributor_email,
        "PR URL": pr_url,
        "Submitted At": submitted_at,
        # Always populate the built-in Title column
        "Title": title,
    }
    fields = _build_fields(display_values, column_map)
    fields.setdefault("Title", title)

    item_id = _create_list_item(graph_token, site_id, list_id, fields)
    return {"item_id": item_id, "list_name": config["list_name"]}


def _get_all_list_items(graph_token: str, site_id: str, list_id: str) -> list:
    """Return every item (with expanded fields) from a SharePoint list, paginated."""
    headers = {"Authorization": f"Bearer {graph_token}", "Accept": "application/json"}
    items: list = []
    url = (
        f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items"
        f"?expand=fields&$top=500"
    )
    while url:
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code != 200:
            raise SharePointUploadError(f"List items fetch failed: {response.text}")
        data = response.json()
        items.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
    return items


def get_feedback_summary_from_sharepoint(*, graph_token: str) -> Dict[str, Dict[str, int]]:
    """Aggregate Like/Dislike counts per agent from the feedback SharePoint list.

    Reads every item in the ``AI-Leap-Agent-Feedback`` list and tallies the
    ``Like/Dislike`` choice grouped by the agent name (stored in the built-in
    ``Title`` column). Returns a mapping::

        { "<agent name>": {"likes": int, "dislikes": int}, ... }

    Only a Graph token is required (list reads don't need the SharePoint REST
    token). Raises ``SharePointConfigError`` / ``SharePointUploadError`` on error.
    """
    if not graph_token:
        raise SharePointUploadError("Missing Graph token.")

    base_config = _require_env()
    feedback_list = os.getenv(
        "SHAREPOINT_FEEDBACK_LIST_NAME", "AI-Leap-Agent-Feedback"
    ).strip()
    config = {**base_config, "list_name": feedback_list}

    site_id = _get_site_id(graph_token, config)
    list_id = _get_list_id(graph_token, site_id, config)
    column_map = _get_column_map(graph_token, site_id, list_id)

    # Resolve the internal field names for the vote + agent-name columns.
    vote_field = column_map.get("like/dislike")
    agent_field = column_map.get("agent name")

    items = _get_all_list_items(graph_token, site_id, list_id)
    logger.info(
        "Fetched %d feedback item(s) from SharePoint list '%s'",
        len(items),
        config["list_name"],
    )

    summary: Dict[str, Dict[str, int]] = {}
    for item in items:
        fields = item.get("fields", {}) or {}
        agent = fields.get("Title") or (agent_field and fields.get(agent_field)) or ""
        agent = str(agent).strip()
        if not agent:
            continue
        vote_raw = ""
        if vote_field:
            vote_raw = fields.get(vote_field, "")
        vote = str(vote_raw).strip().lower()

        entry = summary.setdefault(agent, {"likes": 0, "dislikes": 0})
        if vote == "like":
            entry["likes"] += 1
        elif vote == "dislike":
            entry["dislikes"] += 1

    return summary


def _get_drive_id(graph_token: str, site_id: str, library_name: str) -> str:
    """Return the drive (document library) id whose name matches ``library_name``.

    SharePoint's URL path strips punctuation/spaces (e.g. the library shown as
    "AILEAP-DocumentLibrary" appears in URLs as "AILEAPDocumentLibrary"), while
    Graph reports the display name. Matching is therefore done against the exact
    name, a normalized (alphanumeric-only) form, and the drive's webUrl segment.
    """
    headers = {"Authorization": f"Bearer {graph_token}", "Accept": "application/json"}
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives"
    response = requests.get(url, headers=headers, timeout=30)
    if response.status_code != 200:
        raise SharePointUploadError(f"Drive lookup failed: {response.text}")

    def _normalize(value: str) -> str:
        return "".join(ch for ch in value.lower() if ch.isalnum())

    drives = response.json().get("value", [])
    target = library_name.strip().lower()
    target_norm = _normalize(library_name)

    for drive in drives:
        name = drive.get("name", "").strip()
        web_url = drive.get("webUrl", "")
        if (
            name.lower() == target
            or _normalize(name) == target_norm
            or web_url.rstrip("/").split("/")[-1].lower() == target
            or _normalize(web_url.rstrip("/").split("/")[-1]) == target_norm
        ):
            return drive.get("id")

    available = ", ".join(d.get("name", "") for d in drives) or "(none)"
    raise SharePointUploadError(
        f"Could not find a document library named '{library_name}'. "
        f"Available libraries: {available}."
    )


def get_deck_preview_url(
    *,
    graph_token: str,
    hostname: str,
    site_path: str,
    library: str,
    folder: str,
    file_name: str,
) -> str:
    """Return a short-lived, embeddable preview URL for a PPTX/PDF in SharePoint.

    Resolves the site → document library (drive) → file by path, then asks
    Microsoft Graph for an iframe-able preview URL via the driveItem ``/preview``
    action. ``graph_token`` is a delegated bearer token acquired on the frontend
    (MSAL) with the ``Sites.ReadWrite.All`` Graph scope already used elsewhere.
    """
    if not graph_token:
        raise SharePointUploadError(
            "Missing Graph token. The frontend must sign in and pass the bearer token."
        )

    config = {"hostname": hostname, "site_path": site_path, "list_name": library}
    site_id = _get_site_id(graph_token, config)
    drive_id = _get_drive_id(graph_token, site_id, library)

    item_path = "/".join(part for part in (folder, file_name) if part).strip("/")
    encoded_path = quote(item_path)
    headers = {
        "Authorization": f"Bearer {graph_token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{encoded_path}:/preview"
    # chromeless=True removes the OneDrive/SharePoint header chrome so only the
    # slide content is embedded; viewer="office" uses the Office web viewer.
    response = requests.post(
        url,
        headers=headers,
        json={"chromeless": True, "viewer": "office"},
        timeout=30,
    )
    if response.status_code not in (200, 201):
        raise SharePointUploadError(
            f"Preview request failed ({response.status_code}): {response.text}"
        )

    get_url = response.json().get("getUrl")
    if not get_url:
        raise SharePointUploadError("Preview response did not include a 'getUrl'.")
    return get_url


def get_file_download_url(
    *,
    graph_token: str,
    hostname: str,
    site_path: str,
    library: str,
    folder: str,
    file_name: str,
) -> tuple[str, str]:
    """Return a short-lived, pre-authenticated direct download URL for a file.

    Resolves the site → document library (drive) → file by path, then reads the
    driveItem's ``@microsoft.graph.downloadUrl`` — a temporary URL (no auth header
    needed) that can be used directly as a ``<video>``/``<img>`` src with no iframe
    or CSP restrictions. Used for the Agent Eval demo video so it plays for every
    signed-in user with access to the library.
    """
    if not graph_token:
        raise SharePointUploadError(
            "Missing Graph token. The frontend must sign in and pass the bearer token."
        )

    config = {"hostname": hostname, "site_path": site_path, "list_name": library}
    site_id = _get_site_id(graph_token, config)
    drive_id = _get_drive_id(graph_token, site_id, library)

    item_path = "/".join(part for part in (folder, file_name) if part).strip("/")
    encoded_path = quote(item_path)
    headers = {"Authorization": f"Bearer {graph_token}", "Accept": "application/json"}
    url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{encoded_path}"
    response = requests.get(url, headers=headers, timeout=30)
    if response.status_code != 200:
        raise SharePointUploadError(
            f"File lookup failed ({response.status_code}): {response.text}"
        )

    data = response.json()
    download_url = data.get("@microsoft.graph.downloadUrl")
    if not download_url:
        raise SharePointUploadError("File item did not include a download URL.")
    return download_url, data.get("name", file_name)
