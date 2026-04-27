#!/usr/bin/env python3
"""
create_previews.py
Downloads each collection PDF from Google Drive, keeps only pages 1-30,
saves to ./previews/preview_FILEID.pdf
After running: upload those files to Drive, get their IDs, update collection.js
"""
import os, sys, json, re
import gdown
from pypdf import PdfReader, PdfWriter

PREVIEW_PAGES = 30
DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(DIR, 'previews')
COLL_JS = os.path.join(DIR, 'collection.js')

def parse_collection():
    with open(COLL_JS) as f:
        content = f.read()
    m = re.search(r'const COLLECTION\s*=\s*(\[.*?\]);', content, re.DOTALL)
    if not m:
        raise RuntimeError("Cannot parse collection.js")
    return json.loads(m.group(1))

def make_preview(item, i, total):
    fid = item['id']
    label = f"{item['year']} {item['subject']} {item['kertas']}"
    out_path = os.path.join(OUT_DIR, f'preview_{fid}.pdf')

    if os.path.exists(out_path):
        print(f"[{i}/{total}] SKIP (exists): {label}")
        return True

    tmp = f'/tmp/coll_dl_{fid}.pdf'
    print(f"[{i}/{total}] Downloading: {label} ...", end=' ', flush=True)
    try:
        gdown.download(id=fid, output=tmp, quiet=True)
    except Exception as e:
        print(f"FAIL download: {e}")
        return False

    try:
        reader = PdfReader(tmp)
        n = min(PREVIEW_PAGES, len(reader.pages))
        writer = PdfWriter()
        for p in range(n):
            writer.add_page(reader.pages[p])
        with open(out_path, 'wb') as f:
            writer.write(f)
        print(f"OK ({n} pages → {os.path.basename(out_path)})")
        return True
    except Exception as e:
        print(f"FAIL extract: {e}")
        return False
    finally:
        try: os.remove(tmp)
        except: pass

def main():
    items = parse_collection()
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"Total: {len(items)} files → previews in {OUT_DIR}\n")

    ok = fail = 0
    for i, item in enumerate(items, 1):
        if make_preview(item, i, len(items)):
            ok += 1
        else:
            fail += 1

    print(f"\nDone: {ok} ok, {fail} failed")
    print(f"\nNext steps:")
    print(f"1. Upload all files in '{OUT_DIR}' to a Google Drive folder")
    print(f"2. Set sharing to 'Anyone with the link can view'")
    print(f"3. Run:  python3 add_preview_ids.py <FOLDER_ID>")
    print(f"   to automatically update collection.js with preview IDs")

if __name__ == '__main__':
    main()
