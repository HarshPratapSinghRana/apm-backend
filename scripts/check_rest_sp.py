import os
import sys
import json
import urllib.request
import urllib.parse
import urllib.error

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

s_path = os.path.expanduser("~/.engineering-commons/session.json")
with open(s_path, "r", encoding="utf-8") as f:
    s = json.load(f)

tok = s.get("ssoToken") or s.get("token")

# Try SharePoint REST API
candidates = [
    "Engineering-Commons-Artifacts",
    "EngineeringCommonsArtifacts",
    "Engineering Commons Artifacts",
    "Artifacts"
]

print("=== Testing SharePoint REST API ===")
for title in candidates:
    encoded_title = urllib.parse.quote(title)
    url = f"https://testmaq.sharepoint.com/sites/AITeam2/_api/web/lists/getbytitle('{encoded_title}')/items"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {tok}",
        "Accept": "application/json;odata=verbose"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            results = data.get("d", {}).get("results", [])
            print(f"✓ Found via SharePoint REST API '{title}': {len(results)} items")
            for r in results:
                print(f"   - Title: {r.get('Title')} (ID: {r.get('ID')})")
    except urllib.error.HTTPError as e:
        print(f"  REST API '{title}': HTTP {e.code}")
    except Exception as e:
        print(f"  REST API '{title}': {e}")

print("\n=== Testing Graph API with encoded names ===")
site_url = "https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/sites/AITeam2"
req = urllib.request.Request(site_url, headers={"Authorization": f"Bearer {tok}"})
with urllib.request.urlopen(req) as resp:
    site_id = json.loads(resp.read().decode())["id"]

for title in candidates:
    encoded_title = urllib.parse.quote(title)
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{encoded_title}/items?$expand=fields"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            items = data.get("value", [])
            print(f"✓ Found via Graph API '{title}': {len(items)} items")
            for it in items:
                f = it.get("fields", {})
                print(f"   - Title: {f.get('Title')} (ID: {it.get('id')})")
    except urllib.error.HTTPError as e:
        print(f"  Graph API '{title}': HTTP {e.code}")
    except Exception as e:
        print(f"  Graph API '{title}': {e}")
