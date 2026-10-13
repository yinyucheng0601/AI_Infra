from pathlib import Path
import hashlib, json, xml.etree.ElementTree as ET
root = Path(__file__).resolve().parents[1]
base = root / 'assets/approved-glyphs'
data = json.loads((base / 'manifest.json').read_text())
assert len({x['id'] for x in data['items']}) == len(data['items'])
for item in data['items']:
    raw = (base / item['file']).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == item['sha256'], item['id']
    ET.fromstring(raw)
assert hashlib.sha256((root / 'assets/approved-legend-library.html').read_bytes()).hexdigest() == data['sourceSha256']
print(f"Approved glyph baseline OK: {len(data['items'])} SVGs")
