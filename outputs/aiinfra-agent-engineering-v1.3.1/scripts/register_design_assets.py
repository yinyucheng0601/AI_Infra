"""Register catalog assets as references and fingerprints without exporting source files."""
import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CATALOG = 'ai-infra-research/catalog/assets.json'


def digest(file):
    return sha256(file.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repository', type=Path, required=True, help='Trusted AI_Infra checkout')
    parser.add_argument('--sources', type=Path, help='Explicit .local/sources.json mapping')
    parser.add_argument('--asset', action='append', help='Catalog ID, repeatable. Default: all.')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--strict', action='store_true', help='Exit nonzero for static verification gaps')
    args = parser.parse_args()
    repo = args.repository.resolve()
    sys.path.insert(0, str(ROOT))
    from adapters.library_dependencies import collect_files, safe_file

    library = repo / 'ai-infra-research'
    config = json.loads(args.sources.read_text()) if args.sources else {}
    roots = {**config.get('repositories', {}), 'ai-infra': repo}
    exclusions = tuple(path.casefold() for path in json.loads(
        (ROOT / 'config/repository-lock.json').read_text())['scope']['exclude'])

    def excluded(path):
        return any(f'/{item}/' in f'/{str(path).casefold()}/' for item in exclusions)

    catalog = repo / CATALOG
    catalog_bytes = catalog.read_bytes()
    catalog_data = json.loads(catalog_bytes)
    assets = catalog_data['assets']
    ids = {asset['id'] for asset in assets}
    if len(ids) != len(assets):
        parser.error('duplicate catalog IDs')
    unknown = set(args.asset or []) - ids
    if unknown:
        parser.error(f'unknown catalog IDs: {sorted(unknown)}')

    def closure(base, entries):
        files, missing, external = collect_files(base, entries, exclude=excluded, browser_resolution=True)
        blocked = [path for path in missing if excluded(Path(base) / path)]
        dependencies = {path: digest(file) for path, file in sorted(files.items())}
        return {'sha256': dependencies, 'missing': sorted(set(missing) - set(blocked)),
                'external': external, 'excluded': blocked}

    records = []
    for asset in assets:
        if args.asset and asset['id'] not in args.asset:
            continue
        sources = []
        for item in asset['sources']:
            name, path = item['repository'], item['path']
            base = roots.get(name)
            file = safe_file(base, path) if base else None
            actual = None
            if excluded(name) or excluded(path) or (base and excluded(Path(base).resolve())) or (file and excluded(file)):
                status = 'excluded-by-source-lock'
            elif not base:
                status = 'repository-unmapped'
            elif not file:
                status = 'source-unreadable'
            else:
                actual = digest(file)
                status = 'hash-match' if actual == item['sha256'] else 'hash-mismatch'
            sources.append({**item, 'actualSha256': actual, 'status': status,
                            'dependencies': closure(base, [path]) if actual else None})

        entries = list(dict.fromkeys(filter(None, [
            asset['content'], *(entry['content'] for entry in asset.get('entries', [])),
            asset.get('readmePath'),
        ])))
        contracts = {}
        contract_entries = set()
        resources = asset.get('integrationResources', {})
        for entry in entries:
            reference = (Path(entry).parent / 'pattern.json').as_posix()
            file = safe_file(library, reference)
            if file and not excluded(file) and reference not in contracts:
                contract = json.loads(file.read_text())
                contracts[reference] = {key: contract[key] for key in (
                    'id', 'api', 'globalApi', 'requiredApis', 'allowedOverrides',
                    'forbiddenOverrides', 'limitations',
                ) if key in contract}
                contracts[reference]['sha256'] = digest(file)
                for resource in (contract.get('embed'), contract.get('renderer'), contract.get('data'),
                                 contract.get('provenance'), *contract.get('styles', []),
                                 *contract.get('dependencies', []), contract.get('workbench', {}).get('entry')):
                    if resource:
                        contract_entries.add((Path(reference).parent / resource).as_posix())
        dependencies = closure(library, [*entries, *contracts, *sorted(contract_entries),
                                         *(path for paths in resources.values() for path in paths)])
        records.append({
            'id': asset['id'], 'type': asset['type'], 'visibility': asset['visibility'],
            'entrypoints': entries, 'variants': asset.get('entries', []),
            'related': asset['related'], 'skillRole': asset.get('skillRole'), 'catalogValidation': asset['validation'],
            'sources': sources, 'libraryDependencies': dependencies,
            'integrationResources': resources, 'interactionContracts': contracts, 'browserValidation': 'not-run',
        })

    def has_gaps(record):
        closures = [record['libraryDependencies']] + [
            source['dependencies'] for source in record['sources'] if source['dependencies']]
        return (any(source['status'] != 'hash-match' for source in record['sources'])
                or any(item[key] for item in closures for key in ('missing', 'external', 'excluded')))

    revision = subprocess.run(['rtk', 'git', '-C', str(repo), 'rev-parse', 'HEAD'],
                              capture_output=True, text=True, check=True).stdout.strip()
    result = {
        'schemaVersion': 1, 'catalog': {'path': CATALOG, 'sha256': sha256(catalog_bytes).hexdigest(),
                                         'version': catalog_data['version']},
        'checkoutHead': revision, 'bytesFrom': 'working-tree',
        'dependencyCoverage': 'static-literal-references',
        'summary': {'assets': len(records),
                    'sourceStatus': dict(Counter(s['status'] for r in records for s in r['sources'])),
                    'assetsWithStaticGaps': [record['id'] for record in records if has_gaps(record)]},
        'assets': records,
    }
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result['summary'], ensure_ascii=False))
    return int(args.strict and bool(result['summary']['assetsWithStaticGaps']))


if __name__ == '__main__':
    raise SystemExit(main())
