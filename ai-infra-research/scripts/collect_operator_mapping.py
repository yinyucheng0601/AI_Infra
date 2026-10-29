"""Collect two self-contained mapping patterns from their authoritative prototypes."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'prototypes/compute-investigation-trial'
PATTERNS = {'unpack': 'unpack-layout-inspector', 'expand': 'expand-broadcast-inspector'}

def collect():
    subprocess.run(['node', str(SOURCE / 'verify-spatial.cjs'), '--export-covers'], check=True, capture_output=True)
    for key, ident in PATTERNS.items():
        source = SOURCE / (key + '.html')
        html = source.read_text()
        for peer, target in PATTERNS.items():
            html = html.replace('href="' + peer + '.html"', 'href="../' + target + '/index.html"')
        target = ROOT / 'patterns' / ident
        target.mkdir(parents=True, exist_ok=True)
        (target / 'index.html').write_text(html)
        cover = ROOT / 'web/media' / (key + '-mapping-inspector-cover.svg')
        manifest = {
            'authoritativeSource': str(source.relative_to(ROOT)),
            'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'outputSha256': hashlib.sha256((target / 'index.html').read_bytes()).hexdigest(),
            'cover': str(cover.relative_to(ROOT)),
            'coverSha256': hashlib.sha256(cover.read_bytes()).hexdigest(),
            'coverMethod': 'export of actual SVG scene from delivered application; not a browser screenshot',
            'refresh': 'python3 scripts/collect_operator_mapping.py',
            'validation': 'model and DOM-substitute behavior checks passed; no NPU/device run',
        }
        (target / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        (target / 'README.md').write_text(
            '# ' + ident + '\n\n生成文件，请修改 `'+manifest['authoritativeSource']+'` 的上游 `spatial.html`，'
            '先运行原型 build.py，再运行 `scripts/build.py` 收集。\n\n'
            '仅改写两个独立案例之间的相对链接；核心页面、数据、图元、控件均自包含。来源与产物指纹见 manifest.json。\n')
    catalog_path = ROOT / 'catalog/assets.json'
    catalog = json.loads(catalog_path.read_text())
    for asset in catalog['assets']:
        if asset['id'] in PATTERNS.values():
            for source in asset['sources']:
                if source['repository'] == 'ai-infra':
                    path = ROOT.parent / source['path']
                    source['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print('Collected Unpack / Expand mapping patterns and SVG covers')

if __name__ == '__main__':
    collect()
