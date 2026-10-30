"""Rescan pinned local snapshots with the unchanged upstream tools. No source edits."""
from pathlib import Path
import argparse,subprocess,json,hashlib
R=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--skill',type=Path,required=True,help='path to pinned ops/ascendc-sync-audit');p.add_argument('--case',default='all');a=p.parse_args()
data=json.loads((R/'evidence.json').read_text());manifest=json.loads((R/'manifest.json').read_text())
for name,expected in manifest['scanner']['files'].items():
 assert hashlib.sha256((a.skill/name).read_bytes()).hexdigest()==expected,('scanner changed',name)
for c in data['cases']:
 if a.case not in ['all',c['id']]:continue
 f=R/'sources'/c['file'];assert hashlib.sha256(f.read_bytes()).hexdigest()==c['sourceSha256']
 for tool,key in [('sync_audit','audit'),('ascendc_flow_analyzer','graph')]:
  targets=[f]+([R/'sources/sync14_common.h'] if c['id']=='good-index' else [])
  q=subprocess.run(['python3',str(a.skill/'scripts'/f'{tool}.py'),*[str(x) for x in targets],'--format','json'],capture_output=True,text=True)
  if q.returncode not in [0,1]:raise RuntimeError(q.stderr)
  # First DB construction can log a line before JSON; retain it separately.
  start=q.stdout.find('{');assert start>=0,q.stderr
  d=json.loads(q.stdout[start:].replace(str(R),'prototypes/sync-audit-trial'));c[key]=d
  (R/'raw'/f'{c["id"]}-{tool}.stdout.txt').write_text(q.stdout)
  (R/'raw'/f'{c["id"]}-{tool}.stderr.txt').write_text(q.stderr)
  (R/'raw'/f'{c["id"]}-{tool}.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 print(c['id'],len(c['audit']['findings']),len(c['graph']['findings']))
(R/'evidence.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
