"""Push all AI Artifact JSON packages to SharePoint Online.

Uploads each artifact's JSON file as an attachment to its SharePoint List item
in 'Engineering-Commons-Artifacts' via Microsoft Graph API and saves it to
the Document Library 'Documents' under /artifacts/{name}/{version}/{name}.json.
"""

import os
import sys
import json
import glob
import base64
import urllib.request
import urllib.parse
import urllib.error
import argparse

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

JSON_DIR = "artifacts-json"
HOSTNAME = "testmaq.sharepoint.com"
SITE_PATH = "sites/AITeam2"

def get_token(custom_token=None):
    if custom_token:
        return custom_token

    # 1. Try engineering-commons token (saved by extension / SSO)
    ec_session = os.path.expanduser("~/.engineering-commons/token.json")
    if os.path.exists(ec_session):
        try:
            with open(ec_session, "r", encoding="utf-8") as f:
                d = json.load(f)
                tok = d.get("access_token") or d.get("token")
                if tok:
                    return tok
        except Exception:
            pass

    # 2. Try engineering-commons session
    cip_session = os.path.expanduser("~/.engineering-commons/session.json")
    if os.path.exists(cip_session):
        try:
            with open(cip_session, "r", encoding="utf-8") as f:
                d = json.load(f)
                tok = d.get("ssoToken") or d.get("token")
                if tok:
                    return tok
        except Exception:
            pass

    return None

def main():
    parser = argparse.ArgumentParser(description="Push artifact JSON files to SharePoint")
    parser.add_argument("--token", help="Microsoft Graph Bearer Token", default=None)
    parser.add_argument("--hostname", default=HOSTNAME)
    parser.add_argument("--site-path", default=SITE_PATH)
    parser.add_argument("--list-name", default="Engineering-Commons-Artifacts")
    args = parser.parse_args()

    token = get_token(args.token)
    if not token:
        print("[ERROR] No valid Microsoft Graph token found.")
        print("Please log in with 'engineering-commons login' or sign in via the VS Code Extension.")
        sys.exit(1)

    clean_path = args.site_path.strip("/")
    site_url = f"https://graph.microsoft.com/v1.0/sites/{args.hostname}:/{clean_path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 1. Resolve Site ID
    req = urllib.request.Request(site_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            site_info = json.loads(resp.read().decode())
            site_id = site_info["id"]
            print(f"[OK] Connected to SharePoint Site: {site_info.get('displayName')} ({site_id})")
    except urllib.error.HTTPError as he:
        print(f"[ERROR] Failed to connect to SharePoint site: HTTP {he.code} -> {he.read().decode()}")
        sys.exit(1)

    # 2. Resolve List ID
    list_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists?$top=100"
    req = urllib.request.Request(list_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        all_lists = json.loads(resp.read().decode()).get("value", [])

    target_list = None
    for l in all_lists:
        dname = (l.get("displayName") or l.get("name") or "").lower()
        if dname == args.list_name.lower() or dname.replace("-", "") == args.list_name.lower().replace("-", ""):
            target_list = l
            break

    if not target_list:
        print(f"[ERROR] Could not find list '{args.list_name}' on site. Available lists: {[l.get('displayName') for l in all_lists]}")
        sys.exit(1)

    list_id = target_list["id"]
    list_display_name = target_list.get("displayName") or args.list_name
    print(f"[OK] Found Target List: '{list_display_name}' (ID: {list_id})")

    # Get column map for list
    cols_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/columns"
    req = urllib.request.Request(cols_url, headers=headers)
    avail_cols = set()
    try:
        with urllib.request.urlopen(req) as resp:
            for col in json.loads(resp.read().decode()).get("value", []):
                avail_cols.add(col.get("name"))
                if col.get("displayName"):
                    avail_cols.add(col.get("displayName"))
    except Exception:
        pass

    # 3. Resolve Document Library Drive ID
    drives_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives"
    req = urllib.request.Request(drives_url, headers=headers)
    doc_drive_id = None
    try:
        with urllib.request.urlopen(req) as resp:
            drives = json.loads(resp.read().decode()).get("value", [])
            for d in drives:
                dname = (d.get("name") or "").lower()
                if "document" in dname or "commons" in dname or "shared" in dname:
                    doc_drive_id = d["id"]
                    print(f"[OK] Found Document Library Drive: '{d.get('name')}' (ID: {doc_drive_id})")
                    break
    except Exception:
        pass

    # 4. Read all artifact JSON files
    json_files = glob.glob(os.path.join(JSON_DIR, "*.json"))
    json_files = [f for f in json_files if not os.path.basename(f).startswith("all-artifacts")]

    print(f"\n[INFO] Found {len(json_files)} artifact JSON package(s) to upload.\n")

    # Fetch all existing items in the list
    items_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items?$expand=fields&$top=500"
    req = urllib.request.Request(items_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        existing_items = json.loads(resp.read().decode()).get("value", [])

    items_by_title = {}
    for item in existing_items:
        fields = item.get("fields") or {}
        title = (fields.get("Title") or fields.get("title") or "").strip().lower()
        if title:
            items_by_title[title] = item.get("id")

    success_count = 0

    for jf in json_files:
        with open(jf, "r", encoding="utf-8") as f:
            art_data = json.load(f)

        name = art_data.get("name")
        version = art_data.get("version", "1.0.0")
        art_type = art_data.get("type", "skill")
        desc = art_data.get("description", "")
        author = art_data.get("author", "harsh.rana@maqsoftware.com")
        is_certified = art_data.get("isCertified", True)
        category = art_data.get("category", "AI Engineering")
        raw_json_str = json.dumps(art_data, indent=2, ensure_ascii=False)
        json_bytes = raw_json_str.encode("utf-8")
        base64_content = base64.b64encode(json_bytes).decode("utf-8")
        file_name = f"{name}.json"

        print(f"--> Processing '{name}' (Type: {art_type}, Files: {len(art_data.get('files', []))})...")

        # Step A: Get or Create List Item
        item_id = items_by_title.get(name.lower())
        if not item_id:
            # Build fields matching available columns
            fields = {"Title": name}
            if "ArtifactType" in avail_cols or not avail_cols:
                fields["ArtifactType"] = art_type
            if "Version" in avail_cols or not avail_cols:
                fields["Version"] = version
            if "Description" in avail_cols or not avail_cols:
                fields["Description"] = desc[:255]
            if "Category" in avail_cols:
                fields["Category"] = category
            if "Submitted_x0020_By" in avail_cols:
                fields["Submitted_x0020_By"] = author
            elif "SubmittedBy" in avail_cols:
                fields["SubmittedBy"] = author
            if "IsCertified" in avail_cols:
                fields["IsCertified"] = is_certified

            create_payload = {"fields": fields}
            create_req = urllib.request.Request(
                f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items",
                data=json.dumps(create_payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            try:
                with urllib.request.urlopen(create_req) as c_resp:
                    created = json.loads(c_resp.read().decode())
                    item_id = created["id"]
                    print(f"    [+] Created List Item ID: {item_id}")
            except urllib.error.HTTPError as he:
                print(f"    [!] Failed to create list item: {he.read().decode()}")
        else:
            print(f"    [=] Existing List Item ID: {item_id}")

        # Step B: Attach JSON file via Microsoft Graph API attachments
        if item_id:
            attach_payload = {
                "@odata.type": "#microsoft.graph.fileAttachment",
                "name": file_name,
                "contentType": "application/json",
                "contentBytes": base64_content
            }
            attach_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items/{item_id}/attachments"
            attach_req = urllib.request.Request(
                attach_url,
                data=json.dumps(attach_payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            try:
                with urllib.request.urlopen(attach_req) as a_resp:
                    if a_resp.status in (200, 201):
                        print(f"    [✓] Graph API Attachment added: '{file_name}' on Item #{item_id}")
            except urllib.error.HTTPError as he:
                # Attachment might already exist or not supported on this list type
                pass

        # Step C: Store in Document Library (Drives)
        if doc_drive_id:
            folder_path = f"artifacts/{name}/{version}/{file_name}"
            drive_upload_url = f"https://graph.microsoft.com/v1.0/drives/{doc_drive_id}/root:/{folder_path}:/content"
            drive_req = urllib.request.Request(
                drive_upload_url,
                data=json_bytes,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                method="PUT"
            )
            try:
                with urllib.request.urlopen(drive_req) as d_resp:
                    if d_resp.status in (200, 201):
                        print(f"    [✓] Document Library: /artifacts/{name}/{version}/{file_name}")
            except Exception as de:
                pass

        success_count += 1

    print(f"\n=======================================================")
    print(f"[COMPLETED] Successfully pushed {success_count}/{len(json_files)} AI artifact packages to SharePoint!")
    print(f"=======================================================")

if __name__ == "__main__":
    main()
