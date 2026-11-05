import json
import os
import sys
import urllib.request
import urllib.error

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

s_path = os.path.expanduser("~/.engineering-commons/session.json")
with open(s_path, "r", encoding="utf-8") as f:
    tok = json.load(f).get("ssoToken")

sites_to_test = [
    "sites/MAQSoftwareAllEmployees",
    "sites/AITeam2",
    "sites/AITeam",
    "sites/PowerAppsCoderepo-POC",
    "sites/Engineering-Commons"
]

for sp in sites_to_test:
    url = f"https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/{sp}"
    try:
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
        with urllib.request.urlopen(req) as resp:
            site = json.loads(resp.read().decode())
        sid = site.get("id")
        name = site.get("displayName")
        print(f"\n========================================================")
        print(f"SITE: {sp} -> {name} (ID: {sid})")
        print(f"========================================================")
        
        l_req = urllib.request.Request(f"https://graph.microsoft.com/v1.0/sites/{sid}/lists?$top=100", headers={"Authorization": f"Bearer {tok}"})
        with urllib.request.urlopen(l_req) as l_resp:
            lists = json.loads(l_resp.read().decode()).get("value", [])
        print(f"Lists ({len(lists)}):")
        for l in lists:
            lid = l.get("id")
            lname = l.get("displayName")
            try:
                i_req = urllib.request.Request(f"https://graph.microsoft.com/v1.0/sites/{sid}/lists/{lid}/items?$expand=fields&$top=50", headers={"Authorization": f"Bearer {tok}"})
                with urllib.request.urlopen(i_req) as i_resp:
                    items = json.loads(i_resp.read().decode()).get("value", [])
                print(f"  - {lname} (Items: {len(items)})")
                for it in items[:10]:
                    flds = it.get("fields", {})
                    t = flds.get("Title") or flds.get("Project_x0020_Title") or flds.get("name") or "No Title"
                    print(f"      * {t}")
            except Exception as e_i:
                print(f"  - {lname} (Error: {e_i})")
    except urllib.error.HTTPError as e:
        print(f"Site {sp}: HTTP {e.code}")
    except Exception as e:
        print(f"Site {sp} error: {e}")
