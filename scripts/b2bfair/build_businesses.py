"""Build businesses.js for the B2B game from businesses.json + downloaded logos."""
import json, shutil, sys, os
# מושבת: businesses.js נערך עכשיו ידנית והוא המקור הקובע — הרצה מהגיליון תמחק את התיקונים
sys.exit('build_businesses.py מושבת — יש לערוך ידנית את src/games/b2bfair/platformer/businesses.js')
src_json, logo_dir, public_dir, out_js = sys.argv[1:5]
items = json.load(open(src_json, encoding='utf8'))
os.makedirs(public_dir, exist_ok=True)
palette = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#65a30d']
lines = []
for i, it in enumerate(items):
    logo = None
    if it.get('logo'):
        shutil.copy(os.path.join(logo_dir, it['logo']), os.path.join(public_dir, it['logo']))
        logo = f"/b2bfair/logos/{it['logo']}"
    color = it.get('color') or palette[i % len(palette)]
    if color == '#7a6a4f':
        color = palette[i % len(palette)]
    obj = {
        'id': it['slug'],
        'businessName': it['businessName'],
        'giftName': it['giftName'],
        'giftDescription': it['giftDescription'],
        'giftUrl': it['giftUrl'],
        'logoUrl': logo,
        'color': color,
    }
    lines.append('  ' + json.dumps(obj, ensure_ascii=False) + ',')
header = """// נוצר אוטומטית מתוך גיליון "תגובות מהעסקים ביריד" (לשונית "שליחה לנטפרי").
// לא לערוך ידנית — לעדכון: scripts/b2bfair/fetch_logos.py ואז build_businesses.py
// הלוגואים נמצאים ב-public/b2bfair/logos. עסק בלי לוגו מוצג כעיגול צבעוני עם ראשי תיבות.
export const BUSINESSES = [
"""
open(out_js, 'w', encoding='utf8').write(header + '\n'.join(lines) + '\n]\n')
print(len(items), 'businesses;', sum(1 for it in items if it.get('logo')), 'with logos')
