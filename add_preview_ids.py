#!/usr/bin/env python3
"""
add_preview_ids.py <DRIVE_FOLDER_ID>
Lists the uploaded preview folder, matches files back to collection items,
and rewrites collection.js with previewId fields.

Usage: python3 add_preview_ids.py 1AbCdEfGhIjKlMnOpQrStUvWxYz
"""
import sys, os, re, json
import gdown

DIR = os.path.dirname(os.path.abspath(__file__))
COLL_JS = os.path.join(DIR, 'collection.js')

def list_folder(folder_id):
    """Returns {filename: file_id} from a public Drive folder."""
    files = {}
    try:
        items = gdown.download_folder(
            id=folder_id, output='/tmp/gdown_preview_list',
            quiet=True, skip_download=True
        )
    except Exception:
        pass
    # gdown writes to stdout; use alternative API listing
    import urllib.request
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req).read().decode('utf-8')
        # Extract file IDs from folder HTML
        pattern = r'"(1[A-Za-z0-9_\-]{25,})".*?"([^"]+\.pdf)"'
        for m in re.finditer(pattern, html):
            files[m.group(2)] = m.group(1)
    except Exception as e:
        print(f"Warning: folder listing failed: {e}")
    return files

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 add_preview_ids.py <DRIVE_FOLDER_ID>")
        sys.exit(1)

    folder_id = sys.argv[1]
    print(f"Listing preview folder {folder_id} ...")
    folder_files = list_folder(folder_id)
    print(f"Found {len(folder_files)} files in folder")

    with open(COLL_JS) as f:
        content = f.read()
    m = re.search(r'const COLLECTION\s*=\s*(\[.*?\]);', content, re.DOTALL)
    if not m:
        raise RuntimeError("Cannot parse collection.js")
    items = json.loads(m.group(1))

    matched = 0
    for item in items:
        expected_name = f"preview_{item['id']}.pdf"
        if expected_name in folder_files:
            item['previewId'] = folder_files[expected_name]
            matched += 1
        else:
            item.setdefault('previewId', '')

    print(f"Matched {matched}/{len(items)} preview IDs")

    new_js = 'const COLLECTION = ' + json.dumps(items, indent=2, ensure_ascii=False) + ';\n'
    with open(COLL_JS, 'w') as f:
        f.write(new_js)
    print(f"Updated {COLL_JS}")

if __name__ == '__main__':
    main()
