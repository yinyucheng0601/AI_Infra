"""Build the standalone distribution from the maintained engineering and Library sources."""
from hashlib import sha256
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent.parent


def main():
    manifest_path = ROOT / 'manifest.json'
    previous = json.loads(manifest_path.read_text())
    files = {item['path'] for item in previous['files']}
    scanner = WORKSPACE / 'ai-infra-research/scripts/serve.py'
    source = scanner.read_text()
    snapshot = ROOT / 'adapters/library_dependencies.py'
    snapshot.write_text(
        '# Generated from ai-infra-research/scripts/serve.py by scripts/build_package.py.\n'
        f'# Source SHA256: {sha256(source.encode()).hexdigest()}\n'
        'from html.parser import HTMLParser\nfrom pathlib import Path\nimport re\n'
        'from urllib.parse import unquote, urlsplit\n\n'
        + source[source.index('STATIC_EXT ='):source.index('def inline(text):')].rstrip() + '\n'
    )
    files.update({
        'adapters/library_dependencies.py', 'scripts/build_package.py',
        'scripts/register_design_assets.py', 'tests/design_assets_browser.cjs',
        'tests/test_library_dependencies.py',
    })
    version = (ROOT / 'VERSION').read_text().strip()
    manifest = {**previous, 'version': version, 'files': []}
    for name in sorted(files):
        raw = (ROOT / name).read_bytes()
        manifest['files'].append({'path': name, 'sha256': sha256(raw).hexdigest(), 'bytes': len(raw)})
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    package = manifest['package']
    output = ROOT.parent / f'{package}-v{version}.zip'
    with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive:
        for name in sorted(files | {'manifest.json'}):
            archive.write(ROOT / name, f'{package}/{name}')
    print(output)


if __name__ == '__main__':
    main()
