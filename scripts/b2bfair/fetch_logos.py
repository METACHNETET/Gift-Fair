"""Download B2B fair logos from the businesses spreadsheet.

Usage: python fetch_logos.py <xlsx> <download_dir> <out_dir> <out_json>
Only business name, gift name/description/link and logo are used —
contact details (email, phone) are never read into the output.
"""
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from collections import Counter

import openpyxl
from PIL import Image

xlsx, download_dir, out_dir, out_json = sys.argv[1:5]
wb = openpyxl.load_workbook(xlsx)
ws = wb['שליחה לנטפרי']

UA = {'User-Agent': 'Mozilla/5.0'}


def drive_ids(text):
    return re.findall(r'id=([\w-]+)', text or '')


def fetch(url):
    url = urllib.parse.quote(url, safe=':/?&=%@#')
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read(), r.headers.get('Content-Type', '')


def brand_color(img):
    small = img.convert('RGBA').resize((64, 64))
    counts = Counter()
    for r, g, b, a in small.getdata():
        if a < 128:
            continue
        mx, mn = max(r, g, b), min(r, g, b)
        if mx > 235 and mn > 235:  # white
            continue
        if mx - mn < 30:  # gray / black
            continue
        counts[(r // 24 * 24, g // 24 * 24, b // 24 * 24)] += 1
    if not counts:
        return '#7a6a4f'
    r, g, b = counts.most_common(1)[0][0]
    return '#%02x%02x%02x' % (r, g, b)


results = []
n = 0
for row in ws.iter_rows(min_row=3, values_only=True):
    name = row[3]
    if not name:
        continue
    n += 1
    slug = f'b2b-{n:02d}'
    entry = {
        'slug': slug,
        'businessName': str(name).strip(),
        'giftName': (row[10] or '').strip(),
        'giftDescription': (row[12] or '').strip(),
        'giftUrl': (row[11] or '').strip(),
        'status': (row[16] or '').strip(),
    }
    sources = [f'https://drive.google.com/uc?export=download&id={i}' for i in drive_ids(row[8])]
    if row[7] and str(row[7]).startswith('http'):
        sources.append(str(row[7]).strip())
    entry['logo'] = None
    for src in sources:
        try:
            data, ctype = fetch(src)
        except Exception as e:  # noqa: BLE001
            entry.setdefault('errors', []).append(f'{src[:60]}: {e}')
            continue
        open(f'{download_dir}/{slug}.raw', 'wb').write(data)
        if data[:5] == b'<?xml' or b'<svg' in data[:400]:
            # SVG נשמר כמו שהוא (מוצג דרך <img>, שבו סקריפטים לא רצים)
            open(f'{out_dir}/{slug}.svg', 'wb').write(data)
            entry['logo'] = f'{slug}.svg'
            entry['color'] = '#7a6a4f'
            break
        try:
            img = Image.open(io.BytesIO(data))
            img.load()
        except Exception as e:  # noqa: BLE001
            entry.setdefault('errors', []).append(f'{src[:60]}: not an image ({ctype}, {len(data)} bytes)')
            continue
        img = img.convert('RGBA')
        img.thumbnail((320, 320))
        img.save(f'{out_dir}/{slug}.png', optimize=True)
        entry['logo'] = f'{slug}.png'
        entry['color'] = brand_color(img)
        entry['size'] = img.size
        break
    results.append(entry)
    print(slug, entry['businessName'][:30], '->', entry['logo'], entry.get('color'), entry.get('errors', ''))

json.dump(results, open(out_json, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
