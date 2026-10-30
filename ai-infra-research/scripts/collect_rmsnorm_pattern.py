"""Package the reviewed RMSNorm interaction without local runtime dependencies."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[1]
def collect():
 source=ROOT/'prototypes/rmsnorm-performance-investigation'
 target=ROOT/'patterns/rmsnorm-residency-reuse';target.mkdir(parents=True,exist_ok=True)
 for name in ['index.html','provenance.json']:
  shutil.copyfile(source/name,target/name)
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 independent=ROOT/'prototypes/fused-add-rmsnorm-independent'
 for src,dst in [('index.html','fused-add.html'),('provenance.json','fused-add-provenance.json')]:
  shutil.copyfile(independent/src,target/dst)
 cover=ROOT/'web/media/rmsnorm-residency-reuse-cover.png'
 manifest={'authoritativeSource':'prototypes/rmsnorm-performance-investigation/index.html','sourceSha256':sha(source/'index.html'),'files':{n:sha(target/n) for n in ['index.html','provenance.json','fused-add.html','fused-add-provenance.json']},'groupEntries':[{'path':'index.html','source':str(source.relative_to(ROOT))},{'path':'fused-add.html','source':str(independent.relative_to(ROOT))}],'cover':str(cover.relative_to(ROOT)),'coverSha256':sha(cover),'coverMethod':'user supplied screenshot, 2026-10-30 11:15:23','refresh':'python3 scripts/build.py','validation':'standalone package; offline model/source checks, browser interaction reviewed; device prediction accuracy not established'}
 (target/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 (target/'README.md').write_text('# RMSNorm · 驻留与重读\n\nSource: `prototypes/rmsnorm-performance-investigation/`. Build the prototype after editing, then run `python3 scripts/build.py` to refresh this package. Cover is the user supplied screenshot. The same Library card links to `fused-add.html`, packaged from `prototypes/fused-add-rmsnorm-independent/`; build that prototype before refreshing this package.\n')
if __name__=='__main__':collect()
