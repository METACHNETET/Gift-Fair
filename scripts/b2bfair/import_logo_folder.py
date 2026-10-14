"""Import B2B fair logos from a local folder (e.g. a Google Drive download).

Usage: python import_logo_folder.py <logos_dir> <businesses.json> <source_copy_dir> <out_dir>

- Fixes zip-mangled Hebrew file names (extracted as cp862) and copies the
  originals, with readable names, to <source_copy_dir>.
- For each business in LOGO_FILES: trims empty margins, shrinks, saves
  <slug>.png to <out_dir>, and records the logo + brand color in businesses.json.
"""
import json
import os
import shutil
import sys
from collections import Counter

from PIL import Image, ImageChops

# שם העסק כפי שמופיע בגיליון (תחילת השם) -> שם הקובץ בתיקיית הלוגואים
LOGO_FILES = {
    'גייט': 'גייט - השער להצלחה.jpg',
    'מודל': 'מודל - הטמעת מערכות חכמות.jpg',
    # הועלה מהחשבון של משרד ריקי גוטמן, אבל זה הלוגו של CONTENTUM
    'Contentum': 'לוגו 2 (1) - משרד ריקי גוטמן (1).png',
    'מירירוט': 'מירי רוט.jpg',
    'פרסום מרקר': 'marker-img-5c444c79.png',
    'חוי פישר': 'חוי פישר.png',
    # גרסה 1 לבנה (לרקע כהה) — לא נראית על התגית הלבנה
    'זילבר': 'זילבר - ייעוץ והדרכה 2.png',
    'חנה שטמר': 'חנה שטמר.png',
    'עטרה רזניק': 'עטרה רזניק.png',
    'Aim': 'Aim - אוטומציה ופתרונות AI.png',
    'דבורה קיסטר': 'דבורה קיסטר.jpg',
    'רבקי אנגל': 'רבקי אנגל.jpg',
    'יוכבד הכהן לוין': 'יוכבד הכהן לוין.jpg',
    "חני דז'דק": 'חני דזדק.png',
    'שרי קטן': 'שרי קטן.jpg',
    'CH': 'CH - חני הורוביץ.png',
    'גילי אבלס': 'גילי אבלס.jpg',
    'שרלין': 'שרלין שיווק ופרסום.png',
    'איטי ולס': 'איטי ולס.png',
}

logos_dir, businesses_json, source_copy_dir, out_dir = sys.argv[1:5]


def readable(name):
    try:
        return name.encode('cp862').decode('utf8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        return name


def trim(img):
    """Crop transparent / near-white margins around the logo."""
    rgba = img.convert('RGBA')
    bg = Image.new('RGBA', rgba.size, (255, 255, 255, 255))
    flat = Image.alpha_composite(bg, rgba).convert('RGB')
    diff = ImageChops.difference(flat, Image.new('RGB', flat.size, (255, 255, 255)))
    bbox = diff.point(lambda v: 255 if v > 18 else 0).getbbox()
    return rgba.crop(bbox) if bbox else rgba


def brand_color(img):
    counts = Counter()
    for r, g, b, a in img.convert('RGBA').resize((64, 64)).getdata():
        if a < 128:
            continue
        mx, mn = max(r, g, b), min(r, g, b)
        if mx - mn < 40 or (mx > 235 and mn > 235):
            continue
        counts[(r // 24 * 24, g // 24 * 24, b // 24 * 24)] += 1
    if not counts:
        return None
    r, g, b = counts.most_common(1)[0][0]
    return '#%02x%02x%02x' % (r, g, b)


os.makedirs(source_copy_dir, exist_ok=True)
os.makedirs(out_dir, exist_ok=True)
files = {}
for f in os.listdir(logos_dir):
    fixed = readable(f)
    files[fixed] = os.path.join(logos_dir, f)
    shutil.copy(files[fixed], os.path.join(source_copy_dir, fixed))

items = json.load(open(businesses_json, encoding='utf8'))
used = set()
for it in items:
    match = next((k for k in LOGO_FILES if it['businessName'].startswith(k)), None)
    if not match:
        print('no logo file for', it['businessName'], '(keeping', it.get('logo'), ')')
        continue
    fname = LOGO_FILES[match]
    used.add(fname)
    img = trim(Image.open(files[fname]))
    img.thumbnail((360, 200))
    out = f"{it['slug']}.png"
    img.save(os.path.join(out_dir, out), optimize=True)
    for stale in (f"{it['slug']}.svg",):
        if os.path.exists(os.path.join(out_dir, stale)):
            os.remove(os.path.join(out_dir, stale))
    it['logo'] = out
    it['color'] = brand_color(img) or it.get('color')
    print(it['slug'], it['businessName'][:28], '<-', fname, img.size, it['color'])

json.dump(items, open(businesses_json, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
print('unused logo files (business not in the list yet):', sorted(set(files) - used))
