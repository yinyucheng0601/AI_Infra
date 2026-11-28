"""Build the standalone distribution from the maintained engineering files."""
from hashlib import sha256
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]


def main():
    manifest_path = ROOT / 'manifest.json'
    previous = json.loads(manifest_path.read_text())
    files = {item['path'] for item in previous['files']}
    files.update({
        'adapters/contract.py', 'adapters/pipeline.py', 'adapters/legacy_bridge.py',
        'scripts/inspect_source.py', 'schemas/adapter-result.schema.json',
        'tests/test_inspection.py', 'reports/baseline-audit.md',
        'reports/diff-v1.3.1-to-v1.4.2.md', 'reports/capability-assessment.md',
        'reports/real-data-coverage.md', 'reports/scope-gap-review.md', 'reports/browser-regression.json',
        'reports/regression-report.json', 'reports/regression-report.md', 'CHANGELOG.md',
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
            entry = ZipInfo(f'{package}/{name}', (1980, 1, 1, 0, 0, 0))
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, (ROOT / name).read_bytes(), compress_type=ZIP_DEFLATED)
    print(output)


if __name__ == '__main__':
    main()
