import json
import os
import urllib.request

session_path = os.path.expanduser("~/.engineering-commons/session.json")
with open(session_path, "r", encoding="utf-8") as f:
    data = json.load(f)

token = data.get("token") or data.get("ssoToken")
url = "https://testmaq.sharepoint.com/sites/AITeam2/_api/web/lists?$select=Title,ItemCount,Hidden"

req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json;odata=verbose"})
try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("SharePoint REST API Lists:")
        for l in res.get("d", {}).get("results", []):
            print(f" - Title: {l.get('Title')}, Items: {l.get('ItemCount')}, Hidden: {l.get('Hidden')}")
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code)
    print(e.read().decode()[:500])
except Exception as e:
    print("Error:", e)
