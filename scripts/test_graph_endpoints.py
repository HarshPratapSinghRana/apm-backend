import os
import sys
import json
import urllib.request
import urllib.error

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

s_path = os.path.expanduser("~/.engineering-commons/session.json")
with open(s_path, "r", encoding="utf-8") as f:
    s = json.load(f)

tok = s.get("ssoToken") or s.get("token")

endpoints = [
    "https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/sites/AITeam2:/lists",
    "https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/sites/AITeam2:/lists/EngineeringCommonsArtifacts",
    "https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/sites/AITeam2:/lists/EngineeringCommonsArtifacts/items?$expand=fields",
    "https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/sites/AITeam2:/lists/Engineering-Commons-Artifacts/items?$expand=fields",
    "https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com,78c9eaf8-1d00-4a92-a7d0-dc05bc9ce374,a237e8de-2804-4b52-80da-ad5d49155e15/lists",
    "https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com,78c9eaf8-1d00-4a92-a7d0-dc05bc9ce374,a237e8de-2804-4b52-80da-ad5d49155e15/drives"
]

for ep in endpoints:
    req = urllib.request.Request(ep, headers={"Authorization": f"Bearer {tok}"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            val = data.get("value")
            if val is not None:
                print(f"✓ {ep} -> {len(val)} items/lists: {json.dumps(val)[:200]}")
            else:
                print(f"✓ {ep} -> {json.dumps(data)[:200]}")
    except urllib.error.HTTPError as e:
        print(f"✗ {ep} -> HTTP {e.code}: {e.read().decode()[:150]}")
    except Exception as e:
        print(f"✗ {ep} -> {e}")
