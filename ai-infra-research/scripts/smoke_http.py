"""HTTP-only smoke check: source entries, Markdown views and allowlisted dependencies."""
import argparse
import json
from urllib.parse import quote
from urllib.request import urlopen
from serve import Preview, ROOT

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default='http://127.0.0.1:8766')
    args = parser.parse_args()
    preview = Preview(json.loads((ROOT / '.local/sources.json').read_text()))
    paths = ['/', '/api/health'] + sorted(preview.files)
    paths += ['/read/' + a['id'] for a in preview.assets if a['sources'][0]['path'].endswith('.md')]
    failures = []
    for path in paths:
        try:
            with urlopen(args.base.rstrip('/') + quote(path, safe='/'), timeout=8) as response:
                if response.status != 200 or not response.read():
                    failures.append(path)
        except Exception as error:
            failures.append(f'{path}: {error}')
    print(json.dumps({'checked': len(paths), 'failed': failures}, ensure_ascii=False, indent=2))
    raise SystemExit(bool(failures))
