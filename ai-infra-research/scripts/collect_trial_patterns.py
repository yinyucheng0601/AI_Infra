"""Collect the three independent Skill trial deliverables; source stays in prototypes."""
from pathlib import Path
import hashlib,json,shutil,subprocess
ROOT=Path(__file__).resolve().parents[1]
CASES={'unpack-case3-inspector':'unpack-case3','scale-broadcast-inspector':'scale-investigation-trial','rsfa-performance-comparison':'rsfa-performance-trial'}
RSFA_FILES=['app.js','model.js','style.css','system-controls.css','design-tokens.css','source/ablation_raw_data.json','source-manifest.json','liquid-glass-controls/liquid-glass.js','liquid-glass-controls/liquid-glass.css','liquid-glass-controls/LICENSE']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def collect():
 subprocess.run(['node',str(ROOT/'scripts/export_trial_covers.cjs')],check=True,capture_output=True)
 for ident,folder in CASES.items():
  source=ROOT/'prototypes'/folder;target=ROOT/'patterns'/ident;target.mkdir(parents=True,exist_ok=True)
  html=(source/'index.html').read_text().replace('href="unpack.html"','href="../unpack-layout-inspector/index.html"').replace('href="expand.html"','href="../expand-broadcast-inspector/index.html"')
  (target/'index.html').write_text(html)
  deps=RSFA_FILES if ident=='rsfa-performance-comparison' else []
  for file in deps:
   dest=target/file;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source/file,dest)
  cover=ROOT/'web/media'/f'{ident}-cover.svg'
  manifest={'authoritativeSource':str((source/'index.html').relative_to(ROOT)),'sourceSha256':sha(source/'index.html'),'outputSha256':sha(target/'index.html'),'files':{f:sha(target/f) for f in ['index.html']+deps},'cover':str(cover.relative_to(ROOT)),'coverSha256':sha(cover),'coverMethod':'application-generated SVG scene exported via DOM substitute; not browser screenshot','refresh':'python3 scripts/build.py','validation':'packaged dependencies and hashes checked; rendering and device execution not verified by this collection'}
  (target/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
  (target/'README.md').write_text('# '+ident+'\n\nGenerated from `'+manifest['authoritativeSource']+'`. Edit its prototype sources and run the prototype build, then `scripts/build.py`. No manual edits here. Source, output and dependency hashes are in manifest.json.\n')
 catalog=ROOT/'catalog/assets.json';data=json.loads(catalog.read_text())
 for a in data['assets']:
  if a['id'] in CASES:
   for s in a['sources']:
    if s['repository']=='ai-infra':s['sha256']=sha(ROOT.parent/s['path'])
 catalog.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 print('Collected Unpack case3 / Scale / RSFA patterns')
if __name__=='__main__':collect()
