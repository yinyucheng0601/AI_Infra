"""Build offline HTML; no remote dependencies or catalog mutations."""
from pathlib import Path
import json
import hashlib
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_shared'))
from demo_ui import enhance
ROOT = Path(__file__).resolve().parent
page = (ROOT / 'page.html').read_text()
assets = ROOT.parents[1] / 'reports/llm-compute'
tensor_path = assets / 'training-parallel-communication-v1.html'
op_path = assets / 'diagram-legend-library/build.cjs'
icons_path = assets / 'diagram-legend-library/op-icons.js'
tensor_lines = tensor_path.read_text().splitlines()
op_lines = op_path.read_text().splitlines()
functions = [next(line for line in tensor_lines if line.startswith('function '+name+'(')) for name in ['dataTiles', 'tensorNode']]
functions += [next(line for line in op_lines if line.startswith('const '+name+'=')) for name in ['opGlyph', 'opNode']]
adapter = icons_path.read_text() + """\nconst ScopeGlyphs=(()=>{const B='#B1EF6B';const txt=(x,y,t,cls,anchor,color)=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}" style="fill:${color}">${esc(t)}</text>`;const hit=(key,body)=>body;\n""" + '\n'.join(functions) + "\nreturn {tensor:tensorNode,op:(id,x,y,label)=>{const i=window.PtoOpIcons.find(i=>i.id===id);if(!i)throw Error('Unknown OP category: '+id);return opNode({...i,name:label},x,y)}}})();"
page = page.replace('/* GLYPHS_INLINE */', adapter)
fingerprints = {str(f.relative_to(ROOT.parents[2])): hashlib.sha256(f.read_bytes()).hexdigest() for f in [tensor_path,op_path,icons_path]}
contract = json.loads((ROOT / 'visual-contract.json').read_text())
if fingerprints != contract['assets']:
    raise SystemExit('Glyph source changed: review the approved variants before updating visual-contract.json')
(ROOT / 'glyph-provenance.json').write_text(json.dumps(fingerprints,indent=2)+'\n')
model = (ROOT / 'model.js').read_text()
sources = json.loads((ROOT / 'sources.json').read_text())
page = page.replace('/* MODEL_INLINE */', model).replace('/* SOURCES_INLINE */', json.dumps(sources, ensure_ascii=False).replace('</', '<\\/'))
page = page.replace('/* GLASS_CSS_INLINE */', (ROOT / 'liquid-glass.css').read_text()).replace('/* GLASS_JS_INLINE */', (ROOT / 'liquid-glass.js').read_text())
page=enhance(page,'case5')
(ROOT / 'index.html').write_text(page)
print('Built index.html:', len(page.encode()), 'bytes')
