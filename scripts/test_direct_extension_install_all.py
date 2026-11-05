"""
Test Direct Client Installation for All Artifacts directly from SharePoint (Zero Backend)
"""

import os
import sys
import json
import urllib.request

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

TEST_TARGETS = [
    "enterprise-reviewer",
    "time-mcp",
    "accessibility-fix",
    "security-scan",
    "review-and-refactor",
    "kubernetes-security-auditor"
]

DEST_TEST_DIR = os.path.join("test", "installed-from-sp")
os.makedirs(DEST_TEST_DIR, exist_ok=True)

# 1. Get SharePoint Token
token_path = os.path.expanduser("~/.engineering-commons/session.json")
with open(token_path, "r", encoding="utf-8") as f:
    s = json.load(f)
token = s.get("ssoToken") or s.get("token")
headers = {"Authorization": f"Bearer {token}"}

# 2. Resolve SharePoint Document Drive ID
site_url = "https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/sites/AITeam2"
with urllib.request.urlopen(urllib.request.Request(site_url, headers=headers)) as resp:
    site_id = json.loads(resp.read().decode())["id"]

drives_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives"
with urllib.request.urlopen(urllib.request.Request(drives_url, headers=headers)) as resp:
    drives = json.loads(resp.read().decode()).get("value", [])

doc_drive = next(d for d in drives if "document" in d.get("name", "").lower() or d.get("name") == "Documents")
drive_id = doc_drive["id"]

print("================================================================================")
print("📥 TESTING DIRECT SHAREPOINT INSTALLATION (ZERO BACKEND)")
print("================================================================================")

all_passed = True

for target in TEST_TARGETS:
    folder_path = f"artifacts/{target}/1.0.0/{target}.json"
    download_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{folder_path}:/content"
    try:
        req = urllib.request.Request(download_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            data = resp.read()

        pkg = json.loads(data.decode("utf-8"))
        print(f"\n[✓] Direct Downloaded '{target}' (v{pkg.get('version')}) from SharePoint ({len(data)} bytes):")

        # Unpack files
        for f in pkg.get("files", []):
            dest_file = os.path.join(DEST_TEST_DIR, f["path"])
            os.makedirs(os.path.dirname(dest_file), exist_ok=True)
            with open(dest_file, "w", encoding="utf-8") as out:
                out.write(f["content"])
            print(f"    [+] Installed: {f['path']} ({len(f['content'])} chars)")

    except Exception as e:
        print(f"\n[!] Failed to install '{target}' directly from SharePoint: {e}")
        all_passed = False

print("\n================================================================================")
if all_passed:
    print("🎉 ALL TEST ARTIFACTS INSTALLED DIRECTLY FROM SHAREPOINT WITH 100% SUCCESS!")
else:
    print("[!] Some artifacts failed.")
print("================================================================================\n")
