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

# Search for all sites the user has access to
search_url = "https://graph.microsoft.com/v1.0/sites?search=*"
req = urllib.request.Request(search_url, headers={"Authorization": f"Bearer {tok}"})

try:
    with urllib.request.urlopen(req) as resp:
        sites = json.loads(resp.read().decode()).get("value", [])
        print(f"Total accessible sites found: {len(sites)}")
        for site in sites:
            site_name = site.get("name") or site.get("displayName")
            web_url = site.get("webUrl")
            site_id = site.get("id")
            print(f"\n--- Site: {site_name} ({web_url}) ---")
            
            # Check lists on this site
            try:
                l_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists?$top=100"
                req_l = urllib.request.Request(l_url, headers={"Authorization": f"Bearer {tok}"})
                with urllib.request.urlopen(req_l) as resp_l:
                    lists = json.loads(resp_l.read().decode()).get("value", [])
                    custom_lists = [l for l in lists if not l.get("list", {}).get("hidden")]
                    print(f"    Custom lists count: {len(custom_lists)}")
                    for cl in custom_lists:
                        cl_name = cl.get("displayName") or cl.get("name")
                        print(f"      - {cl_name} (ID: {cl.get('id')})")
            except Exception as e_l:
                print(f"    Could not get lists: {e_l}")
except Exception as e:
    print(f"Error searching sites: {e}")
