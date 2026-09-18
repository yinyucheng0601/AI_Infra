"""Validate the manually curated catalog using only the Python standard library."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def validate(data):
    assert data.get('version') == 1, 'unsupported catalog version'
    assets = data.get('assets')
    assert isinstance(assets, list), 'assets must be an array'
    ids = set()
    for a in assets:
        for key in ('id', 'title', 'summary', 'content'):
            assert isinstance(a.get(key), str) and a[key].strip(), f'missing {key}'
        assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', a['id']), 'invalid id'
        assert a['id'] not in ids, f"duplicate id: {a['id']}"
        ids.add(a['id'])
        assert a.get('type') in ('knowledge', 'case', 'pattern', 'method'), 'invalid type'
        assert isinstance(a.get('topics'), list) and a['topics'], 'topics required'
        assert len(a['topics']) == len(set(a['topics'])), 'duplicate topics'
        assert all(t in ('ecosystem', 'operators', 'training', 'inference', 'competitive', 'experience', 'visual') for t in a['topics']), 'invalid topic'
        for key in ('form', 'designValue', 'reviewedAt', 'author'):
            assert isinstance(a.get(key), str) and a[key].strip(), f'missing {key}'
        assert a.get('status') in ('draft', 'reviewed', 'validated', 'archived'), 'invalid status'
        assert a.get('visibility') in ('internal', 'public'), 'invalid visibility'
        for key in ('domains', 'media', 'validation', 'related', 'outline'):
            assert isinstance(a.get(key), list), f'{key} must be an array'
            assert all(isinstance(v, str) and v.strip() for v in a[key]), f'invalid {key}'
        p = Path(a['content'])
        assert not p.is_absolute() and '..' not in p.parts, 'content must be repository-relative'
        target = (ROOT / p).resolve()
        assert target.is_relative_to(ROOT) and target.is_file(), 'content file missing or outside repository'
        assert not any(s.startswith('.local') for s in p.parts), 'local-only content forbidden'
        assert isinstance(a.get('sources'), list) and a['sources'], 'sources required'
        for source in a['sources']:
            for key in ('repository', 'path'):
                assert isinstance(source.get(key), str) and source[key].strip(), f'source {key} required'
            sp = Path(source['path'])
            assert not sp.is_absolute() and '..' not in sp.parts, 'source path must be relative'
            assert not any(p.startswith('.') for p in sp.parts), 'hidden source forbidden'
            assert 'model_skill-dss3.2new' not in sp.parts, 'excluded from this knowledge collection'
            assert re.fullmatch(r'[a-f0-9]{64}', source.get('sha256', '')), 'source SHA256 required'
            for key in ('url', 'revision'):
                assert key in source and (source[key] is None or isinstance(source[key], str)), f'invalid source {key}'
        if a['status'] == 'validated':
            assert a['validation'], 'validated requires evidence'
        if a['visibility'] == 'public':
            assert isinstance(a.get('publicationReview'), str) and a['publicationReview'].strip(), 'public requires review'
    for a in assets:
        assert all(i in ids and i != a['id'] for i in a['related']), 'unknown or self-related id'
    return len(assets)


if __name__ == '__main__':
    count = validate(json.loads((ROOT / 'catalog/assets.json').read_text()))
    print(f'Catalog OK: {count} curated assets')
