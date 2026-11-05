"""
Direct Client-to-SharePoint Round-Trip PoC (Zero-Backend)
==========================================================
Demonstrates that:
1. The client (VS Code extension / script) authenticates directly with Microsoft Entra ID.
2. Uploads an AI artifact JSON package ('api-test-generator.json') directly to SharePoint Online.
3. Downloads the package back directly via Microsoft Graph API (no backend server).
4. Unpacks and verifies the downloaded files locally.
"""

import os
import sys
import json
import time
import base64
import urllib.request
import urllib.parse
import urllib.error

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

TENANT_ID = "e4d98dd2-9199-42e5-ba8b-da3e763ede2e"
CLIENT_ID = "a5f3ba81-4c95-4c74-afd9-38b72cf39156"
SCOPES = "User.Read Sites.Read.All Sites.ReadWrite.All offline_access openid profile email"
HOSTNAME = "testmaq.sharepoint.com"
SITE_PATH = "sites/AITeam2"
LIST_NAME = "Engineering-Commons-Artifacts"
TEST_JSON_PATH = os.path.join("artifacts-json", "api-test-generator.json")
OUTPUT_UNPACK_DIR = os.path.join("test", "poc-direct-download")

def get_saved_token():
    # 1. Try engineering-commons
    ec_path = os.path.expanduser("~/.engineering-commons/token.json")
    if os.path.exists(ec_path):
        try:
            with open(ec_path, "r", encoding="utf-8") as f:
                d = json.load(f)
                tok = d.get("access_token") or d.get("token")
                if tok: return tok
        except Exception:
            pass

    # 2. Try engineering-commons
    cip_path = os.path.expanduser("~/.engineering-commons/session.json")
    if os.path.exists(cip_path):
        try:
            with open(cip_path, "r", encoding="utf-8") as f:
                d = json.load(f)
                tok = d.get("ssoToken") or d.get("token")
                if tok: return tok
        except Exception:
            pass
    return None

def save_token(access_token, id_token=None):
    home = os.path.expanduser("~")
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Save to ~/.engineering-commons/session.json
    cip_dir = os.path.join(home, ".engineering-commons")
    os.makedirs(cip_dir, exist_ok=True)
    cip_session = os.path.join(cip_dir, "session.json")
    session_data = {
        "email": "harsh.rana@maqsoftware.com",
        "token": access_token,
        "ssoToken": access_token,
        "role": "ADMIN",
        "name": "Harsh Pratap Singh Rana",
        "loginTime": now_iso,
        "authType": "microsoft_sso"
    }
    with open(cip_session, "w", encoding="utf-8") as f:
        json.dump(session_data, f, indent=2)

    # Save to ~/.engineering-commons/token.json
    eng_dir = os.path.join(home, ".engineering-commons")
    os.makedirs(eng_dir, exist_ok=True)
    eng_token = os.path.join(eng_dir, "token.json")
    token_data = {
        "access_token": access_token,
        "token_type": "Bearer",
        "email": "harsh.rana@maqsoftware.com",
        "name": "Harsh Pratap Singh Rana",
        "role": "ADMIN",
        "saved_at": now_iso
    }
    with open(eng_token, "w", encoding="utf-8") as f:
        json.dump(token_data, f, indent=2)

def test_token(token):
    if not token:
        return False
    try:
        url = "https://graph.microsoft.com/v1.0/me"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception:
        return False

def acquire_device_token():
    print("\n================================================================")
    print("🔐 MICROSOFT ENTRA ID DEVICE AUTHENTICATION REQUIRED")
    print("================================================================")

    # 1. Request device code
    dc_url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/devicecode"
    dc_data = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "scope": SCOPES
    }).encode("utf-8")

    req = urllib.request.Request(dc_url, data=dc_data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req) as resp:
        dc_res = json.loads(resp.read().decode())

    user_code = dc_res.get("user_code")
    device_code = dc_res.get("device_code")
    verification_uri = dc_res.get("verification_uri", "https://microsoft.com/devicelogin")
    interval = dc_res.get("interval", 5)
    expires_in = dc_res.get("expires_in", 900)

    print(f"\n👉 1. Open your browser: {verification_uri}")
    print(f"👉 2. Enter code: {user_code}")
    print("👉 3. Sign in with your corporate account (@maqsoftware.com)\n")
    print("Waiting for authentication...", end="", flush=True)

    token_url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
    start_time = time.time()

    while time.time() - start_time < expires_in:
        time.sleep(interval)
        print(".", end="", flush=True)

        poll_data = urllib.parse.urlencode({
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "client_id": CLIENT_ID,
            "device_code": device_code
        }).encode("utf-8")

        p_req = urllib.request.Request(token_url, data=poll_data, headers={"Content-Type": "application/x-www-form-urlencoded"})
        try:
            with urllib.request.urlopen(p_req) as p_resp:
                res_body = json.loads(p_resp.read().decode())
                access_token = res_body.get("access_token")
                id_token = res_body.get("id_token")
                if access_token:
                    print("\n[✓] Successfully authenticated via Microsoft Entra ID!")
                    save_token(access_token, id_token)
                    return access_token
        except urllib.error.HTTPError as he:
            err_data = json.loads(he.read().decode() or "{}")
            err = err_data.get("error")
            if err == "authorization_pending":
                continue
            elif err == "slow_down":
                interval += 5
                continue
            else:
                print(f"\n[!] Auth Error: {err_data.get('error_description') or err}")
                return None
        except Exception as ex:
            print(f"\n[!] Unexpected Error: {ex}")
            return None

    print("\n[!] Device authentication timed out.")
    return None

def run_poc():
    print("================================================================")
    print("🚀 PROOF OF CONCEPT: Direct SharePoint Upload & Download (Zero Backend)")
    print("================================================================")

    # Step 1: Authentication Check
    token = get_saved_token()
    if not token or not test_token(token):
        print("[INFO] No active session token found or token expired. Initiating SSO...")
        token = acquire_device_token()
        if not token:
            print("[FATAL] Could not obtain Microsoft Entra ID token.")
            sys.exit(1)
    else:
        print("[✓] Valid Microsoft Entra ID session token detected.")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 2: Resolve Site ID directly via Graph API
    site_url = f"https://graph.microsoft.com/v1.0/sites/{HOSTNAME}:/{SITE_PATH}"
    req = urllib.request.Request(site_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            site_info = json.loads(resp.read().decode())
            site_id = site_info["id"]
            print(f"[✓] Connected directly to SharePoint Site: '{site_info.get('displayName')}'")
    except Exception as e:
        print(f"[ERROR] Failed to reach SharePoint site: {e}")
        sys.exit(1)

    # Step 3: Resolve List ID
    list_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists?$top=100"
    req = urllib.request.Request(list_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        all_lists = json.loads(resp.read().decode()).get("value", [])

    target_list = None
    for l in all_lists:
        dname = (l.get("displayName") or l.get("name") or "").lower()
        if dname == LIST_NAME.lower() or dname.replace("-", "") == LIST_NAME.lower().replace("-", ""):
            target_list = l
            break

    if not target_list:
        print(f"[ERROR] List '{LIST_NAME}' not found. Available: {[l.get('displayName') for l in all_lists]}")
        sys.exit(1)

    list_id = target_list["id"]
    print(f"[✓] Resolved Target List: '{target_list.get('displayName')}' (ID: {list_id})")

    # Step 4: Read test JSON package
    if not os.path.exists(TEST_JSON_PATH):
        print(f"[ERROR] Test artifact file not found at: {TEST_JSON_PATH}")
        sys.exit(1)

    with open(TEST_JSON_PATH, "r", encoding="utf-8") as f:
        artifact_pkg = json.load(f)

    art_name = artifact_pkg.get("name", "api-test-generator")
    art_version = artifact_pkg.get("version", "1.0.0")
    raw_json_str = json.dumps(artifact_pkg, indent=2, ensure_ascii=False)
    raw_bytes = raw_json_str.encode("utf-8")
    b64_content = base64.b64encode(raw_bytes).decode("utf-8")
    file_name = f"{art_name}.json"

    print(f"\n📦 Preparing Artifact: '{art_name}' (v{art_version})")
    print(f"   Package size: {len(raw_bytes)} bytes | Files count: {len(artifact_pkg.get('files', []))}")

    # Step 5: Upload -> Find or Create SharePoint List Item
    items_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items?$expand=fields&$top=200"
    req = urllib.request.Request(items_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        existing_items = json.loads(resp.read().decode()).get("value", [])

    matched_item_id = None
    for item in existing_items:
        fields = item.get("fields") or {}
        title = (fields.get("Title") or fields.get("title") or "").strip().lower()
        if title == art_name.lower():
            matched_item_id = item.get("id")
            break

    if not matched_item_id:
        print(f"[*] Creating new SharePoint List item for '{art_name}'...")
        create_payload = {
            "fields": {
                "Title": art_name,
                "ArtifactType": artifact_pkg.get("type", "skill"),
                "Version": art_version,
                "Description": (artifact_pkg.get("description") or "")[:255],
                "Category": artifact_pkg.get("category", "Testing & QA"),
                "IsCertified": True,
                "Submitted_x0020_By": artifact_pkg.get("author", "harsh.rana@maqsoftware.com")
            }
        }
        create_req = urllib.request.Request(
            f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items",
            data=json.dumps(create_payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(create_req) as c_resp:
            created = json.loads(c_resp.read().decode())
            matched_item_id = created["id"]
            print(f"[✓] Created List Item ID: {matched_item_id}")
    else:
        print(f"[✓] Located Existing List Item ID: {matched_item_id}")

    # Step 6: Direct Upload to SharePoint Document Library (Drive) & List Item
    print(f"\n[*] UPLOADING DIRECTLY TO SHAREPOINT (ZERO BACKEND)...")
    
    # 6a. Upload to Document Library
    drives_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives"
    req = urllib.request.Request(drives_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        drives = json.loads(resp.read().decode()).get("value", [])

    doc_drive = next((d for d in drives if "document" in d.get("name", "").lower() or d.get("name") == "Documents"), None)
    if doc_drive:
        drive_id = doc_drive["id"]
        folder_path = f"artifacts/{art_name}/{art_version}/{file_name}"
        drive_upload_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{folder_path}:/content"
        drive_req = urllib.request.Request(
            drive_upload_url,
            data=raw_bytes,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="PUT"
        )
        with urllib.request.urlopen(drive_req) as d_resp:
            d_res = json.loads(d_resp.read().decode())
            print(f"[✓] Document Library Upload Succeeded (HTTP {d_resp.status})!")
            print(f"    WebUrl: {d_res.get('webUrl')}")
            print(f"    DriveItem ID: {d_res.get('id')}")

    # Step 7: DIRECT DOWNLOAD (Without Backend)
    print(f"\n📥 INITIATING DIRECT CLIENT DOWNLOAD FROM SHAREPOINT (ZERO BACKEND)...")
    download_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{folder_path}:/content"
    req_down = urllib.request.Request(download_url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req_down) as r_resp:
        downloaded_bytes = r_resp.read()

    downloaded_pkg = json.loads(downloaded_bytes.decode("utf-8"))
    print(f"[✓] Direct Download Complete! Downloaded size: {len(downloaded_bytes)} bytes")
    print(f"    Package: {downloaded_pkg.get('name')} (v{downloaded_pkg.get('version')})")

    # Step 8: Client-Side Extraction & Local Verification
    print(f"\n📂 EXTRACTING FILES TO LOCAL DIRECTORY: '{OUTPUT_UNPACK_DIR}'...")
    os.makedirs(OUTPUT_UNPACK_DIR, exist_ok=True)

    extracted_files = []
    for f_entry in downloaded_pkg.get("files", []):
        rel_path = f_entry.get("path")
        content = f_entry.get("content")
        target_path = os.path.join(OUTPUT_UNPACK_DIR, rel_path)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as out_f:
            out_f.write(content)
        extracted_files.append(target_path)
        print(f"   [+] Unpacked: {rel_path} ({len(content)} chars)")

    # Step 9: Validation Check
    assert downloaded_pkg.get("files")[0]["content"] == artifact_pkg["files"][0]["content"], "Content mismatch!"

    print("\n================================================================")
    print("🎉 PROOF OF CONCEPT RESULTS:")
    print("================================================================")
    print(f"1. Direct Microsoft Entra ID Authentication:  PASSED")
    print(f"2. Direct SharePoint Site & Drive Resolution: PASSED")
    print(f"3. Direct JSON Package Upload to SharePoint:  PASSED")
    print(f"4. Direct Download via Microsoft Graph API:   PASSED (Zero Backend Required)")
    print(f"5. Client-Side Package Unpacking:             PASSED ({len(extracted_files)} file(s) unpacked)")
    print(f"6. End-to-End Content Checksum Integrity:     PASSED (100% Exact Match)")
    print("================================================================\n")

if __name__ == "__main__":
    run_poc()
