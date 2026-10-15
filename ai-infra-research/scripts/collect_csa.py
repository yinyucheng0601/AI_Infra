"""Build CSA from its sole source checkout and collect deployable artifacts."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
REL = 'patterns/csa-pass-field'
RUN = '_jit_l3_decode_csa_20260903_010617'


def digest(value):
    return hashlib.sha256(value).hexdigest()


def source_path():
    # Local build configuration only; never embed this path in a published page.
    return Path(os.environ.get('CSA_SOURCE_ROOT', ROOT.parent.parent / 'PyPTO3-main' / 'Design/csa-pass-field')).resolve()


def fingerprint(source):
    repo = source.parents[1]
    files = []
    for folder in ('src', 'scripts'):
        files.extend(p for p in (source / folder).rglob('*') if p.is_file())
    files.extend(source / name for name in ('index.html', 'package.json', 'package-lock.json', 'vite.config.mjs'))
    architecture = repo / 'Design/architecture/deepseek_v4_flash_csa'
    files.extend(architecture / name for name in ('implementation-programs.js', 'mapping-registry.js', 'json-architecture.js', 'json-architecture.json'))
    run = repo / 'Data/DeepseekV4' / RUN
    files.extend((run / 'passes_dump').glob('*.py'))
    files.extend(run / 'next_levels/decode_csa_test/ptoas' / name for name in ('qk_pv.pto', 'qk_pv.cpp'))
    for rank in ('rank0', 'rank1'):
        files.append(run / f'dfx_outputs/{rank}/d0/chip_swimlane_records.json')
    rank0 = run / 'dfx_outputs/rank0/d0'
    files.extend(rank0 / name for name in ('deps.json', 'dispatch_program.json', 'name_map.json'))
    files.extend(rank0.glob('merged_swimlane*.json'))
    if not source.is_dir() or not (run / 'passes_dump').is_dir():
        raise RuntimeError('CSA source/run missing. Place PyPTO3-main beside AI_Infra or set CSA_SOURCE_ROOT.')
    hashes = {p.relative_to(repo).as_posix(): digest(p.read_bytes()) for p in sorted(set(files))}
    return digest(json.dumps(hashes, sort_keys=True).encode())


def verify_manifest(source, manifest, html):
    if manifest.get('sourceFingerprint') != fingerprint(source):
        raise RuntimeError('CSA source changed; rebuild and commit AI_Infra generated artifacts before pushing.')
    if manifest.get('htmlSha256') != digest(html):
        raise RuntimeError('CSA collected HTML differs from its manifest; rebuild required.')


def collect(root=ROOT, source=None, force=False, check=False, revision=None):
    root = Path(root)
    source = Path(source or source_path())
    target = root / REL
    if revision:
        def committed(name):
            return subprocess.check_output(['rtk', 'proxy', 'git', 'show', f'{revision}:ai-infra-research/{REL}/{name}'], cwd=root.parent)
        verify_manifest(source, json.loads(committed('artifact-manifest.json')), committed('index.html'))
        return False
    manifest_file = target / 'artifact-manifest.json'
    if manifest_file.is_file() and (target / 'index.html').is_file():
        try:
            verify_manifest(source, json.loads(manifest_file.read_text()), (target / 'index.html').read_bytes())
            if not force:
                print('CSA collection is current')
                return False
        except RuntimeError:
            if check:
                raise
    elif check:
        raise RuntimeError('CSA collection manifest missing; run the gallery build first.')
    if check:
        return False
    before = fingerprint(source)
    subprocess.run(['rtk', 'npm', 'run', 'build'], cwd=source, check=True)
    if fingerprint(source) != before:
        raise RuntimeError('CSA source changed during build; retry after edits finish.')
    html = (source / 'dist/index.html').read_bytes()
    manifest = json.loads((source / 'dist/artifact-manifest.json').read_text())
    if manifest['htmlSha256'] != digest(html):
        raise RuntimeError('CSA build HTML hash mismatch')
    manifest.update({
        'sourceRepository': 'PyPTO3-main',
        'sourcePath': 'Design/csa-pass-field',
        'sourceFingerprint': before,
        'collectionPolicy': 'generated-only; edit the source checkout and rebuild',
    })
    target.mkdir(parents=True, exist_ok=True)
    (target / 'index.html').write_bytes(html)
    manifest_file.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    catalog = root / 'catalog/assets.json'
    data = json.loads(catalog.read_text())
    asset = next(a for a in data['assets'] if a['id'] == 'csa-pass-field')
    # The gallery's sources[0] is an openable artifact, not a source checkout.
    # Keep that URL stable; record the sole build source separately.
    asset['sources'] = [{
        'repository': 'ai-infra', 'path': 'ai-infra-research/patterns/csa-pass-field/index.html',
        'url': None, 'revision': None, 'sha256': digest(html),
    }]
    asset['buildSource'] = {
        'repository': 'PyPTO3-main', 'path': 'Design/csa-pass-field',
        'fingerprint': before, 'policy': 'sole-source; generated collection artifact',
    }
    asset['validation'] = [
        '2026-10-15：PyPTO3-main/Design/csa-pass-field 为唯一源码；由 AI_Infra 构建自动收录独立 HTML。来源和产物哈希见同目录 artifact-manifest.json。',
        'M1 已接入 Rank 0 执行证据；双 rank 计算图仍为静态 Mock。开发入口完成部分交互烟测，独立构建产物浏览器验收尚未完成。',
    ]
    catalog.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print('Collected CSA from PyPTO3-main (generated HTML + provenance; no source copy)')
    return True


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--revision', help='verify the committed artifacts, e.g. HEAD')
    args = parser.parse_args()
    try:
        collect(force=args.force, check=args.check, revision=args.revision)
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'CSA collection failed: {error}\n')
