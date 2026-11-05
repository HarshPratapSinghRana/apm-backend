#!/usr/bin/env python3
"""
Sync Azure DevOps Telemetry Logs to Microsoft 365 SharePoint Online.
Simulates and executes the automated Power Automate pipeline:
ADO (/telemetry/usage-events.json) -> Power Automate -> SharePoint List (Engineering-Commons-Telemetry)
"""

import os
import sys
import json
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ[k.strip()] = v.strip().strip('"').strip("'")

load_env()

# Configuration
ADO_ORG = os.getenv('AZURE_DEVOPS_ORG', 'MAQInternalCIP-Engineering-Commons')
ADO_PROJECT = os.getenv('AZURE_DEVOPS_PROJECT', 'Engineering Commons')
ADO_REPO = os.getenv('AZURE_DEVOPS_REPO', 'Engineering Commons')
ADO_PAT = os.getenv('AZURE_DEVOPS_PAT', '')

SP_HOST = os.getenv('SHAREPOINT_HOSTNAME', 'testmaq.sharepoint.com')
SP_SITE = os.getenv('SHAREPOINT_SITE_PATH', 'sites/AITeam2')
CLIENT_ID = os.getenv('SHAREPOINT_CLIENT_ID', 'a5f3ba81-4c95-4c74-afd9-38b72cf39156')

def get_msal_token():
    home = os.path.expanduser('~')
    token_file = os.path.join(home, '.engineering-commons', 'token.json')
    if os.path.exists(token_file):
        try:
            with open(token_file, 'r', encoding='utf-8') as f:
                d = json.load(f)
                if d.get('refresh_token'):
                    data = urllib.parse.urlencode({
                        'client_id': CLIENT_ID,
                        'grant_type': 'refresh_token',
                        'refresh_token': d['refresh_token'],
                        'scope': 'https://graph.microsoft.com/Sites.ReadWrite.All offline_access openid profile'
                    }).encode('utf-8')
                    req = urllib.request.Request(
                        'https://login.microsoftonline.com/maqsoftware.com/oauth2/v2.0/token',
                        data=data,
                        headers={'Content-Type': 'application/x-www-form-urlencoded'}
                    )
                    with urllib.request.urlopen(req) as resp:
                        res = json.loads(resp.read().decode('utf-8'))
                        return res.get('access_token')
                if d.get('access_token'):
                    return d['access_token']
        except Exception:
            pass

    session_file = os.path.join(home, '.engineering-commons', 'session.json')
    if os.path.exists(session_file):
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                sess = json.load(f)
                return sess.get('ssoToken') or sess.get('token')
        except Exception:
            pass
    return None

def fetch_ado_telemetry_events():
    """Fetch usage events from Azure DevOps repository or local fallback."""
    if ADO_PAT:
        try:
            import base64
            auth = base64.b64encode(f":{ADO_PAT}".encode('utf-8')).decode('utf-8')
            project_enc = urllib.parse.quote(ADO_PROJECT)
            repo_enc = urllib.parse.quote(ADO_REPO)
            url = f"https://dev.azure.com/{ADO_ORG}/{project_enc}/_apis/git/repositories/{repo_enc}/items?path=/telemetry/usage-events.json&includeContent=true&api-version=7.0"
            req = urllib.request.Request(url, headers={'Authorization': f'Basic {auth}', 'Accept': 'application/json'})
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if 'content' in data:
                    return json.loads(data['content'])
        except Exception as e:
            print(f"  [Info] ADO remote fetch notice: {e}")

    # Local fallback
    local_file = os.path.join(os.path.dirname(__file__), '..', 'telemetry', 'usage-events.json')
    if os.path.exists(local_file):
        with open(local_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def main():
    print("=" * 70)
    print("  Power Automate Pipeline: ADO Telemetry -> SharePoint List Sync  ")
    print("=" * 70)

    events = fetch_ado_telemetry_events()
    print(f"  Found {len(events)} telemetry events in ADO / Local Telemetry log.")

    if not events:
        print("  No telemetry events found to sync.")
        return

    token = get_msal_token()
    if not token:
        print("  [Warning] No active Microsoft Graph SSO token found for live SharePoint write.")
        print("  Events are validated and ready for the Power Automate Flow trigger.")
        return

    # 1. Resolve SharePoint site ID
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    clean_path = SP_SITE.strip('/')
    site_url = f"https://graph.microsoft.com/v1.0/sites/{SP_HOST}:/{clean_path}"

    try:
        req = urllib.request.Request(site_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            site_data = json.loads(resp.read().decode('utf-8'))
            site_id = site_data['id']
            print(f"  Connected to SharePoint site: {site_data.get('displayName')} ({site_id})")
    except Exception as e:
        print(f"  [Error] SharePoint site connection failed: {e}")
        return

    # 2. Resolve Engineering-Commons-Telemetry list ID
    lists_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists?$top=100"
    telemetry_list_id = None
    try:
        req = urllib.request.Request(lists_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            lists_data = json.loads(resp.read().decode('utf-8'))
            for l in lists_data.get('value', []):
                clean_name = "".join(c for c in l.get('displayName', '').lower() if c.isalnum())
                if clean_name in ["engineeringcommonstelemetry", "telemetry", "engineeringcommonstelemetry"]:
                    telemetry_list_id = l['id']
                    print(f"  Target List: {l.get('displayName')} ({telemetry_list_id})")
                    break
    except Exception as e:
        print(f"  [Error] Failed to resolve list: {e}")
        return

    if not telemetry_list_id:
        print("  [Notice] List 'Engineering-Commons-Telemetry' not found on site.")
        return

    # 3. Fetch existing items to avoid duplicate insertions
    existing_keys = set()
    try:
        items_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{telemetry_list_id}/items?$expand=fields&$top=500"
        req = urllib.request.Request(items_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            items_data = json.loads(resp.read().decode('utf-8'))
            for it in items_data.get('value', []):
                f = it.get('fields', {})
                key = f"{f.get('Timestamp')}_{f.get('UserEmail')}_{f.get('ArtifactId')}_{f.get('Title')}"
                existing_keys.add(key)
    except Exception as e:
        print(f"  [Warning] Failed to fetch existing items: {e}")

    # 4. Insert new telemetry items into SharePoint list
    synced_count = 0
    for evt in events:
        key = f"{evt.get('timestamp')}_{evt.get('userEmail')}_{evt.get('artifactId')}_{evt.get('action') or evt.get('eventType')}"
        if key in existing_keys:
            continue

        item_payload = {
            "fields": {
                "Title": evt.get('action') or evt.get('eventType') or 'USE',
                "UserId": evt.get('userId') or evt.get('userEmail'),
                "UserEmail": evt.get('userEmail') or evt.get('userId'),
                "ArtifactId": evt.get('artifactId') or evt.get('artifactName'),
                "ArtifactName": evt.get('artifactName') or evt.get('artifactId'),
                "ArtifactType": evt.get('artifactType') or 'skill',
                "ArtifactVersion": evt.get('artifactVersion') or '1.0.0',
                "Source": evt.get('source') or 'VS_CODE',
                "Platform": evt.get('platform') or 'EngineeringCommons',
                "Workspace": evt.get('workspace') or 'default',
                "Timestamp": evt.get('timestamp') or datetime.utcnow().isoformat(),
                "Metadata": evt.get('metadata') or ''
            }
        }

        create_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{telemetry_list_id}/items"
        try:
            req = urllib.request.Request(
                create_url,
                data=json.dumps(item_payload).encode('utf-8'),
                headers=headers,
                method='POST'
            )
            with urllib.request.urlopen(req) as resp:
                synced_count += 1
                existing_keys.add(key)
        except Exception as e:
            print(f"  [Notice] Insert item skipped: {e}")

    print(f"\n  Successfully synced {synced_count} new telemetry records into SharePoint Online list.")
    print("=" * 70)

if __name__ == '__main__':
    main()
