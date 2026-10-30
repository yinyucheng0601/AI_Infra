from pathlib import Path
import json
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_shared'))
from demo_ui import enhance
R=Path(__file__).resolve().parent
B=R.parents[1]
t=(R/'page.html').read_text()
g=B/'methods/design-spatial-systems-ui/assets/liquid-glass-controls'
t=t.replace('/*__GLASS_CSS__*/','/*'+(g/'LICENSE').read_text()+'*/'+(g/'liquid-glass.css').read_text()).replace('/*__GLASS_JS__*/',(g/'liquid-glass.js').read_text())
t=t.replace('/*__GLYPHS__*/',(B/'reports/llm-compute/diagram-legend-library/visual-system.js').read_text()).replace('/*__MODEL__*/',(R/'model.js').read_text()).replace('/*__DATA__*/','const DATA='+json.dumps(json.loads((R/'evidence.json').read_text()),ensure_ascii=False).replace('</','<\\/')+';').replace('__INITIAL__','unpack')
t=enhance(t,'unpack-case3')
(R/'index.html').write_text(t)
print('Built offline case3 index.html')
