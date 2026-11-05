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

# Check site
url = "https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/sites/AITeam2"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
with urllib.request.urlopen(req) as resp:
    site_info = json.loads(resp.read().decode())

site_id = site_info.get("id")
print("================================================================================")
print(f"SITE: {site_info.get('displayName')} ({site_info.get('webUrl')})")
print("================================================================================")

lists_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists?$top=100"
req = urllib.request.Request(lists_url, headers={"Authorization": f"Bearer {tok}"})
with urllib.request.urlopen(req) as resp:
    lists = json.loads(resp.read().decode()).get("value", [])

print(f"Total Lists found on site: {len(lists)}")

for l in lists:
    list_id = l.get("id")
    list_name = l.get("displayName") or l.get("name")
    print(f"\n📋 LIST: {list_name} (ID: {list_id})")
    
    items_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items?$expand=fields&$top=200"
    try:
        req_items = urllib.request.Request(items_url, headers={"Authorization": f"Bearer {tok}"})
        with urllib.request.urlopen(req_items) as resp_items:
            items_data = json.loads(resp_items.read().decode()).get("value", [])
            print(f"   Items Count: {len(items_data)}")
            for idx, item in enumerate(items_data):
                fields = item.get("fields", {})
                title = fields.get("Title") or fields.get("title") or fields.get("Project_x0020_Title") or "Untitled"
                cat = fields.get("Category") or fields.get("category") or ""
                type_ = fields.get("ArtifactType") or fields.get("Type") or ""
                author = fields.get("SubmittedBy") or fields.get("Submitted_x0020_By") or fields.get("Author") or fields.get("RecipientEmail") or ""
                msg = fields.get("Message") or fields.get("Description") or fields.get("Comment") or ""
                if len(str(msg)) > 80: msg = str(msg)[:77] + "..."
                print(f"   [{idx+1}] ID: {item.get('id')} | Title: '{title}' | Cat/Type: '{cat or type_}' | Author/User: '{author}' | Msg: '{msg}'")
    except Exception as e:
        print(f"   Error reading items: {e}")
