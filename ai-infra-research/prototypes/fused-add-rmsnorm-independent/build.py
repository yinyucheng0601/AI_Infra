from pathlib import Path
import re,json,hashlib
from model import generate
P=Path(__file__).resolve().parent
old=(P.parent/'rmsnorm-performance-investigation/index.html').read_text()
# Reuse the delivered Pattern renderers, including approved local visual adapters.
scripts=re.findall(r'<script>(.*?)</script>',old,re.S)
shared='\n'.join(scripts[:3]).replace("/gamma|gQ/.test(tensor.buffer)","/weight|gamma|gQ/.test(tensor.buffer)")
shared=shared.replace('最大持有 ${fmtKB(peak)}','区间峰值 ${fmtKB(peak)}')
css=re.search(r'<style>(.*?)</style>',old,re.S).group(1)
# Keep only shared memory styles; avoid importing old application layout selectors.
ds=Path('/Users/yin/pto-design-system')
base='\n'.join((ds/name).read_text() for name in ['tokens/foundation.css','tokens/semantic.css','tokens/components.css','patterns/aic-core-object/pattern.css','patterns/aiv-core-object/pattern.css','patterns/memory-architecture/pattern.css','patterns/memory-reuse-viewer/pattern.css'])
glass=P.parents[1]/'methods/design-spatial-systems-ui/assets/liquid-glass-controls'
data=generate();(P/'model.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
s=(P/'page.html').read_text().replace('/* SHARED_CSS */',base).replace('/* SHARED_JS */',shared).replace('/* DATA */',json.dumps(data,ensure_ascii=False).replace('</script','<\\/script')).replace('/* APP */',(P/'app.js').read_text()).replace('/* LIQUID_CSS */',(glass/'liquid-glass.css').read_text()).replace('/* LIQUID_JS */',(glass/'liquid-glass.js').read_text())
(P/'index.html').write_text(s)
(P/'provenance.json').write_text(json.dumps({'revision':data['revision'],'sources':{k:{'path':v['path'],'blob':v['blob']} for k,v in data['sources'].items()},'reuse':{'source':'../rmsnorm-performance-investigation/index.html','sha256':hashlib.sha256(old.encode()).hexdigest(),'parts':['PtoSwimlaneTaskPattern','GridTensor','PtoMemoryReuseViewer','LiquidGlassControls control/icon/panel'],'layout':'source-order lanes with right-side lifecycle drawer restored; source intervals and logical offsets only; no mock UB addresses'},'hardware':{'preset':'ascend910b','source':'https://asc.gitcode.com/guide/programming_guide/advanced_programming/hardware_implementation/architecture_spec/npu_arch_2201.html','ub_bytes':196608,'core_count':'analysis parameter, not device detection'},'adapter':'model.py - manually grounded fixed-version adapter','performance_engine':'not invoked: 910B does not match calibrated 950 engine','device_validation':False},indent=2))
print('Built',P/'index.html')
