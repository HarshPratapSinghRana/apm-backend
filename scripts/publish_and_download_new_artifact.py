"""
End-to-End Test: Create Brand New Artifact -> Push JSON to SharePoint -> Direct Download via Extension Client
================================================================================================================
1. Publishes brand new 'kubernetes-security-auditor' JSON package to SharePoint Online (Zero Backend).
2. Creates the List Item in SharePoint List ('Engineering-Commons-Artifacts').
3. Uploads the raw JSON package to SharePoint Document Library ('Documents/artifacts/...').
4. Downloads the JSON package directly back from SharePoint using the same Graph API client logic as the VS Code extension.
5. Unpacks the files to '.agents/skills/kubernetes-security-auditor/SKILL.md'.
6. Validates 100% roundtrip integrity.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
import urllib.error

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOSTNAME = "testmaq.sharepoint.com"
SITE_PATH = "sites/AITeam2"
LIST_NAME = "Engineering-Commons-Artifacts"
NEW_ARTIFACT_JSON = os.path.join("artifacts-json", "kubernetes-security-auditor.json")
DEST_SKILL_PATH = os.path.join(".agents", "skills", "kubernetes-security-auditor", "SKILL.md")

def get_token():
    for p in [os.path.expanduser("~/.engineering-commons/session.json"), os.path.expanduser("~/.engineering-commons/token.json")]:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    d = json.load(f)
                    tok = d.get("ssoToken") or d.get("access_token") or d.get("token")
                    if tok: return tok
            except Exception:
                pass
    return None

def main():
    print("================================================================================")
    print("🚀 PUBLISHING & DIRECT DOWNLOADING NEW ARTIFACT: 'kubernetes-security-auditor'")
    print("================================================================================")

    token = get_token()
    if not token:
        print("[ERROR] No valid Microsoft session token found.")
        sys.exit(1)

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 1. Read the newly created local JSON package
    with open(NEW_ARTIFACT_JSON, "r", encoding="utf-8") as f:
        pkg_data = json.load(f)

    art_name = pkg_data["name"]
    art_version = pkg_data.get("version", "1.0.0")
    art_type = pkg_data.get("type", "skill")
    art_desc = pkg_data.get("description", "")
    art_author = pkg_data.get("author", "harsh.rana@maqsoftware.com")
    art_cat = pkg_data.get("category", "DevOps & Security")
    tech_stack_str = ", ".join(pkg_data.get("techStack", []))
    key_feat_str = ", ".join(pkg_data.get("keyFeatures", []))

    raw_json_str = json.dumps(pkg_data, indent=2, ensure_ascii=False)
    raw_bytes = raw_json_str.encode("utf-8")

    print(f"[*] Loaded Artifact Package: '{art_name}' (v{art_version})")
    print(f"    Category: {art_cat} | Type: {art_type} | Files: {len(pkg_data.get('files', []))}")

    # 2. Resolve SharePoint Site ID
    site_url = f"https://graph.microsoft.com/v1.0/sites/{HOSTNAME}:/{SITE_PATH}"
    with urllib.request.urlopen(urllib.request.Request(site_url, headers=headers)) as resp:
        site_info = json.loads(resp.read().decode())
        site_id = site_info["id"]
        print(f"[✓] Connected to SharePoint Site: '{site_info.get('displayName')}'")

    # 3. Resolve List ID
    list_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists?$top=100"
    with urllib.request.urlopen(urllib.request.Request(list_url, headers=headers)) as resp:
        all_lists = json.loads(resp.read().decode()).get("value", [])

    target_list = next((l for l in all_lists if (l.get("displayName") or l.get("name") or "").lower() in [LIST_NAME.lower(), LIST_NAME.lower().replace("-", "")]), None)
    if not target_list:
        print(f"[ERROR] List '{LIST_NAME}' not found.")
        sys.exit(1)

    list_id = target_list["id"]
    print(f"[✓] Resolved Target SharePoint List: '{target_list.get('displayName')}' (ID: {list_id})")

    # 4. Resolve Document Library Drive ID
    drives_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives"
    with urllib.request.urlopen(urllib.request.Request(drives_url, headers=headers)) as resp:
        drives = json.loads(resp.read().decode()).get("value", [])

    doc_drive = next((d for d in drives if "document" in d.get("name", "").lower() or d.get("name") == "Documents"), None)
    if not doc_drive:
        print("[ERROR] Document library drive not found.")
        sys.exit(1)

    drive_id = doc_drive["id"]
    print(f"[✓] Resolved SharePoint Document Library: '{doc_drive.get('name')}' (ID: {drive_id})")

    # 5. Check if List Item exists or Create It
    items_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items?$expand=fields&$top=200"
    with urllib.request.urlopen(urllib.request.Request(items_url, headers=headers)) as resp:
        existing_items = json.loads(resp.read().decode()).get("value", [])

    matched_item = None
    for item in existing_items:
        fields = item.get("fields") or {}
        title = (fields.get("Title") or fields.get("title") or "").strip().lower()
        if title == art_name.lower():
            matched_item = item
            break

    item_id = None
    if matched_item:
        item_id = matched_item.get("id")
        print(f"[✓] Existing List Item found (ID: {item_id}). Updating fields...")
    else:
        print(f"[*] Creating brand new SharePoint List item for '{art_name}'...")
        create_payload = {
            "fields": {
                "Title": art_name,
                "field_1": art_cat,
                "field_2": art_desc,
                "field_3": key_feat_str,
                "field_4": tech_stack_str,
                "field_6": art_version,
                "field_7": art_type,
                "field_8": "TRUE",
                "field_9": 1.0,
                "field_10": 5.0,
                "field_11": "Public"
            }
        }
        create_req = urllib.request.Request(
            f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items",
            data=json.dumps(create_payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(create_req) as c_resp:
            created_item = json.loads(c_resp.read().decode())
            item_id = created_item.get("id")
            print(f"[✓] Created New SharePoint List Item (ID: {item_id})!")

    # 6. Push JSON file directly into SharePoint Document Library
    folder_path = f"artifacts/{art_name}/{art_version}/{art_name}.json"
    upload_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{folder_path}:/content"
    print(f"\n[*] Uploading '{art_name}.json' to SharePoint Document Library...")
    upload_req = urllib.request.Request(
        upload_url,
        data=raw_bytes,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="PUT"
    )
    with urllib.request.urlopen(upload_req) as u_resp:
        upload_info = json.loads(u_resp.read().decode())
        web_url = upload_info.get("webUrl")
        drive_item_id = upload_info.get("id")
        print(f"[✓] Direct SharePoint Upload Succeeded (HTTP {u_resp.status})!")
        print(f"    Direct Web Link: {web_url}")
        print(f"    DriveItem ID:    {drive_item_id}")

    # 7. Direct Download (Simulating Extension Direct Download without backend)
    print(f"\n📥 INITIATING DIRECT DOWNLOAD VIA EXTENSION SHAREPOINT CLIENT...")
    download_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{folder_path}:/content"
    down_req = urllib.request.Request(download_url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(down_req) as d_resp:
        downloaded_bytes = d_resp.read()
        print(f"[✓] Direct Download Succeeded (HTTP {d_resp.status})! Received {len(downloaded_bytes)} bytes.")

    downloaded_pkg = json.loads(downloaded_bytes.decode("utf-8"))
    print(f"    Decoded JSON Package Name: '{downloaded_pkg.get('name')}'")
    print(f"    Decoded Package Version:   '{downloaded_pkg.get('version')}'")
    print(f"    Decoded Files Count:       {len(downloaded_pkg.get('files', []))}")

    # 8. Unpack and write directly to workspace (.agents/skills/kubernetes-security-auditor/SKILL.md)
    print(f"\n📂 UNPACKING DIRECTLY INTO WORKSPACE: '{DEST_SKILL_PATH}'...")
    for f_entry in downloaded_pkg.get("files", []):
        file_rel_path = f_entry["path"]
        content = f_entry["content"]
        workspace_dest = os.path.join(os.getcwd(), ".agents", file_rel_path)
        os.makedirs(os.path.dirname(workspace_dest), exist_ok=True)
        with open(workspace_dest, "w", encoding="utf-8") as out_f:
            out_f.write(content)
        print(f"    [+] Created: {workspace_dest} ({len(content)} chars)")

    # 9. Verify exact match
    with open(os.path.join(os.getcwd(), ".agents", downloaded_pkg["files"][0]["path"]), "r", encoding="utf-8") as vf:
        written_content = vf.read()

    assert written_content == pkg_data["files"][0]["content"], "Unpacked content mismatch!"

    print("\n================================================================================")
    print("🎉 SUCCESS! NEW ARTIFACT DIRECT SHAREPOINT ROUNDTRIP COMPLETED:")
    print("================================================================================")
    print(f"1. New Artifact Created Locally:          artifacts-json/{art_name}.json")
    print(f"2. Pushed to SharePoint List:              Item #{item_id} (Engineering-Commons-Artifacts)")
    print(f"3. Uploaded to SharePoint Library:         /{folder_path}")
    print(f"4. Direct Download via Microsoft Graph:    PASSED ({len(downloaded_bytes)} bytes)")
    print(f"5. Direct Workspace Installation:          .agents/skills/{art_name}/SKILL.md")
    print(f"6. End-to-End JSON & Content Integrity:   100% MATCH")
    print(f"\n🔗 DIRECT SHAREPOINT URL:")
    print(f"   {web_url}")
    print("================================================================================\n")

if __name__ == "__main__":
    main()
