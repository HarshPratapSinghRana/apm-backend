import os
import sys
import json
import urllib.request
import urllib.error

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

s_path = os.path.expanduser("~/.engineering-commons/session.json")
if not os.path.exists(s_path):
    print(f"Session file not found at {s_path}")
    sys.exit(1)

with open(s_path, "r", encoding="utf-8") as f:
    s = json.load(f)

tok = s.get("ssoToken") or s.get("token")
if not tok:
    print("No token in session.json")
    sys.exit(1)

site_url = "https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/sites/AITeam2"
req = urllib.request.Request(site_url, headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})

try:
    with urllib.request.urlopen(req) as resp:
        site_info = json.loads(resp.read().decode())
        site_id = site_info["id"]
        print(f"Connected to SharePoint Site: {site_info.get('displayName')} (ID: {site_id})")
except Exception as e:
    print(f"Failed to connect to site: {e}")
    sys.exit(1)

def get_lists():
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists?$top=100"
    r = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read().decode()).get("value", [])

def create_list(display_name, columns):
    payload = {
        "displayName": display_name,
        "columns": columns,
        "list": {"template": "genericList"}
    }
    data = json.dumps(payload).encode("utf-8")
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists"
    r = urllib.request.Request(url, data=data, headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(r) as resp:
            res = json.loads(resp.read().decode())
            print(f"  ✓ Created List: {display_name} (ID: {res.get('id')})")
            return res.get("id")
    except urllib.error.HTTPError as he:
        err = he.read().decode()
        print(f"  Note for {display_name}: HTTP {he.code} -> {err}")
        return None

def add_item(list_id, fields):
    payload = {"fields": fields}
    data = json.dumps(payload).encode("utf-8")
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items"
    r = urllib.request.Request(url, data=data, headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as he:
        err = he.read().decode()
        print(f"    Item add error: HTTP {he.code} -> {err}")
        return None

existing = {l.get("displayName") or l.get("name"): l.get("id") for l in get_lists()}
print(f"Existing lists on site: {list(existing.keys())}")

# 1. Engineering-Commons-Artifacts
art_cols = [
    {"name": "ArtifactType", "text": {}},
    {"name": "Category", "text": {}},
    {"name": "Version", "text": {}},
    {"name": "Description", "text": {}},
    {"name": "Visibility", "text": {}},
    {"name": "SubmittedBy", "text": {}},
    {"name": "IsCertified", "boolean": {}},
    {"name": "Downloads", "number": {}},
    {"name": "Rating", "number": {}}
]

art_list_id = existing.get("Engineering-Commons-Artifacts")
if not art_list_id:
    print("\nCreating 'Engineering-Commons-Artifacts' list...")
    art_list_id = create_list("Engineering-Commons-Artifacts", art_cols)
else:
    print(f"\n'Engineering-Commons-Artifacts' already exists: {art_list_id}")

# 2. Engineering-Commons-Bounties
bnt_cols = [
    {"name": "Category", "text": {}},
    {"name": "Status", "text": {}},
    {"name": "Stage", "text": {}},
    {"name": "RewardCredits", "number": {}},
    {"name": "Description", "text": {}},
    {"name": "ClaimedBy", "text": {}}
]

bnt_list_id = existing.get("Engineering-Commons-Bounties")
if not bnt_list_id:
    print("\nCreating 'Engineering-Commons-Bounties' list...")
    bnt_list_id = create_list("Engineering-Commons-Bounties", bnt_cols)
else:
    print(f"\n'Engineering-Commons-Bounties' already exists: {bnt_list_id}")

# Populate seed artifacts if list is empty
if art_list_id:
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{art_list_id}/items?$top=10"
    r = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    with urllib.request.urlopen(r) as resp:
        items = json.loads(resp.read().decode()).get("value", [])
    
    if len(items) == 0:
        print("\nPopulating seed artifacts into SharePoint list...")
        seed_artifacts = [
            {"Title": "design-reviewer", "ArtifactType": "skill", "Category": "Architecture & Design", "Version": "1.0.0", "Description": "Interactive system design reviewer and architectural feedback assistant.", "Visibility": "Public", "SubmittedBy": "harshpratap.rana@maqsoftware.com", "IsCertified": True, "Downloads": 42, "Rating": 5.0},
            {"Title": "accessibility-fix", "ArtifactType": "skill", "Category": "Frontend & UI", "Version": "1.2.0", "Description": "Scans and fixes WCAG 2.1 AA accessibility issues across web projects.", "Visibility": "Public", "SubmittedBy": "harshpratap.rana@maqsoftware.com", "IsCertified": True, "Downloads": 68, "Rating": 4.9},
            {"Title": "semantic-sql-optimizer", "ArtifactType": "skill", "Category": "Data & Analytics", "Version": "2.0.1", "Description": "Analyzes complex SQL queries and generates AST execution optimization recommendations.", "Visibility": "Public", "SubmittedBy": "harshpratap.rana@maqsoftware.com", "IsCertified": True, "Downloads": 89, "Rating": 4.8},
            {"Title": "api-test-generator", "ArtifactType": "agent", "Category": "Testing & QA", "Version": "1.1.0", "Description": "Automatically generates comprehensive xUnit and integration tests for REST API endpoints.", "Visibility": "Public", "SubmittedBy": "harshpratap.rana@maqsoftware.com", "IsCertified": True, "Downloads": 115, "Rating": 5.0}
        ]
        for art in seed_artifacts:
            res = add_item(art_list_id, art)
            if res:
                print(f"  ✓ Added Artifact: {art['Title']}")

# Populate seed bounties if list is empty
if bnt_list_id:
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{bnt_list_id}/items?$top=10"
    r = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    with urllib.request.urlopen(r) as resp:
        b_items = json.loads(resp.read().decode()).get("value", [])
    
    if len(b_items) == 0:
        print("\nPopulating seed bounties into SharePoint list...")
        seed_bounties = [
            {"Title": "Implement OAuth Token Refresh in CLI", "Category": "Security", "Status": "Open", "Stage": "Open", "RewardCredits": 150, "Description": "Add automatic background token refresh for MSAL sessions in the .NET 10 CLI."},
            {"Title": "Add Dark Mode Theme to Review Panel", "Category": "UI/UX", "Status": "Open", "Stage": "Open", "RewardCredits": 100, "Description": "Improve contrast and palette harmony in the right-side reviews panel webview."},
            {"Title": "Generate Helm Charts for Kubernetes Deployment", "Category": "DevOps", "Status": "Open", "Stage": "Open", "RewardCredits": 200, "Description": "Create production Helm charts with resource limits and health probes."}
        ]
        for b in seed_bounties:
            res = add_item(bnt_list_id, b)
            if res:
                print(f"  ✓ Added Bounty: {b['Title']}")

print("\nSharePoint setup and synchronization completed successfully!")
