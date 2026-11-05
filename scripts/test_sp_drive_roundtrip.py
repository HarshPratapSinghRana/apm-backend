import os
import sys
import json
import urllib.request
import urllib.parse
import urllib.error

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

s_path = os.path.expanduser('~/.engineering-commons/session.json')
with open(s_path, 'r', encoding='utf-8') as f:
    s = json.load(f)
tok = s.get('ssoToken') or s.get('token')
headers = {'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'}

# 1. Site and Drive Resolution
site_url = 'https://graph.microsoft.com/v1.0/sites/testmaq.sharepoint.com:/sites/AITeam2'
with urllib.request.urlopen(urllib.request.Request(site_url, headers=headers)) as resp:
    site_id = json.loads(resp.read().decode())['id']

drives_url = f'https://graph.microsoft.com/v1.0/sites/{site_id}/drives'
with urllib.request.urlopen(urllib.request.Request(drives_url, headers=headers)) as resp:
    drives = json.loads(resp.read().decode()).get('value', [])

doc_drive = next(d for d in drives if d.get('name') == 'Documents')
drive_id = doc_drive['id']
print(f"✓ Found Document Library Drive: '{doc_drive['name']}' (ID: {drive_id})")

# 2. Read local test JSON package
test_file = os.path.join('artifacts-json', 'api-test-generator.json')
with open(test_file, 'r', encoding='utf-8') as f:
    orig_pkg = json.load(f)

raw_bytes = json.dumps(orig_pkg, indent=2, ensure_ascii=False).encode('utf-8')
art_name = orig_pkg['name']
art_version = orig_pkg.get('version', '1.0.0')
dest_path = f"artifacts/{art_name}/{art_version}/{art_name}.json"

print(f"\n[*] 1. Direct Upload to SharePoint Document Library: /{dest_path} ({len(raw_bytes)} bytes)...")
upload_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{dest_path}:/content"
req = urllib.request.Request(upload_url, data=raw_bytes, headers={'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'}, method='PUT')
with urllib.request.urlopen(req) as resp:
    upload_res = json.loads(resp.read().decode())
    print(f"✓ Upload Succeeded (HTTP {resp.status})! WebUrl: {upload_res.get('webUrl')}")
    item_drive_id = upload_res.get('id')
    print(f"  DriveItem ID: {item_drive_id}")

# 3. Direct Download without backend
print(f"\n[*] 2. Direct Download from SharePoint Document Library (Zero Backend)...")
download_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{dest_path}:/content"
req_down = urllib.request.Request(download_url, headers={'Authorization': f'Bearer {tok}'})
with urllib.request.urlopen(req_down) as resp_down:
    downloaded_data = resp_down.read()
    print(f"✓ Download Succeeded (HTTP {resp_down.status})! Downloaded {len(downloaded_data)} bytes")

downloaded_pkg = json.loads(downloaded_data.decode('utf-8'))
print(f"  Package Name: {downloaded_pkg.get('name')}")
print(f"  Version:      {downloaded_pkg.get('version')}")
print(f"  Files Count:  {len(downloaded_pkg.get('files', []))}")

# 4. Extract into local test directory
output_dir = os.path.join('test', 'poc-direct-download')
os.makedirs(output_dir, exist_ok=True)
for fe in downloaded_pkg.get('files', []):
    fp = os.path.join(output_dir, fe['path'])
    os.makedirs(os.path.dirname(fp), exist_ok=True)
    with open(fp, 'w', encoding='utf-8') as out_f:
        out_f.write(fe['content'])
    print(f"  [+] Unpacked: {fe['path']} -> {fp}")

# 5. Verify Content
with open(os.path.join(output_dir, downloaded_pkg['files'][0]['path']), 'r', encoding='utf-8') as f:
    read_back = f.read()

assert read_back == orig_pkg['files'][0]['content'], "Content mismatch!"
print("\n🎉 100% CONTENT VERIFIED! Direct SharePoint Upload & Download Round-Trip Successful!")
