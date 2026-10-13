"""Refresh the rank demo's local dependency URLs and catalog fingerprint."""
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def refresh(root):
    root = Path(root)
    page = root / 'patterns/npu-memory-atlas/variants/index_comm.html'
    source = page.read_text(encoding='utf-8')

    def version(match):
        prefix, url, suffix = match.groups()
        parts = urlsplit(url)
        if parts.scheme or parts.netloc or not parts.path.endswith(('.js', '.css')):
            return match.group(0)
        asset = (page.parent / parts.path).resolve()
        if not asset.is_relative_to(root.resolve()):
            raise ValueError(f'Dependency outside site: {url}')
        digest = hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
        query = [(k, v) for k, v in parse_qsl(parts.query) if k != 'v']
        query.append(('v', digest))
        return prefix + urlunsplit(parts._replace(query=urlencode(query))) + suffix

    result = re.sub(r'(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"]+)(")', version, source)
    if result != source:
        page.write_text(result, encoding='utf-8')
    catalog = root / 'catalog/assets.json'
    data = json.loads(catalog.read_text(encoding='utf-8'))
    asset = next(a for a in data['assets'] if a['id'] == 'npu-memory-atlas-training')
    digest = hashlib.sha256(page.read_bytes()).hexdigest()
    if asset['sources'][0]['sha256'] != digest:
        asset['sources'][0]['sha256'] = digest
        catalog.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    refresh(Path(__file__).resolve().parents[1])
