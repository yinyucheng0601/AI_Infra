from pathlib import Path
import re, json, hashlib
ROOT = Path(__file__).resolve().parent
cases = []
for tag in ['HD496_CORRECT', 'HD512_WRONG']:
    report = ROOT/'sources'/f'{tag}_memory_report.txt'
    pto = ROOT/'sources'/f'{tag}_merge_rope_pack.pto'
    constants, declarations = {}, {}
    lines = pto.read_text().splitlines()
    for n, line in enumerate(lines, 1):
        m = re.search(r'(%\w+) = arith.constant (\d+) : i64', line)
        if m: constants[m[1]] = (int(m[2]), n, line)
    for n, line in enumerate(lines, 1):
        m = re.search(r'pto.alloc_tile addr = (%\w+)', line)
        if m:
            addr, cn, cl = constants[m[1]]
            declarations.setdefault(addr, []).append(dict(line=n, text=line, constantLine=cn, constant=cl))
    rows = []
    for n, line in enumerate(report.read_text().splitlines(), 1):
        m = re.search(r'(mem_vec_\d+)\s*\|\s*(.*?)\s*\|\s*\[(\d+),\s*(\d+)\)\s*\|\s*\[(\d+),\s*(\d+)\]', line)
        if m:
            name, size, a, b, s, e = m.groups()
            a, b = int(a), int(b)
            rows.append(dict(name=name, sizeLabel=size, start=a, end=b, bytes=b-a, live=[int(s),int(e)], line=n, raw=line, pto=declarations[a]))
    assert len(rows) == 77 and len(declarations) == 77 and sum(map(len, declarations.values())) == 317
    assert {r['start'] for r in rows} == set(declarations)
    assert all(a['end'] == b['start'] for a,b in zip(rows, rows[1:]))
    cases.append(dict(label=tag[:5], report=report.name, pto=pto.name, rows=rows, extent=rows[-1]['end'], memrefs=81))
a,b = cases
pairs, shift = [], 0
for x,y in zip(a['rows'],b['rows']):
    assert x['name'] == y['name'] and x['live'] == y['live']
    delta = y['bytes']-x['bytes']
    assert y['start']-x['start'] == shift
    pairs.append(dict(name=x['name'], a=x, b=y, delta=delta, shift=shift))
    shift += delta
assert shift == 5632 and sum(p['delta'] != 0 for p in pairs) == 12
model = dict(cases=cases, pairs=pairs, revision='b59bfcf5ed6cc0bdef67d00c24e6f9e846383590', source='https://gist.github.com/Hzfengsy/8f655587af225f73665a1e9a3112441a', hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'sources').iterdir()})
(ROOT/'model.json').write_text(json.dumps(model, ensure_ascii=False, indent=2))
(ROOT/'index.html').write_text((ROOT/'page.html').read_text().replace('<link rel="stylesheet" href="memory-reuse.css">','<style>'+(ROOT/'memory-reuse.css').read_text()+'</style>').replace('<script src="memory-reuse.js"></script>','<script>'+(ROOT/'memory-reuse.js').read_text()+'</script>').replace('__DATA__',json.dumps(model,ensure_ascii=False).replace('</','<\\/')))
print('Verified 77 matched allocations, 634 PTO declarations, 12 growth buffers, +5632 B; every start shift equals preceding growth sum.')
