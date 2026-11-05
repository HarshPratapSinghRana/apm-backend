import os
import json
import urllib.request

s_path = os.path.expanduser('~/.engineering-commons/session.json')
with open(s_path, 'r', encoding='utf-8') as f:
    s = json.load(f)
tok = s.get('ssoToken') or s.get('token')
headers = {'Authorization': f'Bearer {tok}'}

# Check site drives
site_url = 'https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/sites/AITeam2'
with urllib.request.urlopen(urllib.request.Request(site_url, headers=headers)) as resp:
    site_id = json.loads(resp.read().decode())['id']

drives_url = f'https://graph.microsoft.com/v1.0/sites/{site_id}/drives'
with urllib.request.urlopen(urllib.request.Request(drives_url, headers=headers)) as resp:
    drives = json.loads(resp.read().decode()).get('value', [])

print('=== SharePoint Drives (Document Libraries) ===')
for d in drives:
    print(f"Drive: {d.get('name')} | ID: {d.get('id')} | Type: {d.get('driveType')}")

# Check item fields for api-test-generator
list_name = 'Engineering-Commons-Artifacts'
item_url = f'https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_name}/items/4?$expand=fields'
with urllib.request.urlopen(urllib.request.Request(item_url, headers=headers)) as resp:
    item_data = json.loads(resp.read().decode())

print('\n=== Item #4 Fields ===')
print(json.dumps(item_data.get('fields', {}), indent=2))
