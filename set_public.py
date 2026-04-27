#!/usr/bin/env python3
"""
set_public.py
Sets all files in the collection Drive folder to "Anyone with link can view",
then re-runs create_previews.py for the ones that failed.

Steps:
1. python3 set_public.py          ← opens browser for Google login
2. Paste the callback URL when prompted
3. Script updates all file permissions automatically
"""
import os, sys, json, re, webbrowser
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# The folder IDs from the collection Drive
FOLDER_ID = '1cqbvJ4_C8P4KyqhGTjiCIq5yecHgpJfj'
SCOPES = ['https://www.googleapis.com/auth/drive']
TOKEN_FILE = os.path.join(os.path.dirname(__file__), '.drive_token.json')

# Google's public OAuth client for installed apps (works without a Cloud project)
# We use a bundled client_secrets approach
CLIENT_CONFIG = {
    "installed": {
        "client_id": "YOUR_CLIENT_ID",
        "client_secret": "YOUR_CLIENT_SECRET",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
    }
}

def get_credentials():
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        if creds and creds.valid:
            return creds
    flow = InstalledAppFlow.from_client_config(CLIENT_CONFIG, SCOPES)
    creds = flow.run_local_server(port=0)
    with open(TOKEN_FILE, 'w') as f:
        f.write(creds.to_json())
    return creds

def list_all_files(service, folder_id):
    """Recursively list all file IDs in folder."""
    results = []
    page_token = None
    while True:
        resp = service.files().list(
            q=f"'{folder_id}' in parents and trashed=false",
            fields="nextPageToken, files(id, name, mimeType)",
            pageToken=page_token
        ).execute()
        for item in resp.get('files', []):
            if item['mimeType'] == 'application/vnd.google-apps.folder':
                results.extend(list_all_files(service, item['id']))
            else:
                results.append(item)
        page_token = resp.get('nextPageToken')
        if not page_token:
            break
    return results

def set_public(service, file_id, name):
    try:
        service.permissions().create(
            fileId=file_id,
            body={'type': 'anyone', 'role': 'reader'},
            fields='id'
        ).execute()
        return True
    except Exception as e:
        print(f"  ERROR {name}: {e}")
        return False

def main():
    print("=" * 55)
    print("  Drive Permission Updater")
    print("=" * 55)

    if CLIENT_CONFIG['installed']['client_id'] == 'YOUR_CLIENT_ID':
        print("""
⚠️  Setup needed — takes 2 minutes:

1. Go to: https://console.cloud.google.com/
2. Create a new project (any name)
3. Enable: APIs & Services → Enable APIs → search "Google Drive API" → Enable
4. Go to: APIs & Services → Credentials → Create Credentials → OAuth client ID
5. Application type: Desktop app
6. Download the JSON → save as 'credentials.json' in this folder

Then run:  python3 set_public.py credentials.json
""")
        if len(sys.argv) < 2:
            sys.exit(1)

    # Load credentials from file if provided
    global CLIENT_CONFIG
    if len(sys.argv) >= 2:
        creds_file = sys.argv[1]
        with open(creds_file) as f:
            CLIENT_CONFIG = json.load(f)

    print("Opening browser for Google login...")
    creds = get_credentials()
    service = build('drive', 'v3', credentials=creds)

    print(f"\nListing all files in folder {FOLDER_ID}...")
    files = list_all_files(service, FOLDER_ID)
    print(f"Found {len(files)} files\n")

    ok = fail = 0
    for i, f in enumerate(files, 1):
        print(f"[{i}/{len(files)}] {f['name'][:50]} ...", end=' ', flush=True)
        if set_public(service, f['id'], f['name']):
            print("✓")
            ok += 1
        else:
            fail += 1

    print(f"\nDone: {ok} updated, {fail} errors")
    print("\nNow run:  python3 create_previews.py")

if __name__ == '__main__':
    main()
