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

candidate_sites = [
    "sites/PowerAppsCoderepo-POC",
    "sites/AITeam2",
    "sites/Engineering-Commons",
    "sites/Engineering-Commons",
    "sites/AI-Leap",
    "sites/AITeam"
]

for site_path in candidate_sites:
    url = f"https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/{site_path}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    try:
        with urllib.request.urlopen(req) as resp:
            site_info = json.loads(resp.read().decode())
            print(f"\n================================================================================")
            print(f"FOUND SITE: {site_path} -> {site_info.get('displayName')} (ID: {site_info.get('id')})")
            print(f"================================================================================")
            site_id = site_info.get("id")
            
            # Query lists
            lists_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists?$top=100"
            req_l = urllib.request.Request(lists_url, headers={"Authorization": f"Bearer {tok}"})
            with urllib.request.urlopen(req_l) as resp_l:
                lists = json.loads(resp_l.read().decode()).get("value", [])
                print(f"Total Lists: {len(lists)}")
                for l in lists:
                    lid = l.get("id")
                    lname = l.get("displayName") or l.get("name")
                    
                    items_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{lid}/items?$expand=fields&$top=100"
                    try:
                        req_i = urllib.request.Request(items_url, headers={"Authorization": f"Bearer {tok}"})
                        with urllib.request.urlopen(req_i) as resp_i:
                            items = json.loads(resp_i.read().decode()).get("value", [])
                            print(f"\n  📋 LIST: {lname} (Items: {len(items)})")
                            for idx, it in enumerate(items):
                                flds = it.get("fields", {})
                                t = flds.get("Title") or flds.get("Project_x0020_Title") or flds.get("name") or "No Title"
                                cat = flds.get("Category") or flds.get("ArtifactType") or ""
                                msg = flds.get("Message") or flds.get("Description") or ""
                                if len(str(msg)) > 60: msg = str(msg)[:57] + "..."
                                print(f"     [{idx+1}] ID: {it.get('id')} | Title: '{t}' | Cat/Type: '{cat}' | Msg: '{msg}'")
                    except Exception as e_i:
                        print(f"  📋 LIST: {lname} (Error getting items: {e_i})")
    except urllib.error.HTTPError as e:
        print(f"Site {site_path}: HTTP {e.code}")
    except Exception as e:
        print(f"Site {site_path}: {e}")
