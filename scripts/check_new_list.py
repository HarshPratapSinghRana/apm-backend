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

# 1. Site resolution
site_url = "https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/sites/AITeam2"
req = urllib.request.Request(site_url, headers={"Authorization": f"Bearer {tok}"})
with urllib.request.urlopen(req) as resp:
    site_info = json.loads(resp.read().decode())
    site_id = site_info["id"]
    print(f"Site: {site_info.get('displayName')} | ID: {site_id}")

# 2. Try getting the list directly by display name / title
for name in ["EngineeringCommonsArtifacts", "Engineering-Commons-Artifacts", "Engineering Commons Artifacts"]:
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{name}"
    r = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    try:
        with urllib.request.urlopen(r) as resp:
            data = json.loads(resp.read().decode())
            print(f"\n✓ Found list directly via '{name}': {data.get('displayName')} (ID: {data.get('id')})")
            
            # Fetch items
            items_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{data.get('id')}/items?$expand=fields"
            r_i = urllib.request.Request(items_url, headers={"Authorization": f"Bearer {tok}"})
            with urllib.request.urlopen(r_i) as resp_i:
                items = json.loads(resp_i.read().decode()).get("value", [])
                print(f"  Items in list: {len(items)}")
                for it in items:
                    f = it.get("fields", {})
                    print(f"    - Title: {f.get('Title')} | Fields: {list(f.keys())}")
    except urllib.error.HTTPError as e:
        print(f"Direct lookup '{name}': HTTP {e.code}")
    except Exception as e:
        print(f"Direct lookup '{name}': {e}")
