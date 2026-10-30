from pathlib import Path
import json
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_shared'))
from demo_ui import enhance
P=Path(__file__).resolve().parent
s=(P/'page.html').read_text()
for key,file in [('MODEL','model.js'),('GLYPHS','visual-system.js'),('GLASS_CSS','liquid-glass.css'),('GLASS_JS','liquid-glass.js')]:
 s=s.replace('/* '+key+' */',(P/file).read_text())
s=s.replace('/* SOURCE */',json.dumps((P/'sources/test_op.py').read_text(),ensure_ascii=False))
s=enhance(s,'scale')
(P/'index.html').write_text(s)
print('Built standalone index.html')
