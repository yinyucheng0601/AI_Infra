from pathlib import Path
import hashlib, json

ROOT = Path(__file__).parent
OUT = ROOT.parent / 'llm-compute' / 'deepinfer-performance-atlas-v2.html'
shell = (ROOT / 'v2-shell.html').read_text()
content = (ROOT / 'v2-content.js').read_text()
visuals = (ROOT / 'v2-visuals.js').read_text()
html = shell.replace('__CONTENT__', content).replace('__VISUALS__', visuals)
assert '__CONTENT__' not in html and '__VISUALS__' not in html
OUT.write_text(html)
(ROOT / 'v2-manifest.json').write_text(json.dumps({'artifact':OUT.name,'sha256':hashlib.sha256(html.encode()).hexdigest(),'source_commit':'9bd9cf243fc53ef9afbf8f04d391d989117d6ab9','date':'2026-10-21','revision':'2.1','browser_validation':'blocked: file protocol rejected by browser URL policy','hardware_benchmarks':'not run'},indent=2))
print(f'Built {OUT.name}: {len(html.encode()):,} bytes')
